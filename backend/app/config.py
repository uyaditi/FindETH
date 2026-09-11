"""Application configuration, loaded from environment variables / a local .env file."""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # SQLAlchemy connection string. Defaults to a local SQLite file so the
    # backend runs with zero extra infrastructure. Point this at a real
    # Postgres URL instead (e.g. postgresql+psycopg2://user:pass@host/db) for
    # a more production-realistic setup.
    DATABASE_URL: str = "sqlite:///./treasurehunts.db"

    # Select the backend used by /api/ai/*: "ollama" or "gemini".
    AI_PROVIDER: str = "ollama"

    # Ollama endpoint and model used by the /api/ai/* routes.
    OLLAMA_BASE_URL: str = "http://182.78.249.86:8082/arya/api/chat"
    OLLAMA_MODEL: str = "qwen3:8b"

    # Gemini credentials/model used when AI_PROVIDER=gemini.
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Read-only JSON-RPC endpoint used to verify a hunt's on-chain creator.
    RPC_URL: str = "http://localhost:8545"
    TREASURE_HUNT_ADDRESS: str | None = None

    # Comma-separated list of allowed CORS origins.
    CORS_ORIGINS: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
