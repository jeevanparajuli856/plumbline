import numpy as np
import pytest

from truehand.domains.circuit import CircuitModel
from truehand.engine import Engine
from truehand.session import (
    FixtureMismatch,
    ReadingNotAllowed,
    ReadingOutOfRange,
    ReadingRequired,
    ReplayScript,
    Session,
    SessionTerminal,
)

WORKED_SCRIPT = {
    "true_hypothesis": "R3_10x_low",
    "steps": [
        {"told_site": 2, "landed_site": 1, "reading": 3.671, "next_told_site": 2},
        {"told_site": 2, "landed_site": 2, "reading": 0.338, "next_told_site": None},
    ],
}


@pytest.fixture(scope="module")
def engine() -> Engine:
    return Engine(CircuitModel())


def simulate(engine: Engine, seed: int, **kwargs: object) -> Session:
    return Session(engine, mode="simulate", seed=seed, **kwargs)  # type: ignore[arg-type]


def run_to_end(session: Session) -> None:
    while session.status == "continue":
        session.step(None if session.mode == "simulate" else 1.0)


def test_simulate_is_deterministic_for_a_seed(engine: Engine) -> None:
    a = simulate(engine, 11, true_hypothesis="R4_open")
    b = simulate(engine, 11, true_hypothesis="R4_open")
    run_to_end(a)
    run_to_end(b)
    assert [s.reading for s in a.steps] == [s.reading for s in b.steps]
    assert [s.landed_site for s in a.steps] == [s.landed_site for s in b.steps]


def test_simulate_draws_the_truth_from_the_seed_when_absent(engine: Engine) -> None:
    assert simulate(engine, 3).true_index == simulate(engine, 3).true_index
    assert simulate(engine, 3).true_index is not None


def test_simulate_rejects_a_supplied_reading(engine: Engine) -> None:
    with pytest.raises(ReadingNotAllowed):
        simulate(engine, 1).step(1.0)


def test_simulated_readings_are_rounded_to_meter_resolution(engine: Engine) -> None:
    session = simulate(engine, 4, true_hypothesis="nominal")
    record = session.step(None)
    assert record.reading == round(record.reading, 3)


def test_live_requires_a_reading_and_never_reveals_truth(engine: Engine) -> None:
    session = Session(engine, mode="live", seed=0)
    with pytest.raises(ReadingRequired):
        session.step(None)
    session.step(1.73)
    view = session.view(include_truth=True)
    assert view["true_hypothesis"] is None
    assert view["steps"][0]["landed_site"] is None


def test_live_rejects_readings_outside_the_meter_range(engine: Engine) -> None:
    with pytest.raises(ReadingOutOfRange):
        Session(engine, mode="live", seed=0).step(50.0)


def test_reveal_never_hides_landed_site_and_truth(engine: Engine) -> None:
    session = simulate(engine, 2, true_hypothesis="R1_open", reveal="never")
    session.step(None)
    view = session.view(include_truth=True)
    assert view["true_hypothesis"] is None
    assert view["steps"][0]["landed_site"] is None


def test_reveal_after_step_shows_landed_site_and_truth(engine: Engine) -> None:
    session = simulate(engine, 2, true_hypothesis="R1_open")
    session.step(None)
    view = session.view(include_truth=True)
    assert view["true_hypothesis"] == "R1_open"
    assert view["steps"][0]["landed_site"] is not None
    assert session.view(include_truth=False)["true_hypothesis"] is None


def test_stepping_a_terminal_session_raises(engine: Engine) -> None:
    session = simulate(engine, 9, true_hypothesis="R2_open")
    run_to_end(session)
    assert session.status in {"resolved", "unresolved"}
    with pytest.raises(SessionTerminal):
        session.step(None)


def test_reset_replays_the_same_sequence(engine: Engine) -> None:
    session = simulate(engine, 21, true_hypothesis="R5_short")
    run_to_end(session)
    first = [(s.landed_site, s.reading) for s in session.steps]
    session.reset()
    assert session.steps == () and session.status == "continue"
    run_to_end(session)
    assert [(s.landed_site, s.reading) for s in session.steps] == first


def test_worked_example_replay_warns_then_resolves(engine: Engine) -> None:
    session = Session(
        engine, mode="replay", seed=0, fixture=ReplayScript.from_mapping(WORKED_SCRIPT)
    )
    first = session.step(None)
    assert first.warning.active and first.warning.likely_site == 1
    assert first.engine_choice.site == 5
    assert first.next_told_site == 2
    second = session.step(0.3385)
    assert second.resolution.status == "resolved"
    assert session.diagnosis(second) == ("R3_10x_low", pytest.approx(0.975, abs=5e-4))


def test_replay_rejects_a_reading_that_disagrees_with_the_fixture(engine: Engine) -> None:
    session = Session(
        engine, mode="replay", seed=0, fixture=ReplayScript.from_mapping(WORKED_SCRIPT)
    )
    with pytest.raises(FixtureMismatch):
        session.step(3.0)


def test_replay_never_invents_a_step_past_the_fixture(engine: Engine) -> None:
    script = {**WORKED_SCRIPT, "steps": WORKED_SCRIPT["steps"][:1]}
    script["steps"] = [{**script["steps"][0], "next_told_site": 2}]
    session = Session(engine, mode="replay", seed=0, fixture=ReplayScript.from_mapping(script))
    session.step(None)
    with pytest.raises(FixtureMismatch):
        session.step(None)


def test_replay_rejects_a_told_site_that_disagrees_with_the_chain(engine: Engine) -> None:
    steps = [dict(s) for s in WORKED_SCRIPT["steps"]]
    steps[0]["next_told_site"] = 5
    session = Session(
        engine,
        mode="replay",
        seed=0,
        fixture=ReplayScript.from_mapping({**WORKED_SCRIPT, "steps": steps}),
    )
    session.step(None)
    with pytest.raises(FixtureMismatch):
        session.step(None)


def test_view_beliefs_are_finite_probabilities_that_sum_to_one(engine: Engine) -> None:
    session = simulate(engine, 5)
    run_to_end(session)
    view = session.view(include_truth=True)
    for belief in [view["belief"], *(s["belief"] for s in view["steps"])]:
        assert all(0.0 <= p <= 1.0 for p in belief)
        assert sum(belief) == pytest.approx(1.0)
    assert np.isfinite(view["entropy_bits"])


def test_terminal_view_has_no_instruction_and_a_status_object(engine: Engine) -> None:
    session = simulate(engine, 9, true_hypothesis="R2_open")
    run_to_end(session)
    view = session.view(include_truth=True)
    last = view["steps"][-1]
    assert view["instruction"] is None and last["next_instruction"] is None
    if last["status"] == "resolved":
        assert last["diagnosis"]["hypothesis_id"] and last["unresolved"] is None
    else:
        assert last["unresolved"]["reason"] and last["diagnosis"] is None


def test_led_reversed_ends_unresolved_between_the_indistinguishable_pair(engine: Engine) -> None:
    session = simulate(engine, 1, true_hypothesis="LED_reversed")
    run_to_end(session)
    last = session.view(include_truth=True)["steps"][-1]
    assert last["status"] == "unresolved"
    assert last["unresolved"]["reason"] == "indistinguishable"
    assert last["unresolved"]["classes"] == [["LED_open", "LED_reversed"]]


def test_max_steps_lists_the_top_classes_instead_of_forcing_one() -> None:
    from truehand.config import EngineConfig

    capped = Engine(CircuitModel(), EngineConfig(max_steps=1))
    session = Session(capped, mode="live", seed=0)
    session.step(3.671)
    last = session.view(include_truth=False)["steps"][-1]
    assert last["status"] == "unresolved"
    assert last["unresolved"]["reason"] == "max_steps"
    assert last["unresolved"]["classes"][:2] == [["R3_short"], ["R3_10x_low"]]
    assert 2 <= len(last["unresolved"]["classes"]) <= 5
    assert last["diagnosis"] is None and "Most likely" in last["unresolved"]["text"]


def test_out_of_model_live_reading_leaves_belief_alone_and_asks_again(engine: Engine) -> None:
    session = Session(engine, mode="live", seed=0)
    prior = session.belief.copy()
    record = session.step(6.0)
    assert record.misfit.active and record.misfit.sigmas > 5.0
    np.testing.assert_array_equal(record.belief, prior)
    np.testing.assert_allclose(record.placement, engine.confusion[2])
    assert not record.warning.active
    assert record.resolution.status == "continue"
    assert session.instruction == 2 and record.next_told_site == 2
    view = session.step_view(record, include_truth=False)
    assert view["misfit"]["active"] is True
    assert "row 3" in view["misfit"]["text"]
    assert view["next_instruction"]["site"] == 2


def test_worked_example_steps_have_no_misfit(engine: Engine) -> None:
    session = Session(
        engine, mode="replay", seed=0, fixture=ReplayScript.from_mapping(WORKED_SCRIPT)
    )
    for _ in range(2):
        view = session.step_view(session.step(None), include_truth=True)
        assert view["misfit"] == {"active": False, "sigmas": view["misfit"]["sigmas"], "text": ""}
        assert view["misfit"]["sigmas"] < 5.0


def test_repeated_misfits_still_stop_at_max_steps() -> None:
    from truehand.config import EngineConfig

    capped = Engine(CircuitModel(), EngineConfig(max_steps=2))
    session = Session(capped, mode="live", seed=0)
    session.step(6.0)
    assert session.status == "continue"
    session.step(6.0)
    assert session.status == "unresolved"


def test_truth_stays_hidden_until_the_first_step(engine: Engine) -> None:
    session = simulate(engine, 3)
    assert session.view(include_truth=True)["true_hypothesis"] is None
    session.step(None)
    revealed = session.view(include_truth=True)["true_hypothesis"]
    assert revealed == engine.model.hypothesis_ids[session.true_index]
    session.reset()
    assert session.view(include_truth=True)["true_hypothesis"] is None
