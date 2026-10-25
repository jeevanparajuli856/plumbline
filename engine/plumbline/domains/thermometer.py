"""Thermometer domain (SIMULATED): a kitchen probe in a 6 cm sphere roasting in a 120 C oven.

Transient conduction from the exact series solution for a sphere with convection
(Incropera et al., Fundamentals of Heat and Mass Transfer, ch. 5):

    theta*(r*, Fo) = sum_n C_n exp(-zeta_n^2 Fo) sin(zeta_n r*) / (zeta_n r*)
    C_n = 4 (sin zeta_n - zeta_n cos zeta_n) / (2 zeta_n - sin 2 zeta_n)
    1 - zeta_n cot zeta_n = Bi

Properties follow ASHRAE "Thermal Properties of Foods". Each hypothesis is a doneness class
defined by the center temperature; its profile is the one at the moment the center reaches it.
These are simulated readings, not measurements, and the model says so (``simulated = True``).
"""

from __future__ import annotations

from collections.abc import Sequence
from functools import cached_property

import numpy as np

from plumbline import phrases
from plumbline.model import FloatArray, Hypothesis, ReadingSpec, Site

RADIUS_M = 0.06
DIFFUSIVITY_M2_S = 1.3e-7
CONDUCTIVITY_W_MK = 0.48
CONVECTION_W_M2K = 12.0
BIOT = CONVECTION_W_M2K * RADIUS_M / CONDUCTIVITY_W_MK
OVEN_C = 120.0
INITIAL_C = 5.0
SIGMA_C = 0.5
CLASS_TOLERANCE_C = 1e-3
N_ROOTS = 30
ROOT_BISECTION_ITERATIONS = 60
TIME_BISECTION_ITERATIONS = 80
TIME_SEARCH_MAX_S = 200_000.0
DEPTHS_CM = (0.5, 1.5, 2.5, 3.5, 4.5, 5.5)
CM_PER_M = 100.0
READING_MIN_C = -20.0
READING_MAX_C = 150.0
READING_DECIMALS = 2

DONENESS: tuple[tuple[str, str, float, str], ...] = (
    ("cold_center", "Cold center", 40.0, "Center at 40 C; not yet cooked through."),
    ("rare", "Rare", 50.0, "Center at 50 C."),
    ("medium_rare", "Medium rare", 55.0, "Center at 55 C."),
    (
        "medium",
        "Medium",
        60.0,
        "Center at 60 C. USDA guidance for whole cuts is 62.8 C (145 F) with a rest.",
    ),
    ("medium_well", "Medium well", 65.0, "Center at 65 C."),
    ("well_done", "Well done", 70.0, "Center at 70 C."),
    ("overdone", "Overdone", 75.0, "Center at 75 C; drying out."),
)


def eigenvalues(biot: float, n_roots: int = N_ROOTS) -> FloatArray:
    """Roots of 1 - zeta cot zeta = Bi, one in each interval (n pi, (n + 1) pi), by bisection."""
    roots = np.empty(n_roots)
    for n in range(n_roots):
        lo, hi = n * np.pi, (n + 1) * np.pi
        for _ in range(ROOT_BISECTION_ITERATIONS):
            mid = 0.5 * (lo + hi)
            if 1.0 - mid / np.tan(mid) - biot < 0.0:
                lo = mid
            else:
                hi = mid
        roots[n] = 0.5 * (lo + hi)
    return roots


ZETA = eigenvalues(BIOT)
COEFFICIENTS = 4.0 * (np.sin(ZETA) - ZETA * np.cos(ZETA)) / (2.0 * ZETA - np.sin(2.0 * ZETA))


def temperature(radius_fraction: FloatArray | float, seconds: float) -> FloatArray:
    """Temperature (C) at r* = r / R after ``seconds`` in the oven."""
    fourier = DIFFUSIVITY_M2_S * seconds / RADIUS_M**2
    r_star = np.atleast_1d(np.asarray(radius_fraction, dtype=np.float64))
    x = ZETA[None, :] * r_star[:, None]
    shape = np.where(x > 0, np.sin(x) / np.where(x > 0, x, 1.0), 1.0)
    theta = (COEFFICIENTS * np.exp(-(ZETA**2) * fourier) * shape).sum(axis=1)
    return OVEN_C + (INITIAL_C - OVEN_C) * theta


def center_temperature(seconds: float) -> float:
    return float(temperature(0.0, seconds)[0])


def time_to_center(target_c: float) -> float:
    """Seconds until the center reaches ``target_c`` (monotone, so bisection)."""
    lo, hi = 0.0, TIME_SEARCH_MAX_S
    for _ in range(TIME_BISECTION_ITERATIONS):
        mid = 0.5 * (lo + hi)
        if center_temperature(mid) < target_c:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


class ThermometerModel:
    """Probe depth is the site; doneness class is the hypothesis. SIMULATED."""

    domain = "thermometer"
    display_name = "Kitchen probe thermometer (simulated roast)"
    simulated = True
    default_sigma = SIGMA_C
    default_class_tolerance = CLASS_TOLERANCE_C
    reading = ReadingSpec("C", READING_MIN_C, READING_MAX_C, READING_DECIMALS)

    def __init__(self) -> None:
        self.hypotheses: tuple[Hypothesis, ...] = tuple(
            Hypothesis(hid, label, label, description) for hid, label, _, description in DONENESS
        )
        self.hypothesis_ids: tuple[str, ...] = tuple(h.id for h in self.hypotheses)
        self.sites: tuple[Site, ...] = tuple(
            Site(i, f"{depth:g} cm", f"{depth:g} centimetres") for i, depth in enumerate(DEPTHS_CM)
        )
        self._index = {hid: i for i, hid in enumerate(self.hypothesis_ids)}

    @cached_property
    def _expected(self) -> FloatArray:
        radius_fraction = 1.0 - np.array(DEPTHS_CM) / (RADIUS_M * CM_PER_M)
        rows = [
            temperature(radius_fraction, time_to_center(center)) for _, _, center, _ in DONENESS
        ]
        expected = np.array(rows)
        expected.setflags(write=False)
        return expected

    def expected_readings(self) -> FloatArray:
        return self._expected

    def expected_reading(self, hypothesis: int, site: int) -> float:
        return float(self._expected[hypothesis, site])

    def hypothesis_index(self, hypothesis_id: str) -> int:
        return self._index[hypothesis_id]

    def instruction_phrase(self, site: int) -> str:
        return phrases.instruction(self.sites[site].label, "Insert the probe to")

    def warning_phrase(self, told_site: int, likely_site: int) -> str:
        return phrases.warning(self.sites[told_site].label, self.sites[likely_site].label)

    def diagnosis_phrase(self, hypothesis: int, confidence: float) -> str:
        return phrases.diagnosis(self.hypotheses[hypothesis].label, confidence)

    def unresolved_phrase(self, class_ids: Sequence[str], reason: str) -> str:
        labels = [self.hypotheses[self._index[i]].label for i in class_ids]
        return phrases.unresolved(labels, reason, "temperature")

    def misfit_phrase(self, told_site: int) -> str:
        return (
            "That reading does not match this roast at any nearby depth. Check that the probe "
            f"is fully inserted, then measure at {self.sites[told_site].label} again."
        )
