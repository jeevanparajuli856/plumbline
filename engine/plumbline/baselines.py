"""Comparison methods (ADR-0010). All of them assume the probe lands exactly where told.

``EntropyExact`` is our implementation of the published method (entropy-based probe
selection with an exact probe position). In a session it runs in shadow on the same
readings; in experiments every method chooses its own sites.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Protocol

import numpy as np

from plumbline.config import ConfusionSpec, EngineConfig
from plumbline.engine import Engine, Resolution
from plumbline.model import FloatArray, InstrumentModel

REMEASURE_AGREE_SIGMAS = 2.0


@dataclass(frozen=True)
class BaselineState:
    belief: FloatArray
    n_readings: int = 0
    last_site: int | None = None
    pending: float | None = None


class Baseline(Protocol):
    method: str
    engine: Engine

    def start(self) -> BaselineState: ...

    def observe(self, state: BaselineState, told: int, reading: float) -> BaselineState: ...

    def choose(self, state: BaselineState, rng: np.random.Generator) -> int: ...

    def resolution(self, state: BaselineState) -> Resolution: ...


def exact_position_engine(model: InstrumentModel, config: EngineConfig | None = None) -> Engine:
    """The same engine with an identity confusion matrix: P(l = n) = 1."""
    n_sites = len(model.sites)
    identity = tuple(tuple(1.0 if i == j else 0.0 for j in range(n_sites)) for i in range(n_sites))
    base = config or EngineConfig()
    return Engine(model, replace(base, confusion=ConfusionSpec(matrix=identity)))


class EntropyExact:
    """Published method: maximise expected information gain, trust the told site."""

    method = "entropy_exact"

    def __init__(self, model: InstrumentModel, config: EngineConfig | None = None) -> None:
        self.engine = exact_position_engine(model, config)

    def start(self) -> BaselineState:
        return BaselineState(belief=self.engine.prior())

    def observe(self, state: BaselineState, told: int, reading: float) -> BaselineState:
        belief = self.engine.update(state.belief, reading, told)
        return BaselineState(belief=belief, n_readings=state.n_readings + 1, last_site=told)

    def choose(self, state: BaselineState, rng: np.random.Generator) -> int:
        return self.engine.choose_instruction(state.belief).site

    def resolution(self, state: BaselineState) -> Resolution:
        gains = self.engine.expected_gain(state.belief)
        return self.engine.resolution(state.belief, gains, state.n_readings)


class Checklist(EntropyExact):
    """A fixed troubleshooting order: site 1, 2, ..., K, then around again."""

    method = "checklist"

    def choose(self, state: BaselineState, rng: np.random.Generator) -> int:
        return state.n_readings % self.engine.n_sites


class RandomOrder(EntropyExact):
    """A site drawn uniformly from the injected generator at every step."""

    method = "random"

    def choose(self, state: BaselineState, rng: np.random.Generator) -> int:
        return int(rng.integers(self.engine.n_sites))


class RemeasureUntilAgree(EntropyExact):
    """Measure the chosen site again until two consecutive readings agree within
    ``REMEASURE_AGREE_SIGMAS`` sigma, then update once with their mean."""

    method = "remeasure_until_agree"

    def observe(self, state: BaselineState, told: int, reading: float) -> BaselineState:
        n_readings = state.n_readings + 1
        tolerance = REMEASURE_AGREE_SIGMAS * self.engine.sigma
        if (
            state.pending is None
            or state.last_site != told
            or abs(reading - state.pending) > tolerance
        ):
            return replace(state, n_readings=n_readings, last_site=told, pending=reading)
        agreed = 0.5 * (reading + state.pending)
        belief = self.engine.update(state.belief, agreed, told)
        return BaselineState(belief=belief, n_readings=n_readings, last_site=told, pending=None)

    def choose(self, state: BaselineState, rng: np.random.Generator) -> int:
        if state.pending is not None and state.last_site is not None:
            return state.last_site
        return super().choose(state, rng)
