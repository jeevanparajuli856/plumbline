import pytest

from plumbline_api.settings import Settings


def test_comma_separated_cors_origins_parse_without_json(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "PLUMBLINE_CORS_ORIGINS", "https://plumbline-web.onrender.com,http://localhost:5173"
    )
    assert Settings().cors_origins == [
        "https://plumbline-web.onrender.com",
        "http://localhost:5173",
    ]


def test_wildcard_cors_origin_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PLUMBLINE_CORS_ORIGINS", "*")
    with pytest.raises(ValueError):
        Settings()


def test_empty_cors_entries_are_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PLUMBLINE_CORS_ORIGINS", "http://localhost:5173,,")
    with pytest.raises(ValueError):
        Settings()
