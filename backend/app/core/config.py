"""LUNARIS backend — application configuration."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = "sqlite+aiosqlite:///./lunaris.db"

    # File storage
    upload_dir: Path = Path("./uploads")
    results_dir: Path = Path("./results")
    reports_dir: Path = Path("./reports")

    # Server
    log_level: str = "INFO"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Compute
    gpu_enabled: bool = False

    # Models
    model_cache_dir: Path | None = None
    loftr_pretrained: str = "outdoor"

    # App metadata
    app_name: str = "LUNARIS"
    app_version: str = "0.1.0"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    def ensure_dirs(self) -> None:
        """Create all required runtime directories."""
        for d in (self.upload_dir, self.results_dir, self.reports_dir):
            d.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
