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

    # Data directory — SQLite DB and artifacts live here.
    data_dir: Path = Path("data")

    @property
    def database_url(self) -> str:
        db_path = self.data_dir / "contenthub.db"
        return f"sqlite+aiosqlite:///{db_path}"

    @property
    def database_url_sync(self) -> str:
        """Synchronous URL used by Alembic migrations."""
        db_path = self.data_dir / "contenthub.db"
        return f"sqlite:///{db_path}"


settings = Settings()
