import numpy as np
import pytest

from plumbline.config import MAX_STEPS, ConfusionSpec, EngineConfig
from plumbline.domains.circuit import CircuitModel
from plumbline.engine import Engine

GAIN_FLOOR = -1e-9
TOLD_ROW_3 = 2


@pytest.fixture(scope="module")
def model() -> CircuitModel:
    return CircuitModel()


@pytest.fixture(scope="module")
def engine(model: CircuitModel) -> Engine:
    return Engine(model)


def point_mass(engine: Engine, index: int) -> np.ndarray:
    belief = np.zeros(engine.n_hypotheses)
    belief[index] = 1.0
    return belief


def test_prior_is_uniform_with_log2_33_bits(engine: Engine) -> None:
    prior = engine.prior()
    assert prior.sum() == pytest.approx(1.0)
    assert engine.entropy_bits(prior) == pytest.approx(np.log2(33))


def test_update_is_normalised_finite_and_leaves_the_input_untouched(engine: Engine) -> None:
    prior = engine.prior()
    before = prior.copy()
    posterior = engine.update(prior, 3.671, TOLD_ROW_3)
    assert np.isfinite(posterior).all()
    assert posterior.sum() == pytest.approx(1.0)
    np.testing.assert_array_equal(prior, before)


def test_update_matches_the_direct_product_formula(engine: Engine) -> None:
    prior = engine.prior()
    reading, told = 1.70, TOLD_ROW_3
    sigma = engine.sigma
    density = np.exp(-0.5 * ((reading - engine.expected) / sigma) ** 2)
    likelihood = density @ engine.confusion[told]
    direct = prior * likelihood
    direct /= direct.sum()
    np.testing.assert_allclose(engine.update(prior, reading, told), direct, atol=1e-12)


def test_update_survives_a_reading_far_from_every_prediction(engine: Engine) -> None:
    posterior = engine.update(engine.prior(), 11.9, 4)
    assert np.isfinite(posterior).all()
    assert posterior.sum() == pytest.approx(1.0)


def test_placement_after_the_worked_example_reading_puts_the_probe_on_row_2(
    engine: Engine,
) -> None:
    placement = engine.placement(engine.prior(), 3.671, TOLD_ROW_3)
    assert placement.sum() == pytest.approx(1.0)
    assert int(np.argmax(placement)) == 1
    warning = engine.warning(placement, TOLD_ROW_3)
    assert warning.active
    assert warning.likely_site == 1
    assert warning.p_off_site > 0.5


def test_warning_is_inactive_when_the_probe_is_where_it_was_told(engine: Engine) -> None:
    nominal_row_3 = float(engine.expected[0, TOLD_ROW_3])
    placement = engine.placement(point_mass(engine, 0), nominal_row_3, TOLD_ROW_3)
    warning = engine.warning(placement, TOLD_ROW_3)
    assert not warning.active
    assert warning.likely_site == TOLD_ROW_3


def test_placement_audit_returns_one_distribution_per_past_step(engine: Engine) -> None:
    history = [(TOLD_ROW_3, 3.671), (TOLD_ROW_3, 0.338)]
    belief = engine.prior()
    for told, reading in history:
        belief = engine.update(belief, reading, told)
    audit = engine.placement_audit(belief, history)
    assert len(audit) == 2
    for probs in audit:
        assert probs.sum() == pytest.approx(1.0)
    assert int(np.argmax(audit[0])) == 1


def test_expected_gain_is_never_negative_on_prior_and_posteriors(engine: Engine) -> None:
    rng = np.random.default_rng(7)
    beliefs = [engine.prior()] + [rng.dirichlet(np.full(33, 0.3)) for _ in range(5)]
    for belief in beliefs:
        gains = engine.expected_gain(belief)
        assert gains.shape == (6,)
        assert (gains >= GAIN_FLOOR).all()
        assert (gains <= engine.entropy_bits(belief) + 1e-9).all()


def test_point_mass_belief_has_zero_gain_everywhere(engine: Engine) -> None:
    gains = engine.expected_gain(point_mass(engine, 12))
    np.testing.assert_allclose(gains, 0.0, atol=1e-12)


def test_indistinguishable_pair_gives_zero_gain_so_belief_cannot_change(
    engine: Engine, model: CircuitModel
) -> None:
    belief = np.zeros(33)
    belief[model.hypothesis_index("LED_open")] = 0.5
    belief[model.hypothesis_index("LED_reversed")] = 0.5
    np.testing.assert_allclose(engine.expected_gain(belief), 0.0, atol=1e-9)


GRID_STEP_SIGMAS = 0.02
GRID_PAD_SIGMAS = 10.0


def grid_gain(engine: Engine, belief: np.ndarray, site: int) -> float:
    """Deterministic reference: integrate p(r) H(b' | r) on a dense reading grid."""
    sigma = engine.sigma
    lo = engine.expected.min() - GRID_PAD_SIGMAS * sigma
    hi = engine.expected.max() + GRID_PAD_SIGMAS * sigma
    grid = np.arange(lo, hi, GRID_STEP_SIGMAS * sigma)
    density = np.exp(engine.log_kernel(grid))
    likelihood = density @ engine.confusion[site]
    joint = likelihood * belief
    evidence = joint.sum(axis=1)
    posterior = joint / np.where(evidence > 0, evidence, 1.0)[:, None]
    with np.errstate(divide="ignore", invalid="ignore"):
        entropy = -np.where(posterior > 0, posterior * np.log2(posterior), 0.0).sum(axis=1)
    step = grid[1] - grid[0]
    expected_entropy = float((evidence * entropy).sum() * step / (evidence.sum() * step))
    return engine.entropy_bits(belief) - expected_entropy


def test_gauss_hermite_gain_matches_a_dense_grid_integral(engine: Engine) -> None:
    beliefs = [engine.prior(), engine.update(engine.prior(), 3.671, TOLD_ROW_3)]
    for belief in beliefs:
        gains = engine.expected_gain(belief)
        for site in range(6):
            assert gains[site] == pytest.approx(grid_gain(engine, belief, site), abs=1e-3)


def test_worked_example_step_one_numbers_from_the_engine_directly(
    engine: Engine, model: CircuitModel
) -> None:
    belief = engine.update(engine.prior(), 3.671, TOLD_ROW_3)
    assert belief[model.hypothesis_index("R3_short")] == pytest.approx(0.631, abs=1e-3)
    assert belief[model.hypothesis_index("R3_10x_low")] == pytest.approx(0.345, abs=1e-3)
    assert engine.entropy_bits(belief) == pytest.approx(1.0995, abs=1e-3)
    after = engine.update(belief, 0.338, TOLD_ROW_3)
    assert after[model.hypothesis_index("R3_10x_low")] == pytest.approx(0.975, abs=1e-3)


def test_prior_instruction_is_row_3(engine: Engine) -> None:
    instruction = engine.choose_instruction(engine.prior())
    assert instruction.site == TOLD_ROW_3
    assert instruction.gains.shape == (6,)


def test_ties_break_to_the_lowest_site(engine: Engine) -> None:
    assert engine.choose_instruction(point_mass(engine, 0)).site == 0


def test_class_belief_sums_to_one(engine: Engine) -> None:
    assert engine.class_belief(engine.prior()).sum() == pytest.approx(1.0)
    assert len(engine.class_belief(engine.prior())) == len(engine.classes)


def test_resolution_resolves_a_confident_singleton(engine: Engine) -> None:
    belief = point_mass(engine, 12)
    result = engine.resolution(belief, engine.expected_gain(belief), n_steps=2)
    assert result.status == "resolved"
    assert result.reason is None
    assert engine.classes[result.class_index] == (12,)


def test_resolution_refuses_a_confident_multi_member_class(
    engine: Engine, model: CircuitModel
) -> None:
    belief = np.zeros(33)
    belief[model.hypothesis_index("LED_open")] = 0.6
    belief[model.hypothesis_index("LED_reversed")] = 0.4
    result = engine.resolution(belief, engine.expected_gain(belief), n_steps=3)
    assert result.status == "unresolved"
    assert result.reason == "indistinguishable"


def test_resolution_reports_no_informative_site_when_gains_vanish(engine: Engine) -> None:
    belief = engine.prior()
    result = engine.resolution(belief, np.zeros(6), n_steps=1)
    assert (result.status, result.reason) == ("unresolved", "no_informative_site")


def test_resolution_stops_at_max_steps(engine: Engine) -> None:
    belief = engine.prior()
    result = engine.resolution(belief, engine.expected_gain(belief), n_steps=MAX_STEPS)
    assert (result.status, result.reason) == ("unresolved", "max_steps")


def test_resolution_continues_otherwise(engine: Engine) -> None:
    belief = engine.prior()
    result = engine.resolution(belief, engine.expected_gain(belief), n_steps=0)
    assert (result.status, result.reason) == ("continue", None)


def test_exact_confusion_engine_trusts_the_told_site(model: CircuitModel) -> None:
    identity = tuple(tuple(1.0 if i == j else 0.0 for j in range(6)) for i in range(6))
    exact = Engine(model, EngineConfig(confusion=ConfusionSpec(matrix=identity)))
    placement = exact.placement(exact.prior(), 3.671, TOLD_ROW_3)
    np.testing.assert_allclose(placement, np.eye(6)[TOLD_ROW_3])


def test_quadrature_nodes_and_weights_are_exposed_for_the_fixture(engine: Engine) -> None:
    nodes, weights = engine.quadrature
    assert len(nodes) == len(weights) == 20
    assert weights.sum() == pytest.approx(np.sqrt(np.pi))


def test_custom_sigma_and_class_tolerance_override_the_model(model: CircuitModel) -> None:
    custom = Engine(model, EngineConfig(sigma=0.05, class_tolerance=0.05))
    assert custom.sigma == 0.05
    assert len(custom.classes) < 32


def test_normalising_a_non_finite_log_belief_raises_instead_of_asserting() -> None:
    from plumbline.engine import NonFiniteBelief, _normalise_log

    with pytest.raises(NonFiniteBelief):
        _normalise_log(np.array([np.nan, 0.0]))
