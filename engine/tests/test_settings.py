import pytest

from truehand_api.settings import Settings


def test_comma_separated_cors_origins_parse_without_json(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "TRUEHAND_CORS_ORIGINS", "https://plumbline-web.onrender.com,http://localhost:5173"
    )
    assert Settings().cors_origins == [
        "https://plumbline-web.onrender.com",
        "http://localhost:5173",
    ]


def test_wildcard_cors_origin_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TRUEHAND_CORS_ORIGINS", "*")
    with pytest.raises(ValueError):
        Settings()


def test_empty_cors_entries_are_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TRUEHAND_CORS_ORIGINS", "http://localhost:5173,,")
    with pytest.raises(ValueError):
        Settings()


def test_legacy_plumbline_cors_variable_still_works_until_render_is_resynced(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("TRUEHAND_CORS_ORIGINS", raising=False)
    monkeypatch.setenv("PLUMBLINE_CORS_ORIGINS", "https://plumbline-web-lxxc.onrender.com")
    assert Settings().cors_origins == ["https://plumbline-web-lxxc.onrender.com"]


def test_truehand_cors_variable_wins_over_the_legacy_name(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PLUMBLINE_CORS_ORIGINS", "https://old.example")
    monkeypatch.setenv("TRUEHAND_CORS_ORIGINS", "https://new.example")
    assert Settings().cors_origins == ["https://new.example"]


def test_local_env_file_supplies_the_resend_key(
    monkeypatch: pytest.MonkeyPatch, tmp_path: pytest.TempPathFactory
) -> None:
    monkeypatch.delenv("TRUEHAND_RESEND_API_KEY", raising=False)
    env_file = tmp_path / ".env.local"  # type: ignore[operator]
    env_file.write_text("TRUEHAND_RESEND_API_KEY=re_test_from_file\nVITE_API_URL=http://x\n")
    settings = Settings(_env_file=env_file)  # type: ignore[call-arg]
    assert settings.resend_api_key is not None
    assert settings.resend_api_key.get_secret_value() == "re_test_from_file"


def test_real_environment_wins_over_the_local_env_file(
    monkeypatch: pytest.MonkeyPatch, tmp_path: pytest.TempPathFactory
) -> None:
    env_file = tmp_path / ".env.local"  # type: ignore[operator]
    env_file.write_text("TRUEHAND_RESEND_API_KEY=re_from_file\n")
    monkeypatch.setenv("TRUEHAND_RESEND_API_KEY", "re_from_env")
    settings = Settings(_env_file=env_file)  # type: ignore[call-arg]
    assert settings.resend_api_key is not None
    assert settings.resend_api_key.get_secret_value() == "re_from_env"
