"""Trial runner shared by the experiment scripts: one simulated hand, one method, one truth.

Every method sees the same truth and starts from the same hand stream for a given
(seed, trial); methods that choose differently then see different readings, as they would.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

import numpy as np

from plumbline.baselines import (
    BaselineState,
    Checklist,
    EntropyExact,
    RandomOrder,
    RemeasureUntilAgree,
)
from plumbline.engine import Engine, PlacementWarning, Resolution
from plumbline.model import FloatArray

ARM_NAMES = ("plumbline", "entropy_exact", "checklist", "random", "remeasure_until_agree")
CONFIDENTLY_WRONG_THRESHOLD = 0.9
POOR_CONTACT_READING = 0.0
CHOICE_STREAM = 1


@dataclass(frozen=True)
class HandModel:
    """How the simulated hand lands. ``bridge_p``: the probe touches the told site and a
    neighbour and reads their midpoint (a stated simplification). ``contact_fail_p``: the
    probe sits on the told site but makes no contact and the meter reads 0."""

    confusion: FloatArray
    bridge_p: float = 0.0
    contact_fail_p: float = 0.0

    def touch(
        self, rng: np.random.Generator, true_row: FloatArray, told: int, sigma: float
    ) -> tuple[int, float]:
        n_sites = len(true_row)
        if self.contact_fail_p and rng.random() < self.contact_fail_p:
            return told, POOR_CONTACT_READING + sigma * rng.standard_normal()
        if self.bridge_p and rng.random() < self.bridge_p:
            neighbours = [s for s in (told - 1, told + 1) if 0 <= s < n_sites]
            other = int(neighbours[rng.integers(len(neighbours))])
            midpoint = 0.5 * (true_row[told] + true_row[other])
            return told, float(midpoint + sigma * rng.standard_normal())
        landed = int(rng.choice(n_sites, p=self.confusion[told]))
        return landed, float(true_row[landed] + sigma * rng.standard_normal())


class Policy(Protocol):
    name: str
    engine: Engine

    def start(self) -> BaselineState: ...

    def observe(self, state: BaselineState, told: int, reading: float) -> BaselineState: ...

    def decide(self, state: BaselineState, rng: np.random.Generator) -> tuple[Resolution, int]: ...

    def warning(
        self, state: BaselineState, told: int, reading: float
    ) -> PlacementWarning | None: ...

    def is_misfit(self, told: int, reading: float) -> bool: ...


class PlumblinePolicy:
    """Joint inference: confusion-aware likelihood, gain-maximising site, placement warning.
    An out-of-model reading leaves the belief alone and asks for the same site again."""

    name = "plumbline"

    def __init__(self, engine: Engine) -> None:
        self.engine = engine
        self._prior = engine.prior()
        self._prior_choice = engine.choose_instruction(self._prior)

    def start(self) -> BaselineState:
        return BaselineState(belief=self._prior)

    def observe(self, state: BaselineState, told: int, reading: float) -> BaselineState:
        n_readings = state.n_readings + 1
        if self.is_misfit(told, reading):
            return BaselineState(state.belief, n_readings, last_site=told, remeasure=True)
        belief = self.engine.update(state.belief, reading, told)
        return BaselineState(belief=belief, n_readings=n_readings, last_site=told)

    def decide(self, state: BaselineState, rng: np.random.Generator) -> tuple[Resolution, int]:
        is_prior = state.belief is self._prior
        choice = self._prior_choice if is_prior else self.engine.choose_instruction(state.belief)
        resolution = self.engine.resolution(state.belief, choice.gains, state.n_readings)
        site = state.last_site if state.remeasure and state.last_site is not None else choice.site
        return resolution, site

    def warning(self, state: BaselineState, told: int, reading: float) -> PlacementWarning | None:
        if self.is_misfit(told, reading):
            return None
        return self.engine.warning(self.engine.placement(state.belief, reading, told), told)

    def is_misfit(self, told: int, reading: float) -> bool:
        return self.engine.is_misfit(reading, told)


class BaselinePolicy:
    """Wraps a baseline; resolution uses the same rule on its exact-position engine."""

    def __init__(self, baseline: EntropyExact) -> None:
        self.baseline = baseline
        self.engine = baseline.engine
        self.name = baseline.method
        self._prior_choice = self.engine.choose_instruction(self.engine.prior())

    def start(self) -> BaselineState:
        return self.baseline.start()

    def observe(self, state: BaselineState, told: int, reading: float) -> BaselineState:
        return self.baseline.observe(state, told, reading)

    def decide(self, state: BaselineState, rng: np.random.Generator) -> tuple[Resolution, int]:
        is_prior = state.n_readings == 0 and state.pending is None
        choice = self._prior_choice if is_prior else self.engine.choose_instruction(state.belief)
        resolution = self.engine.resolution(state.belief, choice.gains, state.n_readings)
        is_plain_entropy = type(self.baseline) is EntropyExact
        site = choice.site if is_plain_entropy else self.baseline.choose(state, rng)
        return resolution, site

    def warning(self, state: BaselineState, told: int, reading: float) -> PlacementWarning | None:
        return None

    def is_misfit(self, told: int, reading: float) -> bool:
        return False


def make_policy(name: str, engine: Engine, baseline_engine_source: Engine | None = None) -> Policy:
    """``engine`` drives plumbline; baselines use the same model, sigma and thresholds."""
    source = baseline_engine_source or engine
    baselines = {
        "entropy_exact": EntropyExact,
        "checklist": Checklist,
        "random": RandomOrder,
        "remeasure_until_agree": RemeasureUntilAgree,
    }
    if name == "plumbline":
        return PlumblinePolicy(engine)
    return BaselinePolicy(baselines[name](source.model, source.config))


@dataclass(frozen=True)
class TrialResult:
    """``correct``: the run ended resolved on the true class, or refused (indistinguishable)
    with the truth inside the refused class. ``max_steps`` and ``no_informative_site``
    endings are never correct. ``resolved_correct``: resolved on the true class only."""

    correct: bool
    resolved_correct: bool
    confidently_wrong: bool
    status: str
    reason: str | None
    steps: int
    warnings_issued: int
    warnings_correct: int
    slips: int
    slips_warned: int
    misfit_readings: int


def run_trial(
    policy: Policy, hand: HandModel, engine: Engine, truth: int, seed: Sequence[int]
) -> TrialResult:
    """Run one diagnosis to its terminal status. ``engine`` supplies truth readings and sigma."""
    hand_rng = np.random.default_rng(list(seed))
    choice_rng = np.random.default_rng([*seed, CHOICE_STREAM])
    true_row = engine.expected[truth]
    decimals = engine.model.reading.decimals
    state = policy.start()
    resolution, site = policy.decide(state, choice_rng)
    issued = correct_warnings = slips = slips_warned = misfits = 0
    while resolution.status == "continue":
        landed, raw = hand.touch(hand_rng, true_row, site, engine.sigma)
        reading = round(raw, decimals)
        warning = policy.warning(state, site, reading)
        is_slip = landed != site
        is_warned = warning is not None and warning.active
        slips += is_slip
        issued += is_warned
        if is_warned:
            correct_warnings += is_slip
        if is_slip:
            slips_warned += is_warned
        misfits += policy.is_misfit(site, reading)
        state = policy.observe(state, site, reading)
        resolution, site = policy.decide(state, choice_rng)
    top_class = policy.engine.classes[resolution.class_index]
    is_truth_on_top = truth in top_class
    is_resolved = resolution.status == "resolved"
    is_refused = resolution.reason == "indistinguishable"
    return TrialResult(
        correct=is_truth_on_top and (is_resolved or is_refused),
        resolved_correct=is_truth_on_top and is_resolved,
        confidently_wrong=(not is_truth_on_top)
        and resolution.class_mass >= CONFIDENTLY_WRONG_THRESHOLD,
        status=resolution.status,
        reason=resolution.reason,
        steps=state.n_readings,
        warnings_issued=issued,
        warnings_correct=correct_warnings,
        slips=slips,
        slips_warned=slips_warned,
        misfit_readings=misfits,
    )


def draw_truths(n_hypotheses: int, n: int, seed: int) -> list[int]:
    return np.random.default_rng(seed).integers(n_hypotheses, size=n).tolist()


def ratio(numerator: int, denominator: int) -> float | None:
    return numerator / denominator if denominator else None


def summarize(results: Sequence[TrialResult]) -> dict[str, float | int | dict[str, int] | None]:
    n = len(results)
    reasons: dict[str, int] = {}
    for r in results:
        if r.status == "unresolved" and r.reason:
            reasons[r.reason] = reasons.get(r.reason, 0) + 1
    issued = sum(r.warnings_issued for r in results)
    correct_warnings = sum(r.warnings_correct for r in results)
    slips = sum(r.slips for r in results)
    return {
        "n": n,
        "correct": sum(r.correct for r in results),
        "correct_pct": 100.0 * sum(r.correct for r in results) / n,
        "resolved_correct": sum(r.resolved_correct for r in results),
        "resolved_correct_pct": 100.0 * sum(r.resolved_correct for r in results) / n,
        "confidently_wrong": sum(r.confidently_wrong for r in results),
        "confidently_wrong_pct": 100.0 * sum(r.confidently_wrong for r in results) / n,
        "unresolved": sum(r.status == "unresolved" for r in results),
        "unresolved_pct": 100.0 * sum(r.status == "unresolved" for r in results) / n,
        "unresolved_reasons": reasons,
        "mean_steps": float(np.mean([r.steps for r in results])),
        "warnings_issued": issued,
        "warnings_correct": correct_warnings,
        "slips": slips,
        "slips_warned": sum(r.slips_warned for r in results),
        "warning_precision": ratio(correct_warnings, issued),
        "slip_recall": ratio(sum(r.slips_warned for r in results), slips),
        "misfit_readings": sum(r.misfit_readings for r in results),
        "trials_with_misfit": sum(r.misfit_readings > 0 for r in results),
    }


def run_arms(
    arms: Sequence[str],
    engine: Engine,
    hand: HandModel,
    truths: Sequence[int],
    seed: int,
    truth_engine: Engine | None = None,
) -> dict[str, dict[str, float | int | dict[str, int] | None]]:
    """Every arm on the same truths and hand seeds. ``truth_engine`` (default ``engine``)
    generates readings; ``engine`` is what plumbline and the baselines believe."""
    physics = truth_engine or engine
    output: dict[str, dict[str, float | int | dict[str, int] | None]] = {}
    for arm in arms:
        policy = make_policy(arm, engine)
        results = [
            run_trial(policy, hand, physics, truth, (seed, trial))
            for trial, truth in enumerate(truths)
        ]
        output[arm] = summarize(results)
    return output
