"""Joint inference over hypotheses and probe placement (the six-line math).

P(r | f, n) = sum_l P(l | n) N(r; V_f(l), sigma)
b'(f)      ∝ b(f) P(r | f, n)
n*         = argmax_n [H(b) - E_r H(b' | r)]
"""

from __future__ import annotations

import numpy as np

from plumbline.config import EngineConfig
from plumbline.confusion import banded_confusion
from plumbline.model import FloatArray, InstrumentModel


def distinguishability_classes(
    expected: FloatArray, tolerance: float
) -> tuple[tuple[int, ...], ...]:
    """Union-find over hypotheses whose readings agree within ``tolerance`` at every site."""
    n_hypotheses = expected.shape[0]
    parent = list(range(n_hypotheses))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(n_hypotheses):
        for j in range(i + 1, n_hypotheses):
            if np.max(np.abs(expected[i] - expected[j])) < tolerance:
                parent[find(j)] = find(i)
    groups: dict[int, list[int]] = {}
    for i in range(n_hypotheses):
        groups.setdefault(find(i), []).append(i)
    return tuple(tuple(members) for members in sorted(groups.values(), key=lambda m: m[0]))


class Engine:
    """Stateless inference over one instrument model. Beliefs are passed in and returned."""

    def __init__(self, model: InstrumentModel, config: EngineConfig | None = None) -> None:
        self.model = model
        self.config = config or EngineConfig()
        self.sigma = self.config.sigma if self.config.sigma is not None else model.default_sigma
        self.class_tolerance = (
            self.config.class_tolerance
            if self.config.class_tolerance is not None
            else model.default_class_tolerance
        )
        self.expected = model.expected_readings()
        self.n_hypotheses, self.n_sites = self.expected.shape
        self.confusion = banded_confusion(self.config.confusion, self.n_sites)
        self.classes = distinguishability_classes(self.expected, self.class_tolerance)
