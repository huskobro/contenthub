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

    # Provider API anahtarları — .env dosyasından okunur, koda gömülmez
    kie_ai_api_key: str = ""
    pexels_api_key: str = ""
    pixabay_api_key: str = ""
    # M3-C2: İkinci LLM provider (OpenAI uyumlu fallback)
    # Boşsa fallback LLM kaydedilmez (main.py'de kontrol edilir)
    openai_api_key: str = ""

    # M9-A: YouTube OAuth2 client credentials (opsiyonel .env desteği)
    youtube_client_id: str = ""
    youtube_client_secret: str = ""

    # Dev bypass — true ise JWT doğrulaması atlanır, tüm istekler admin olarak işlenir
    auth_disabled: bool = False

    # Sprint 1: JWT authentication settings — env'den okunur
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 7

    # Publish Core Hardening Pack — OAuth token encryption at rest.
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # Empty in debug mode → deterministic dev fallback (warning logged).
    # Empty in production mode → app must fail fast on first cipher access.
    encryption_key: str = ""

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
