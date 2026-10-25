import numpy as np
import pytest

from truehand.domains.thermometer import (
    BIOT,
    N_ROOTS,
    ThermometerModel,
    center_temperature,
    eigenvalues,
)
from truehand.engine import Engine

DEEPEST = 5
SURFACE = 0


@pytest.fixture(scope="module")
def model() -> ThermometerModel:
    return ThermometerModel()


def test_biot_number_is_one_and_a_half() -> None:
    assert BIOT == pytest.approx(1.5)


def test_first_eigenvalue_matches_the_incropera_table() -> None:
    assert eigenvalues(BIOT)[0] == pytest.approx(1.8366, abs=1e-4)


def test_thirty_roots_satisfy_the_characteristic_equation() -> None:
    roots = eigenvalues(BIOT)
    assert len(roots) == N_ROOTS
    residual = 1.0 - roots / np.tan(roots) - BIOT
    np.testing.assert_allclose(residual, 0.0, atol=1e-8)
    for n, root in enumerate(roots):
        assert n * np.pi < root < (n + 1) * np.pi


def test_center_warms_monotonically_toward_the_oven() -> None:
    temps = [center_temperature(t) for t in (600.0, 3600.0, 7200.0, 36000.0)]
    assert temps == sorted(temps)
    assert temps[-1] < 120.0


def test_model_is_labelled_simulated_with_seven_classes_and_six_depths(
    model: ThermometerModel,
) -> None:
    assert model.simulated is True
    assert len(model.hypotheses) == 7
    assert [s.label for s in model.sites] == [
        "0.5 cm",
        "1.5 cm",
        "2.5 cm",
        "3.5 cm",
        "4.5 cm",
        "5.5 cm",
    ]
    assert model.reading.unit == "C"
    assert model.default_sigma == 0.5
    assert "62.8" in model.hypotheses[model.hypothesis_index("medium")].description


def test_deepest_site_reads_close_to_the_class_center_temperature(model: ThermometerModel) -> None:
    expected = model.expected_readings()
    centers = [40, 50, 55, 60, 65, 70, 75]
    np.testing.assert_allclose(expected[:, DEEPEST], centers, atol=1.0)
    assert (expected[:, SURFACE] > expected[:, DEEPEST]).all()


def test_every_doneness_class_is_distinguishable(model: ThermometerModel) -> None:
    assert len(Engine(model).classes) == 7


def test_adjacent_class_separation_grows_with_depth(model: ThermometerModel) -> None:
    separation = np.diff(model.expected_readings(), axis=0).min(axis=0)
    assert (np.diff(separation) > 0).all()


def test_phrases_mention_depths(model: ThermometerModel) -> None:
    assert "5.5 cm" in model.instruction_phrase(5)
    assert "3.5 cm" in model.warning_phrase(5, 3)
    assert "Medium" in model.diagnosis_phrase(3, 0.9)
    assert "Rare" in model.unresolved_phrase(["rare"], "max_steps")
