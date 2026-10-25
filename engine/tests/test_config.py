from truehand.config import ConfusionSpec, EngineConfig


def test_default_confusion_mass_sums_to_one() -> None:
    spec = ConfusionSpec()
    assert abs(spec.p_same + 2 * spec.p_pm1 + 2 * spec.p_pm2 + 2 * spec.p_pm3 - 1.0) < 1e-12


def test_engine_config_defaults_defer_sigma_to_the_model() -> None:
    assert EngineConfig().sigma is None
