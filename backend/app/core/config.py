from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/vehicle_recommendation"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_TIMEOUT_SECONDS: float = 60.0
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    # Production-safe default. Set DEBUG=true only for local development.
    DEBUG: bool = False
    APP_NAME: str = "Vehicle Recommendation API"
    APP_VERSION: str = "0.1.0"
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    ADMIN_COOKIE_NAME: str = "vehicle_admin_token"
    ADMIN_COOKIE_SECURE: bool = False
    ADMIN_COOKIE_SAMESITE: str = "lax"
    # When False (default), schema changes come from Alembic migrations only.
    # Set True only for local bootstrapping without running alembic upgrade.
    AUTO_CREATE_TABLES: bool = False
    # Fail fast on startup when PostgreSQL is unreachable (recommended for production).
    REQUIRE_DB_ON_STARTUP: bool = True
    # Max JSON / form body size accepted by the API (bytes).
    MAX_REQUEST_BODY_BYTES: int = 1_048_576
    # Optional libpq sslmode when not already present in DATABASE_URL
    # (e.g. require, verify-full). Leave empty for local Postgres without SSL.
    DATABASE_SSL_MODE: str = ""

    @field_validator("ADMIN_COOKIE_SAMESITE")
    @classmethod
    def validate_samesite(cls, value: str) -> str:
        normalized = (value or "lax").strip().lower()
        if normalized not in {"lax", "strict", "none"}:
            raise ValueError("ADMIN_COOKIE_SAMESITE must be lax, strict, or none")
        return normalized

    @field_validator("DATABASE_SSL_MODE")
    @classmethod
    def validate_ssl_mode(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        allowed = {
            "",
            "disable",
            "allow",
            "prefer",
            "require",
            "verify-ca",
            "verify-full",
        }
        if normalized not in allowed:
            raise ValueError(
                "DATABASE_SSL_MODE must be empty or one of: "
                "disable, allow, prefer, require, verify-ca, verify-full"
            )
        return normalized

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    def validate_security_settings(self) -> None:
        """Raise if critical secrets are missing or obviously unsafe."""
        secret = (self.JWT_SECRET_KEY or "").strip()
        if not secret:
            raise RuntimeError("JWT_SECRET_KEY must be configured")
        if secret in {"change-this-in-your-local-env", "secret", "changeme"}:
            raise RuntimeError(
                "JWT_SECRET_KEY must be changed from the example/placeholder value"
            )
        if len(secret) < 24:
            raise RuntimeError("JWT_SECRET_KEY must be at least 24 characters")


@lru_cache
def get_settings() -> Settings:
    return Settings()
