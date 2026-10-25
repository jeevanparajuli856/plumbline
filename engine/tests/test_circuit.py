import numpy as np
import pytest

from truehand.domains.circuit import (
    DEFAULT_NETLIST,
    CircuitModel,
    build_catalog,
    solve_nodes,
)
from truehand.engine import Engine

NOMINAL_VOLTS = [9.000, 3.871, 1.733, 2.499, 0.416, 0.866]
VOLTAGE_TOLERANCE = 1e-3


def test_nominal_node_voltages_match_the_reference_rows() -> None:
    volts = solve_nodes(DEFAULT_NETLIST)
    np.testing.assert_allclose(volts, NOMINAL_VOLTS, atol=VOLTAGE_TOLERANCE)


def test_branch_currents_match_the_hand_check() -> None:
    volts = solve_nodes(DEFAULT_NETLIST)
    i_r1 = (volts[0] - volts[1]) / 1000.0
    i_led = volts[4] / 100.0
    assert i_r1 == pytest.approx(5.129e-3, abs=1e-5)
    assert i_led == pytest.approx(4.157e-3, abs=1e-5)


def test_catalog_has_33_hypotheses_in_the_published_order() -> None:
    catalog = build_catalog()
    ids = [entry.hypothesis.id for entry in catalog]
    assert len(ids) == 33
    assert ids[0] == "nominal"
    assert ids[1:5] == ["R1_open", "R1_short", "R1_10x_high", "R1_10x_low"]
    assert ids[-4:] == ["LED_open", "LED_short", "LED_reversed", "battery_low"]
    assert len(set(ids)) == 33


def test_led_open_and_led_reversed_are_electrically_identical() -> None:
    model = CircuitModel()
    volts = model.expected_readings()
    led_open = model.hypothesis_index("LED_open")
    led_reversed = model.hypothesis_index("LED_reversed")
    np.testing.assert_allclose(volts[led_open], volts[led_reversed], atol=1e-12)


def test_reversed_led_conducts_nothing_so_row_five_is_at_ground() -> None:
    model = CircuitModel()
    assert model.expected_reading(model.hypothesis_index("LED_reversed"), 4) == pytest.approx(0.0)


def test_battery_low_scales_the_supply_row() -> None:
    model = CircuitModel()
    assert model.expected_reading(model.hypothesis_index("battery_low"), 0) == pytest.approx(7.2)


def test_class_count_is_what_the_solver_computes() -> None:
    engine = Engine(CircuitModel())
    sizes = sorted(len(members) for members in engine.classes)
    multi = [members for members in engine.classes if len(members) > 1]
    ids = CircuitModel().hypothesis_ids
    multi_ids = [sorted(ids[i] for i in members) for members in multi]
    assert len(engine.classes) == 32, f"solver computed {len(engine.classes)} classes"
    assert multi_ids == [["LED_open", "LED_reversed"]]
    assert sum(sizes) == 33


def test_r7_short_and_r7_10x_low_differ_only_at_row_five() -> None:
    model = CircuitModel()
    volts = model.expected_readings()
    diff = np.abs(
        volts[model.hypothesis_index("R7_short")] - volts[model.hypothesis_index("R7_10x_low")]
    )
    assert int(np.argmax(diff)) == 4
    assert diff[4] > 1e-3


def test_model_exposes_six_labelled_sites_and_the_volt_unit() -> None:
    model = CircuitModel()
    assert [site.index for site in model.sites] == list(range(6))
    assert model.sites[2].label == "row 3"
    assert model.reading.unit == "V"
    assert model.simulated is False
    assert model.default_sigma == 0.02


def test_unknown_hypothesis_raises_key_error() -> None:
    with pytest.raises(KeyError):
        CircuitModel().hypothesis_index("R9_open")


def test_phrases_are_human_sentences() -> None:
    model = CircuitModel()
    assert "row 3" in model.instruction_phrase(2)
    assert "row 2" in model.warning_phrase(2, 1)
    assert "%" in model.diagnosis_phrase(12, 0.975)
    assert "LED" in model.unresolved_phrase(["LED_open", "LED_reversed"], "indistinguishable")


def test_closest_distinct_pair_stays_in_separate_classes() -> None:
    model = CircuitModel()
    engine = Engine(model)
    volts = model.expected_readings()
    short, low = model.hypothesis_index("R7_short"), model.hypothesis_index("R7_10x_low")
    assert np.max(np.abs(volts[short] - volts[low])) == pytest.approx(0.0448, abs=1e-4)
    class_of = {i: c for c, members in enumerate(engine.classes) for i in members}
    assert class_of[short] != class_of[low]
