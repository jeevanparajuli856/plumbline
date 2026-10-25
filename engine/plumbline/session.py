"""A diagnostic session: simulate (seeded hand), live (user readings) or replay (fixture).

The session owns the only mutable state in the engine: the list of frozen step records.
Every number in a step is computed by ``Engine``; replay recomputes from recorded readings.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Literal

import numpy as np

from plumbline import views
from plumbline.baselines import Baseline, BaselineState, EntropyExact
from plumbline.config import REPLAY_READING_TOLERANCE, UNRESOLVED_MAX_CLASSES
from plumbline.engine import Engine, Instruction, PlacementWarning, Resolution
from plumbline.errors import SessionError
from plumbline.model import FloatArray

Mode = Literal["simulate", "live", "replay"]
Reveal = Literal["after_step", "never"]
TRUTH_STREAM = 0
HAND_STREAM = 1


class ReadingRequired(SessionError):
    code = "reading_required"


class ReadingNotAllowed(SessionError):
    code = "reading_not_allowed"


class ReadingOutOfRange(SessionError):
    code = "reading_out_of_range"


class SessionTerminal(SessionError):
    code = "session_terminal"


class FixtureMismatch(SessionError):
    code = "fixture_mismatch"


@dataclass(frozen=True)
class ReplayStep:
    told_site: int
    landed_site: int | None
    reading: float
    next_told_site: int | None


@dataclass(frozen=True)
class ReplayScript:
    """The parts of a fixture a replay needs: the truth and the recorded hand."""

    true_hypothesis: str
    steps: tuple[ReplayStep, ...]

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any]) -> ReplayScript:
        steps = tuple(
            ReplayStep(
                told_site=int(step["told_site"]),
                landed_site=None if step.get("landed_site") is None else int(step["landed_site"]),
                reading=float(step["reading"]),
                next_told_site=None
                if step.get("next_told_site") is None
                else int(step["next_told_site"]),
            )
            for step in data["steps"]
        )
        return cls(true_hypothesis=str(data["true_hypothesis"]), steps=steps)


@dataclass(frozen=True)
class Misfit:
    """The reading matched no hypothesis within ``out_of_model_sigmas``; belief was kept."""

    active: bool
    sigmas: float


@dataclass(frozen=True)
class StepRecord:
    index: int
    told_site: int
    told_gains: FloatArray
    landed_site: int | None
    reading: float
    belief: FloatArray
    entropy_bits: float
    placement: FloatArray
    warning: PlacementWarning
    placement_audit: tuple[FloatArray, ...]
    resolution: Resolution
    engine_choice: Instruction
    next_told_site: int | None
    baseline: BaselineState
    misfit: Misfit


class Session:
    def __init__(
        self,
        engine: Engine,
        mode: Mode,
        seed: int,
        true_hypothesis: str | None = None,
        fixture: ReplayScript | None = None,
        reveal: Reveal = "after_step",
        truth_confusion: FloatArray | None = None,
        baseline: Baseline | None = None,
    ) -> None:
        if mode == "replay" and fixture is None:
            raise ValueError("replay needs a fixture")
        self.engine = engine
        self.model = engine.model
        self.mode: Mode = mode
        self.seed = seed
        self.reveal: Reveal = reveal
        self.fixture = fixture
        self.truth_confusion = engine.confusion if truth_confusion is None else truth_confusion
        self.baseline: Baseline = baseline or EntropyExact(self.model, engine.config)
        self.true_index = self._resolve_truth(true_hypothesis)
        self.prior_choice = engine.choose_instruction(engine.prior())
        self.reset()

    def _resolve_truth(self, true_hypothesis: str | None) -> int | None:
        if self.mode == "live":
            return None
        if self.mode == "replay":
            assert self.fixture is not None
            return self.model.hypothesis_index(self.fixture.true_hypothesis)
        if true_hypothesis is not None:
            return self.model.hypothesis_index(true_hypothesis)
        truth_rng = np.random.default_rng([self.seed, TRUTH_STREAM])
        return int(truth_rng.choice(self.engine.n_hypotheses, p=self.engine.prior()))

    def reset(self) -> None:
        """Back to step 0 with the same truth, config and hand seed."""
        self._hand = np.random.default_rng([self.seed, HAND_STREAM])
        self._records: list[StepRecord] = []
        self._belief = self.engine.prior()
        self._baseline_state = self.baseline.start()
        self._status = "continue"
        first_site = self.prior_choice.site
        if self.mode == "replay" and self.fixture is not None and self.fixture.steps:
            first_site = self.fixture.steps[0].told_site
        self._instruction: int | None = first_site
        self._instruction_gains = self.prior_choice.gains

    @property
    def steps(self) -> tuple[StepRecord, ...]:
        return tuple(self._records)

    @property
    def status(self) -> str:
        return self._status

    @property
    def belief(self) -> FloatArray:
        return self._belief

    @property
    def instruction(self) -> int | None:
        return self._instruction

    @property
    def instruction_gains(self) -> FloatArray:
        return self._instruction_gains

    def step(self, reading: float | None) -> StepRecord:
        if self._status != "continue":
            raise SessionTerminal("This session has already ended.", status=self._status)
        told = self._instruction
        if told is None:
            raise FixtureMismatch("The fixture has no further step.", step_index=len(self._records))
        landed, value, scripted_next = self._observe(told, reading)
        return self._advance(told, landed, value, scripted_next)

    def _observe(self, told: int, reading: float | None) -> tuple[int | None, float, int | None]:
        if self.mode == "simulate":
            if reading is not None:
                raise ReadingNotAllowed(
                    "Simulate mode computes the reading itself.", field="reading"
                )
            return self._simulate_hand(told)
        if self.mode == "live":
            if reading is None:
                raise ReadingRequired(
                    "Live mode needs the reading from the meter.", field="reading"
                )
            self._check_range(reading)
            return None, float(reading), None
        return self._replay_hand(told, reading)

    def _simulate_hand(self, told: int) -> tuple[int, float, None]:
        assert self.true_index is not None
        landed = int(self._hand.choice(self.engine.n_sites, p=self.truth_confusion[told]))
        noise = self.engine.sigma * self._hand.standard_normal()
        value = self.model.expected_reading(self.true_index, landed) + noise
        return landed, round(float(value), self.model.reading.decimals), None

    def _replay_hand(
        self, told: int, reading: float | None
    ) -> tuple[int | None, float, int | None]:
        assert self.fixture is not None
        index = len(self._records)
        if index >= len(self.fixture.steps):
            raise FixtureMismatch("Replay has no recorded step here.", step_index=index)
        recorded = self.fixture.steps[index]
        if recorded.told_site != told:
            raise FixtureMismatch(
                "The told site does not match the fixture.", step_index=index, told_site=told
            )
        if reading is not None:
            self._check_range(reading)
            if abs(reading - recorded.reading) > REPLAY_READING_TOLERANCE:
                raise FixtureMismatch(
                    "The reading does not match the fixture.", field="reading", step_index=index
                )
        return recorded.landed_site, recorded.reading, recorded.next_told_site

    def _check_range(self, reading: float) -> None:
        spec = self.model.reading
        if not (spec.min <= reading <= spec.max):
            raise ReadingOutOfRange(
                f"Readings must be between {spec.min:g} and {spec.max:g} {spec.unit}.",
                field="reading",
            )

    def _advance(
        self, told: int, landed: int | None, reading: float, scripted_next: int | None
    ) -> StepRecord:
        engine = self.engine
        misfit = Misfit(
            active=engine.is_misfit(reading, told), sigmas=engine.misfit_sigmas(reading, told)
        )
        if misfit.active:
            placement = engine.confusion[told].copy()
            belief = self._belief
            warning = PlacementWarning(False, float(1.0 - placement[told]), told)
            choice = Instruction(site=told, gains=self._instruction_gains)
        else:
            placement = engine.placement(self._belief, reading, told)
            belief = engine.update(self._belief, reading, told)
            warning = engine.warning(placement, told)
            choice = engine.choose_instruction(belief)
        history = [(r.told_site, r.reading) for r in self._records] + [(told, reading)]
        resolution = engine.resolution(belief, choice.gains, len(history))
        is_continue = resolution.status == "continue"
        next_site = (
            (scripted_next if self.mode == "replay" else choice.site) if is_continue else None
        )
        self._baseline_state = self.baseline.observe(self._baseline_state, told, reading)
        record = StepRecord(
            index=len(self._records),
            told_site=told,
            told_gains=self._instruction_gains,
            landed_site=landed,
            reading=reading,
            belief=belief,
            entropy_bits=engine.entropy_bits(belief),
            placement=placement,
            warning=warning,
            placement_audit=tuple(engine.placement_audit(belief, history)),
            resolution=resolution,
            engine_choice=choice,
            next_told_site=next_site,
            baseline=self._baseline_state,
            misfit=misfit,
        )
        self._records.append(record)
        self._belief = belief
        self._status = resolution.status
        self._instruction = next_site
        self._instruction_gains = choice.gains
        return record

    def diagnosis(self, record: StepRecord) -> tuple[str, float] | None:
        """(hypothesis id, confidence) when the step resolved, else ``None``."""
        if record.resolution.status != "resolved":
            return None
        member = self.engine.classes[record.resolution.class_index][0]
        return self.model.hypothesis_ids[member], float(record.belief[member])

    def unresolved_classes(self, record: StepRecord) -> list[list[str]]:
        """The indistinguishable class, or the top classes covering the resolve threshold."""
        ids = self.model.hypothesis_ids
        classes = self.engine.classes
        if record.resolution.reason == "indistinguishable":
            return [[ids[i] for i in classes[record.resolution.class_index]]]
        mass = self.engine.class_belief(record.belief)
        chosen: list[list[str]] = []
        covered = 0.0
        for class_index in np.argsort(-mass, kind="stable")[:UNRESOLVED_MAX_CLASSES]:
            chosen.append([ids[i] for i in classes[int(class_index)]])
            covered += float(mass[class_index])
            if covered >= self.engine.config.resolve_threshold:
                break
        return chosen

    def truth_visible(self, include_truth: bool) -> bool:
        """Invariants 6 and 7: never in live, never with reveal = never, and never before
        the first step has been taken (the truth is revealed after a step, not at creation)."""
        has_stepped = bool(self._records)
        return include_truth and has_stepped and self.mode != "live" and self.reveal == "after_step"

    def step_view(self, record: StepRecord, include_truth: bool) -> dict[str, Any]:
        return views.step_view(self, record, self.truth_visible(include_truth))

    def view(self, include_truth: bool) -> dict[str, Any]:
        return views.session_view(self, self.truth_visible(include_truth))
