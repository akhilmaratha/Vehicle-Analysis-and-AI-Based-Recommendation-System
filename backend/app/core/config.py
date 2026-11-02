from functools import lru_cache
from typing import List

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
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    DEBUG: bool = True
    APP_NAME: str = "Vehicle Recommendation API"
    APP_VERSION: str = "0.1.0"
    # When False (default), schema changes come from Alembic migrations only.
    # Set True only for local bootstrapping without running alembic upgrade.
    AUTO_CREATE_TABLES: bool = False

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
