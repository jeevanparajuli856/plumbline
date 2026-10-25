"""Named constants and configuration for the Plumbline engine.

Every assumed quantity lives here so it can be replaced by a measured one through
``EngineConfig`` without touching the math. The three confusion probabilities are the
only assumptions in the model; they are replaced by the matrix measured at the
Louisiana Center for the Blind when it exists.
"""

from __future__ import annotations

from dataclasses import dataclass, field

SIGMA_VOLTS = 0.02
CONFUSION_P_SAME = 0.78
CONFUSION_P_PM1 = 0.08
CONFUSION_P_PM2 = 0.03
PLACEMENT_WARNING_THRESHOLD = 0.5
RESOLVE_THRESHOLD = 0.95
MIN_USEFUL_GAIN_BITS = 1e-3
CLASS_TOLERANCE_VOLTS = 1e-3
MAX_STEPS = 12
GH_QUADRATURE_POINTS = 20
GAIN_TIE_TOLERANCE_BITS = 1e-12
GAIN_PRUNE_WEIGHT = 1e-12
REPLAY_READING_TOLERANCE = 1e-3
UNRESOLVED_MAX_CLASSES = 5


@dataclass(frozen=True)
class ConfusionSpec:
    """Banded confusion model P(landed | told), clipped and renormalized at the edges.

    ``matrix`` overrides the banded parameters with a measured (K, K) row-stochastic matrix.
    ``asymmetry`` shifts off-site mass toward lower sites when positive (lopsided slips).
    """

    p_same: float = CONFUSION_P_SAME
    p_pm1: float = CONFUSION_P_PM1
    p_pm2: float = CONFUSION_P_PM2
    p_pm3: float = 0.0
    asymmetry: float = 0.0
    matrix: tuple[tuple[float, ...], ...] | None = None


@dataclass(frozen=True)
class EngineConfig:
    """Engine thresholds. ``None`` fields fall back to the instrument model's defaults."""

    sigma: float | None = None
    confusion: ConfusionSpec = field(default_factory=ConfusionSpec)
    warning_threshold: float = PLACEMENT_WARNING_THRESHOLD
    resolve_threshold: float = RESOLVE_THRESHOLD
    min_gain_bits: float = MIN_USEFUL_GAIN_BITS
    class_tolerance: float | None = None
    quadrature_points: int = GH_QUADRATURE_POINTS
    max_steps: int = MAX_STEPS
