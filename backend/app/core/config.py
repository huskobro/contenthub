from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="CONTENTHUB_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "ContentHub"
    api_prefix: str = "/api/v1"
    debug: bool = False

    # Data directory — SQLite DB and artifacts will live here.
    # Resolved relative to the repo root at runtime.
    data_dir: Path = Path("data")


settings = Settings()
