from __future__ import annotations

from functools import lru_cache
import json
from typing import Literal

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


KDevAllowedOrigins: list[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        enable_decoding=False,
    )

    app_name: str = "ZoneControl Web POC"
    version: str = "0.1.0"

    environment: Literal["dev", "prod"] = Field(
        default="dev",
        validation_alias=AliasChoices("ZC_ENV", "ENV", "ENVIRONMENT"),
    )

    # Mount path for static assets (where FastAPI serves files from).
    asset_mount_path: str = Field(
        default="/assets",
        description="Local mount path for static assets",
    )

    # Base URL for game assets in API responses. In dev, must be full URL since frontend runs on different port.
    # In prod with same-origin deployment, can use the mount path directly.
    asset_base_url: str = Field(
        default="http://localhost:8000/assets",
        validation_alias=AliasChoices("ASSET_BASE_URL"),
        description="Base URL for game assets in API responses (e.g., http://localhost:8000/assets)",
    )

    allowed_origins: list[str] = []

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def ParseOriginsList(cls, value: object, info) -> list[str]:
        default_value = cls.model_fields["allowed_origins"].default
        if not isinstance(default_value, list):
            default_value = []

        if value is None:
            return default_value

        if isinstance(value, list):
            return [str(v).strip() for v in value if str(v).strip()]

        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return default_value

            if raw.startswith("["):
                parsed = json.loads(raw)
                if not isinstance(parsed, list):
                    raise ValueError("ALLOWED_ORIGINS must be a JSON list of strings")

                return [str(v).strip() for v in parsed if str(v).strip()]

            return [part.strip() for part in raw.split(",") if part.strip()]

        raise TypeError("ALLOWED_ORIGINS must be a string or list")

    @model_validator(mode="after")
    def FinalizeOrigins(self) -> "Settings":
        if self.environment == "dev" and not self.allowed_origins:
            self.allowed_origins = list(KDevAllowedOrigins)

        if self.environment == "prod" and not self.allowed_origins:
            raise ValueError(
                "allowed_origins is required in prod; set ALLOWED_ORIGINS to your frontend origin, "
                'e.g. ALLOWED_ORIGINS="https://yourname.github.io"'
            )

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
