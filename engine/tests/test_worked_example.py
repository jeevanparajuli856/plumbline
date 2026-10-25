"""The demo story, read from the recorded fixture (rule 6)."""

from typing import Any

import numpy as np

ROW_2, ROW_3, ROW_6 = 1, 2, 5


def top(fixture: dict[str, Any], belief: list[float]) -> tuple[str, float]:
    index = int(np.argmax(belief))
    return fixture["catalog"]["hypothesis_ids"][index], belief[index]


def test_step_one_is_the_scripted_slip(worked_example: dict[str, Any]) -> None:
    first = worked_example["steps"][0]
    assert worked_example["true_hypothesis"] == "R3_10x_low"
    assert worked_example["prior_instruction"]["site"] == ROW_3
    assert (first["told_site"], first["landed_site"], first["reading"]) == (ROW_3, ROW_2, 3.671)


def test_warning_is_active_after_step_one_pointing_at_row_2(worked_example: dict[str, Any]) -> None:
    first = worked_example["steps"][0]
    assert first["warning"] is True
    assert first["likely_site"] == ROW_2
    assert first["p_off_site"] > 0.5
    assert first["status"] == "continue"


def test_truehand_is_unsure_while_the_published_method_is_certain_and_wrong(
    worked_example: dict[str, Any],
) -> None:
    first = worked_example["steps"][0]
    hypothesis, confidence = top(worked_example, first["belief"])
    assert hypothesis == "R3_short" and confidence < 0.95
    assert first["baseline"]["top"] == "R2_short"
    assert first["baseline"]["confidence"] > 0.999


def test_engine_choice_is_recorded_separately_from_the_scripted_next_site(
    worked_example: dict[str, Any],
) -> None:
    first = worked_example["steps"][0]
    assert first["engine_choice"]["site"] == ROW_6
    assert first["next_told_site"] == ROW_3


def test_step_two_resolves_r3_ten_times_too_small(worked_example: dict[str, Any]) -> None:
    second = worked_example["steps"][1]
    assert (second["told_site"], second["reading"]) == (ROW_3, 0.338)
    assert second["status"] == "resolved"
    assert second["diagnosis"]["hypothesis_id"] == "R3_10x_low"
    assert second["diagnosis"]["confidence"] >= 0.95
    assert second["next_told_site"] is None
