import numpy as np
import pytest

from truehand.baselines import Checklist, EntropyExact, RandomOrder, RemeasureUntilAgree
from truehand.domains.circuit import CircuitModel

TOLD_ROW_3 = 2


@pytest.fixture(scope="module")
def model() -> CircuitModel:
    return CircuitModel()


def test_entropy_exact_is_certain_and_wrong_on_the_worked_example(model: CircuitModel) -> None:
    baseline = EntropyExact(model)
    state = baseline.observe(baseline.start(), TOLD_ROW_3, 3.671)
    top = int(np.argmax(state.belief))
    assert model.hypothesis_ids[top] == "R2_short"
    assert state.belief[top] > 0.999


def test_entropy_exact_chooses_the_exact_gain_maximiser(model: CircuitModel) -> None:
    baseline = EntropyExact(model)
    state = baseline.start()
    rng = np.random.default_rng(0)
    gains = baseline.engine.expected_gain(state.belief)
    assert baseline.choose(state, rng) == int(np.argmax(gains))


def test_observe_returns_a_new_state_without_mutating_the_old(model: CircuitModel) -> None:
    baseline = EntropyExact(model)
    start = baseline.start()
    before = start.belief.copy()
    after = baseline.observe(start, TOLD_ROW_3, 1.7)
    np.testing.assert_array_equal(start.belief, before)
    assert after is not start
    assert after.n_readings == 1


def test_checklist_walks_the_sites_in_order(model: CircuitModel) -> None:
    baseline = Checklist(model)
    rng = np.random.default_rng(0)
    state = baseline.start()
    chosen = []
    for _ in range(8):
        site = baseline.choose(state, rng)
        chosen.append(site)
        state = baseline.observe(state, site, float(model.expected_reading(0, site)))
    assert chosen == [0, 1, 2, 3, 4, 5, 0, 1]


def test_random_order_is_reproducible_with_the_same_seed(model: CircuitModel) -> None:
    baseline = RandomOrder(model)
    picks_a = [baseline.choose(baseline.start(), rng) for rng in [np.random.default_rng(5)] * 6]
    picks_b = [baseline.choose(baseline.start(), rng) for rng in [np.random.default_rng(5)] * 6]
    assert picks_a == picks_b
    assert all(0 <= site < 6 for site in picks_a)


def test_remeasure_repeats_a_site_until_two_readings_agree(model: CircuitModel) -> None:
    baseline = RemeasureUntilAgree(model)
    rng = np.random.default_rng(0)
    state = baseline.start()
    first = baseline.choose(state, rng)
    state = baseline.observe(state, first, 1.0)
    assert baseline.choose(state, rng) == first
    np.testing.assert_allclose(state.belief, baseline.start().belief)
    state = baseline.observe(state, first, 3.0)
    assert baseline.choose(state, rng) == first
    state = baseline.observe(state, first, 3.001)
    assert state.pending is None
    assert not np.allclose(state.belief, baseline.start().belief)
    assert state.n_readings == 3


def test_baselines_resolve_with_the_same_rule(model: CircuitModel) -> None:
    baseline = EntropyExact(model)
    state = baseline.observe(baseline.start(), TOLD_ROW_3, 3.671)
    assert baseline.resolution(state).status == "resolved"
