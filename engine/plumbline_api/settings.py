"""Runtime settings for the API, read from PLUMBLINE_* environment variables."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PLUMBLINE_", extra="ignore")

    # NoDecode: the env var is a comma-separated list, not JSON (render.yaml sets it that way).
    cors_origins: Annotated[list[str], NoDecode] = DEFAULT_CORS_ORIGINS
    session_max: int = 500
    session_ttl_s: int = 3600
    fixtures_dir: Path = Path(__file__).resolve().parent.parent / "fixtures" / "parity"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        origins = value.split(",") if isinstance(value, str) else value
        if not isinstance(origins, list):
            return value
        cleaned = [str(origin).strip() for origin in origins]
        if any(not origin for origin in cleaned):
            raise ValueError("PLUMBLINE_CORS_ORIGINS has an empty entry")
        if "*" in cleaned:
            raise ValueError("PLUMBLINE_CORS_ORIGINS must list origins; '*' is not allowed")
        return cleaned


settings = Settings()


def get_settings() -> Settings:
    """FastAPI dependency; tests override it to point at a temporary fixtures directory."""
    return settings
