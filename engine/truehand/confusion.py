"""Confusion model P(landed site l | told site n) as a (K, K) row-stochastic matrix."""

from __future__ import annotations

import numpy as np

from truehand.config import ConfusionSpec
from truehand.model import FloatArray

ROW_SUM_TOLERANCE = 1e-9


def banded_confusion(spec: ConfusionSpec, n_sites: int) -> FloatArray:
    """Row ``n`` is the landing distribution when told site ``n``.

    Mass that would fall off the board is dropped and the row renormalised, so row 1 of
    the default band becomes 0.876 / 0.090 / 0.034. A measured ``spec.matrix`` wins.
    """
    if spec.matrix is not None:
        matrix = np.array(spec.matrix, dtype=np.float64)
        validate_confusion(matrix, n_sites)
        return matrix
    band = {0: spec.p_same, 1: spec.p_pm1, 2: spec.p_pm2, 3: spec.p_pm3}
    matrix = np.zeros((n_sites, n_sites), dtype=np.float64)
    for told in range(n_sites):
        for offset, mass in band.items():
            if offset == 0:
                matrix[told, told] = mass
                continue
            for landed, skew in (
                (told - offset, 1.0 + spec.asymmetry),
                (told + offset, 1.0 - spec.asymmetry),
            ):
                if 0 <= landed < n_sites:
                    matrix[told, landed] += mass * skew
        matrix[told] /= matrix[told].sum()
    validate_confusion(matrix, n_sites)
    return matrix


def validate_confusion(matrix: FloatArray, n_sites: int) -> None:
    """Raise ``ValueError`` unless ``matrix`` is a (K, K) row-stochastic matrix."""
    if matrix.shape != (n_sites, n_sites):
        raise ValueError(f"confusion matrix must be {n_sites}x{n_sites}, got {matrix.shape}")
    if not np.isfinite(matrix).all() or (matrix < 0).any():
        raise ValueError("confusion matrix entries must be finite and non-negative")
    if not np.allclose(matrix.sum(axis=1), 1.0, atol=ROW_SUM_TOLERANCE):
        raise ValueError("each confusion matrix row must sum to 1")
