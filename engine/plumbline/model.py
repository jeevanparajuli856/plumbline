"""Domain-agnostic description of an instrument: hypotheses, sites, and predicted readings.

The engine knows nothing about circuits or thermometers. A domain implements
``InstrumentModel`` and the engine works on the (F, K) matrix of expected readings.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol, runtime_checkable

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float64]


@dataclass(frozen=True)
class Hypothesis:
    """One candidate state of the instrumented system (a fault, a doneness class)."""

    id: str
    label: str
    spoken: str
    description: str


@dataclass(frozen=True)
class Site:
    """A place the user can be told to measure. ``index`` is 0-based; ``label`` is UI text."""

    index: int
    label: str
    spoken: str


@dataclass(frozen=True)
class ReadingSpec:
    """Unit and plausible range of one reading, used to reject impossible inputs."""

    unit: str
    min: float
    max: float
    decimals: int


@runtime_checkable
class InstrumentModel(Protocol):
    """What a domain plug-in provides to the engine (ADR-0003)."""

    @property
    def domain(self) -> str: ...

    @property
    def display_name(self) -> str: ...

    @property
    def simulated(self) -> bool: ...

    @property
    def hypotheses(self) -> tuple[Hypothesis, ...]: ...

    @property
    def sites(self) -> tuple[Site, ...]: ...

    @property
    def reading(self) -> ReadingSpec: ...

    @property
    def default_sigma(self) -> float: ...

    @property
    def default_class_tolerance(self) -> float: ...

    @property
    def hypothesis_ids(self) -> tuple[str, ...]: ...

    def expected_readings(self) -> FloatArray:
        """(F, K) predicted noise-free readings, hypothesis by site. Callers must not mutate."""
        ...

    def expected_reading(self, hypothesis: int, site: int) -> float: ...

    def hypothesis_index(self, hypothesis_id: str) -> int: ...

    def instruction_phrase(self, site: int) -> str: ...

    def warning_phrase(self, told_site: int, likely_site: int) -> str: ...

    def diagnosis_phrase(self, hypothesis: int, confidence: float) -> str: ...

    def unresolved_phrase(self, class_ids: Sequence[str], reason: str) -> str: ...
