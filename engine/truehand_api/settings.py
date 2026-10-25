"""Runtime settings for the API, read from TRUEHAND_* environment variables."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# The product was renamed (ADR-0013). Render still holds the old variable until the blueprint is
# re-synced, so the old name is read as a fallback; the new name wins when both are set.
CORS_ENV_NAMES = AliasChoices("TRUEHAND_CORS_ORIGINS", "PLUMBLINE_CORS_ORIGINS")

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
]
DEFAULT_CONTACT_TO = "support@truehand.tech"
DEFAULT_CONTACT_FROM = "Truehand <contact@truehand.tech>"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="TRUEHAND_", extra="ignore")

    # NoDecode: the env var is a comma-separated list, not JSON (render.yaml sets it that way).
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default=DEFAULT_CORS_ORIGINS, validation_alias=CORS_ENV_NAMES
    )
    session_max: int = 500
    session_ttl_s: int = 3600
    fixtures_dir: Path = Path(__file__).resolve().parent.parent / "fixtures" / "parity"
    # Contact form (ADR-0014 decision 6). No key: POST /v1/contact answers 503 contact_unavailable.
    resend_api_key: SecretStr | None = None
    contact_to: str = DEFAULT_CONTACT_TO
    contact_from: str = DEFAULT_CONTACT_FROM
    contact_max_per_window: int = Field(default=3, ge=1)
    contact_window_s: int = Field(default=600, ge=1)
    contact_global_per_hour: int = Field(default=20, ge=1)

    @field_validator("resend_api_key", mode="before")
    @classmethod
    def _blank_key_is_missing(cls, value: object) -> object:
        """Render may hold the variable with an empty value until the user sets it."""
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        origins = value.split(",") if isinstance(value, str) else value
        if not isinstance(origins, list):
            return value
        cleaned = [str(origin).strip() for origin in origins]
        if any(not origin for origin in cleaned):
            raise ValueError("TRUEHAND_CORS_ORIGINS has an empty entry")
        if "*" in cleaned:
            raise ValueError("TRUEHAND_CORS_ORIGINS must list origins; '*' is not allowed")
        return cleaned


settings = Settings()


def get_settings() -> Settings:
    """FastAPI dependency; tests override it to point at a temporary fixtures directory."""
    return settings
