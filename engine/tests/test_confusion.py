import numpy as np
import pytest

from truehand.config import ConfusionSpec
from truehand.confusion import banded_confusion, validate_confusion

SITES = 6


def test_row_one_is_clipped_and_renormalised_at_the_board_edge() -> None:
    matrix = banded_confusion(ConfusionSpec(), SITES)
    assert matrix[0, 0] == pytest.approx(0.876, abs=1e-3)
    assert matrix[0, 1] == pytest.approx(0.090, abs=1e-3)
    assert matrix[0, 2] == pytest.approx(0.034, abs=1e-3)
    assert matrix[0, 3:].sum() == 0.0


def test_interior_rows_keep_the_published_band() -> None:
    matrix = banded_confusion(ConfusionSpec(), SITES)
    np.testing.assert_allclose(matrix[2], [0.03, 0.08, 0.78, 0.08, 0.03, 0.0])


def test_every_row_is_a_probability_distribution() -> None:
    matrix = banded_confusion(ConfusionSpec(), SITES)
    np.testing.assert_allclose(matrix.sum(axis=1), np.ones(SITES))
    assert (matrix >= 0).all()


def test_positive_asymmetry_moves_off_site_mass_toward_lower_sites() -> None:
    matrix = banded_confusion(ConfusionSpec(asymmetry=0.5), SITES)
    assert matrix[3, 2] > matrix[3, 4]


def test_measured_matrix_overrides_the_band() -> None:
    identity = tuple(tuple(1.0 if i == j else 0.0 for j in range(SITES)) for i in range(SITES))
    matrix = banded_confusion(ConfusionSpec(matrix=identity), SITES)
    np.testing.assert_array_equal(matrix, np.eye(SITES))


def test_validate_rejects_rows_that_do_not_sum_to_one() -> None:
    bad = np.full((SITES, SITES), 0.5)
    with pytest.raises(ValueError):
        validate_confusion(bad, SITES)


def test_validate_rejects_wrong_shape() -> None:
    with pytest.raises(ValueError):
        validate_confusion(np.eye(3), SITES)


def test_validate_rejects_negative_entries() -> None:
    bad = np.eye(SITES)
    bad[0, 0], bad[0, 1] = 1.5, -0.5
    with pytest.raises(ValueError):
        validate_confusion(bad, SITES)
