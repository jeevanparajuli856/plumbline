"""Runtime settings for the API, read from PLUMBLINE_* environment variables."""

from __future__ import annotations

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PLUMBLINE_", extra="ignore")

    cors_origins: list[str] = DEFAULT_CORS_ORIGINS
    session_max: int = 500
    session_ttl_s: int = 3600
    fixtures_dir: Path = Path(__file__).resolve().parent.parent / "fixtures" / "parity"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
