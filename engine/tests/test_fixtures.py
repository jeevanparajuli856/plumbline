"""Every recorded fixture recomputes to 1e-6 through a replay Session, and has the web shape."""

from typing import Any

import numpy as np
import pytest

from plumbline.domains import get_model
from plumbline.fixture_io import SCHEMA_VERSION, fixture_from_session, session_from_fixture
from plumbline.record_fixtures import build_session
from tests.conftest import FIXTURE_NAMES, load_fixture

PARITY_TOLERANCE = 1e-6
TOP_LEVEL_KEYS = {
    "schema_version",
    "name",
    "domain",
    "mode",
    "generated_by",
    "git_sha",
    "generated_at",
    "config",
    "catalog",
    "true_hypothesis",
    "prior_instruction",
    "steps",
}
STEP_KEYS = {
    "index",
    "told_site",
    "landed_site",
    "reading",
    "belief",
    "entropy_bits",
    "placement",
    "p_off_site",
    "warning",
    "placement_audit",
    "status",
    "engine_choice",
    "next_told_site",
    "baseline",
    "diagnosis",
    "misfit",
}


def assert_probabilities(values: list[float]) -> None:
    assert all(isinstance(v, float | int) and 0.0 <= v <= 1.0 for v in values)


@pytest.mark.parametrize("name", FIXTURE_NAMES)
def test_fixture_has_the_web_zod_shape(name: str) -> None:
    fixture = load_fixture(name)
    assert TOP_LEVEL_KEYS <= fixture.keys()
    assert fixture["schema_version"] == SCHEMA_VERSION
    assert fixture["mode"] == "replay" and fixture["name"] == name
    assert fixture["generated_by"].startswith(
        "uv run --project engine python -m plumbline.record_fixtures"
    )
    assert fixture["git_sha"] and fixture["generated_at"]
    catalog = fixture["catalog"]
    model = get_model(fixture["domain"])
    assert catalog["hypothesis_ids"] == list(model.hypothesis_ids)
    assert len(catalog["hypothesis_labels"]) == len(catalog["hypothesis_ids"])
    assert len(catalog["site_labels"]) == len(model.sites)
    assert isinstance(fixture["prior_instruction"]["gain_bits"], list)
    assert 1 <= len(fixture["steps"]) <= 32
    for step in fixture["steps"]:
        assert STEP_KEYS <= step.keys()
        assert step["landed_site"] is None or isinstance(step["landed_site"], int)
        assert_probabilities(step["belief"])
        assert_probabilities(step["placement"])
        assert_probabilities([step["p_off_site"]])
        for audit in step["placement_audit"]:
            assert_probabilities(audit)
        assert isinstance(step["engine_choice"]["gain_bits"], list)
        assert set(step["baseline"]) == {"method", "belief", "top", "confidence"}
        if step["status"] == "resolved":
            assert set(step["diagnosis"]) == {"hypothesis_id", "confidence"}
        else:
            assert step["diagnosis"] is None
        if step["status"] == "unresolved":
            assert step["unresolved"]["reason"] in {
                "indistinguishable",
                "no_informative_site",
                "max_steps",
            }
            assert all(isinstance(c, list) for c in step["unresolved"]["classes"])
    assert fixture["steps"][-1]["status"] in {"resolved", "unresolved"}


@pytest.mark.parametrize("name", FIXTURE_NAMES)
def test_fixture_recomputes_within_parity_tolerance(name: str) -> None:
    fixture = load_fixture(name)
    session = session_from_fixture(fixture)
    while session.status == "continue":
        session.step(None)
    recomputed = fixture_from_session(session, name, "", "", "")
    assert recomputed["prior_instruction"]["site"] == fixture["prior_instruction"]["site"]
    assert_close(
        recomputed["prior_instruction"]["gain_bits"], fixture["prior_instruction"]["gain_bits"]
    )
    assert len(recomputed["steps"]) == len(fixture["steps"])
    for got, want in zip(recomputed["steps"], fixture["steps"], strict=True):
        assert_step_matches(got, want)


def assert_close(got: Any, want: Any) -> None:
    np.testing.assert_allclose(
        np.asarray(got, float), np.asarray(want, float), atol=PARITY_TOLERANCE, rtol=0
    )


def assert_step_matches(got: dict[str, Any], want: dict[str, Any]) -> None:
    for key in ("belief", "entropy_bits", "placement", "p_off_site", "placement_audit"):
        assert_close(got[key], want[key])
    assert_close(got["engine_choice"]["gain_bits"], want["engine_choice"]["gain_bits"])
    assert_close(got["baseline"]["belief"], want["baseline"]["belief"])
    for key in (
        "told_site",
        "landed_site",
        "reading",
        "status",
        "warning",
        "next_told_site",
        "diagnosis",
    ):
        if key == "diagnosis" and want[key] is not None:
            assert got[key]["hypothesis_id"] == want[key]["hypothesis_id"]
            assert_close(got[key]["confidence"], want[key]["confidence"])
            continue
        assert got[key] == want[key], key
    assert got["engine_choice"]["site"] == want["engine_choice"]["site"]
    assert got["baseline"]["top"] == want["baseline"]["top"]


@pytest.mark.parametrize("name", [f"seed_{i}" for i in range(1, 6)])
def test_seeded_fixtures_are_reproduced_by_the_seeded_hand(name: str) -> None:
    fixture = load_fixture(name)
    session = build_session(name)
    while session.status == "continue":
        session.step(None)
    readings = [s.reading for s in session.steps]
    assert readings == [s["reading"] for s in fixture["steps"]]


def test_unresolved_pair_refuses_between_led_open_and_led_reversed() -> None:
    last = load_fixture("unresolved_pair")["steps"][-1]
    assert last["status"] == "unresolved"
    assert last["unresolved"]["reason"] == "indistinguishable"
    assert last["unresolved"]["classes"] == [["LED_open", "LED_reversed"]]


def test_slip_heavy_contains_a_slip_and_a_warning() -> None:
    steps = load_fixture("slip_heavy")["steps"]
    assert any(s["landed_site"] != s["told_site"] for s in steps)
    assert any(s["warning"] for s in steps)


def test_thermometer_demo_first_step_is_the_scripted_slip() -> None:
    fixture = load_fixture("thermometer_demo")
    first = fixture["steps"][0]
    assert fixture["true_hypothesis"] == "medium"
    assert (first["told_site"], first["landed_site"], first["reading"]) == (5, 3, 65.65)


def test_thermometer_audit_later_places_the_first_reading_at_3_5_cm() -> None:
    steps = load_fixture("thermometer_demo")["steps"]
    assert steps[0]["warning"] is False
    final_audit = steps[-1]["placement_audit"][0]
    assert int(np.argmax(final_audit)) == 3
