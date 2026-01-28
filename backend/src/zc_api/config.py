from __future__ import annotations

from functools import lru_cache
import json
from typing import Literal

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


KDevAllowedWsOrigins: list[str] = [
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

    allowed_ws_origins: list[str] = []

    @field_validator("allowed_ws_origins", mode="before")
    @classmethod
    def ParseAllowedWsOrigins(cls, value: object) -> list[str]:
        default_value = cls.model_fields["allowed_ws_origins"].default
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
                    raise ValueError("ALLOWED_WS_ORIGINS must be a JSON list of strings")

                return [str(v).strip() for v in parsed if str(v).strip()]

            return [part.strip() for part in raw.split(",") if part.strip()]

        raise TypeError("ALLOWED_WS_ORIGINS must be a string or list")

    @model_validator(mode="after")
    def FinalizeAllowedWsOrigins(self) -> "Settings":
        if self.environment == "dev" and not self.allowed_ws_origins:
            self.allowed_ws_origins = list(KDevAllowedWsOrigins)

        if self.environment == "prod" and not self.allowed_ws_origins:
            raise ValueError(
                "allowed_ws_origins is required in prod; set ALLOWED_WS_ORIGINS to your Pages origin, "
                'example: ALLOWED_WS_ORIGINS="https://lifeforce-dev.github.io"'
            )

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
