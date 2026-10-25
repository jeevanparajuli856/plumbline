"""Joint inference over hypotheses and probe placement (the six-line math).

P(r | f, n) = sum_l P(l | n) N(r; V_f(l), sigma)
b'(f)      ∝ b(f) P(r | f, n)
n*         = argmax_n [H(b) - E_r H(b' | r)]
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import NamedTuple

import numpy as np

from plumbline.config import GAIN_PRUNE_WEIGHT, GAIN_TIE_TOLERANCE_BITS, EngineConfig
from plumbline.confusion import banded_confusion
from plumbline.model import FloatArray, InstrumentModel

SQRT_2PI = float(np.sqrt(2.0 * np.pi))


class NonFiniteBelief(ArithmeticError):
    """Raised instead of returning a belief that contains nan or inf."""


class Instruction(NamedTuple):
    site: int
    gains: FloatArray


@dataclass(frozen=True)
class PlacementWarning:
    """Placement warning: active exactly when P(l != told | r) > the warning threshold."""

    active: bool
    p_off_site: float
    likely_site: int


@dataclass(frozen=True)
class Resolution:
    """Outcome of the resolution rule. ``class_index`` is the top class by mass."""

    status: str
    reason: str | None
    class_index: int
    class_mass: float


def distinguishability_classes(
    expected: FloatArray, tolerance: float
) -> tuple[tuple[int, ...], ...]:
    """Union-find over hypotheses whose readings agree within ``tolerance`` at every site.

    Union-find is transitive: if a~b and b~c are each within tolerance, a, b and c share a
    class even when a and c differ by more. In the circuit no such chain exists; the closest
    distinct pair (R7_short vs R7_10x_low, about 0.045 V at row 5) stays separate.
    """
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
        with np.errstate(divide="ignore"):
            self._log_confusion = np.log(self.confusion)
        self._nodes, self._weights = np.polynomial.hermite.hermgauss(self.config.quadrature_points)

    @property
    def quadrature(self) -> tuple[FloatArray, FloatArray]:
        """Gauss-Hermite nodes and weights (physicists' form, weights sum to sqrt(pi))."""
        return self._nodes, self._weights

    def prior(self) -> FloatArray:
        return np.full(self.n_hypotheses, 1.0 / self.n_hypotheses)

    def log_kernel(self, readings: FloatArray | float) -> FloatArray:
        """log N(r; V_f(l), sigma) with shape readings.shape + (F, K)."""
        r = np.asarray(readings, dtype=np.float64)[..., None, None]
        z = (r - self.expected) / self.sigma
        return -0.5 * z * z - np.log(self.sigma * SQRT_2PI)

    def log_likelihood(self, reading: float, told: int) -> FloatArray:
        """log P(r | f, n) for every hypothesis f: the hand may have landed anywhere."""
        return _logsumexp(self.log_kernel(float(reading)) + self._log_confusion[told], axis=-1)

    def update(self, belief: FloatArray, reading: float, told: int) -> FloatArray:
        log_posterior = _safe_log(belief) + self.log_likelihood(reading, told)
        return _normalise_log(log_posterior)

    def placement(self, belief: FloatArray, reading: float, told: int) -> FloatArray:
        """P(l | r, n) ∝ P(l | n) sum_f b(f) N(r; V_f(l), sigma)."""
        log_kernel = self.log_kernel(float(reading))
        log_site = _logsumexp(log_kernel + _safe_log(belief)[:, None], axis=0)
        return _normalise_log(log_site + self._log_confusion[told])

    def placement_audit(
        self, belief: FloatArray, history: Sequence[tuple[int, float]]
    ) -> list[FloatArray]:
        """Re-ask "where was the probe?" for every past (told, reading) under ``belief``.

        An out-of-model reading says nothing about placement, so its entry is the landing
        prior P(l | n).
        """
        return [
            self.confusion[told].copy()
            if self.is_misfit(reading, told)
            else self.placement(belief, reading, told)
            for told, reading in history
        ]

    def misfit_sigmas(self, reading: float, told: int) -> float:
        """Distance, in sigmas, from ``reading`` to the nearest V_f(l) with P(l | n) > 0."""
        reachable = self.confusion[told] > 0
        return float(np.min(np.abs(reading - self.expected[:, reachable])) / self.sigma)

    def is_misfit(self, reading: float, told: int) -> bool:
        """True when no hypothesis explains the reading at any reachable site."""
        return self.misfit_sigmas(reading, told) > self.config.out_of_model_sigmas

    def warning(self, placement: FloatArray, told: int) -> PlacementWarning:
        p_off_site = float(min(max(1.0 - placement[told], 0.0), 1.0))
        return PlacementWarning(
            active=p_off_site > self.config.warning_threshold,
            p_off_site=p_off_site,
            likely_site=int(np.argmax(placement)),
        )

    def entropy_bits(self, belief: FloatArray) -> float:
        return float(_entropy_bits(belief[None, :])[0])

    def expected_gain(self, belief: FloatArray) -> FloatArray:
        """H(b) - E_r H(b' | r) per site, the expectation by Gauss-Hermite quadrature."""
        prior_entropy = self.entropy_bits(belief)
        return np.array(
            [
                prior_entropy - self._expected_posterior_entropy(belief, n)
                for n in range(self.n_sites)
            ]
        )

    def _expected_posterior_entropy(self, belief: FloatArray, told: int) -> float:
        component_weight = belief[:, None] * self.confusion[told][None, :]
        keep = component_weight > GAIN_PRUNE_WEIGHT
        means = self.expected[keep]
        weights = component_weight[keep]
        readings = means[:, None] + np.sqrt(2.0) * self.sigma * self._nodes[None, :]
        reading_weights = weights[:, None] * self._weights[None, :]
        landed = self.confusion[told] > 0
        log_kernel = self.log_kernel(readings.ravel())[..., landed]
        log_lik = _logsumexp(log_kernel + self._log_confusion[told][landed], axis=-1)
        posterior = _normalise_log(_safe_log(belief)[None, :] + log_lik)
        entropies = _entropy_bits(posterior)
        flat_weights = reading_weights.ravel()
        return float(flat_weights @ entropies / flat_weights.sum())

    def choose_instruction(self, belief: FloatArray) -> Instruction:
        gains = self.expected_gain(belief)
        best = float(gains.max())
        site = int(np.flatnonzero(gains >= best - GAIN_TIE_TOLERANCE_BITS)[0])
        return Instruction(site=site, gains=gains)

    def class_belief(self, belief: FloatArray) -> FloatArray:
        return np.array([belief[list(members)].sum() for members in self.classes])

    def resolution(self, belief: FloatArray, gains: FloatArray, n_steps: int) -> Resolution:
        """API_CONTRACT invariant 9, evaluated in order."""
        class_mass = self.class_belief(belief)
        top = int(np.argmax(class_mass))
        mass = float(class_mass[top])
        if mass >= self.config.resolve_threshold:
            if len(self.classes[top]) == 1:
                return Resolution("resolved", None, top, mass)
            return Resolution("unresolved", "indistinguishable", top, mass)
        if float(gains.max()) < self.config.min_gain_bits:
            return Resolution("unresolved", "no_informative_site", top, mass)
        if n_steps >= self.config.max_steps:
            return Resolution("unresolved", "max_steps", top, mass)
        return Resolution("continue", None, top, mass)


def _safe_log(values: FloatArray) -> FloatArray:
    with np.errstate(divide="ignore"):
        return np.log(values)


def _logsumexp(values: FloatArray, axis: int) -> FloatArray:
    peak = np.max(values, axis=axis, keepdims=True)
    peak = np.where(np.isfinite(peak), peak, 0.0)
    total = np.log(np.sum(np.exp(values - peak), axis=axis, keepdims=True)) + peak
    return np.squeeze(total, axis=axis)


def _normalise_log(log_values: FloatArray) -> FloatArray:
    """exp and normalise along the last axis; the result is finite and sums to one."""
    normalised = np.exp(log_values - _logsumexp(log_values, axis=-1)[..., None])
    if not np.isfinite(normalised).all():
        raise NonFiniteBelief("belief became non-finite after normalisation")
    return normalised


def _entropy_bits(beliefs: FloatArray) -> FloatArray:
    with np.errstate(divide="ignore", invalid="ignore"):
        terms = np.where(beliefs > 0, beliefs * np.log2(beliefs), 0.0)
    return -terms.sum(axis=-1)
