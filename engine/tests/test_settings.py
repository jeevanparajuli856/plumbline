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
