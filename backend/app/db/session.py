"""
DB session yönetimi.

Test izolasyonu: `_engine_holder` container üzerinden engine ve session factory
saklanır. Test conftest.py `override_engine()` çağırarak tüm modülü
in-memory SQLite'a yönlendirebilir — `from app.db.session import AsyncSessionLocal`
ile alınan referanslar bile override'ı görür.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import event
from app.core.config import settings
from app.db.base import Base  # noqa: F401 — imported so Alembic can discover metadata


# ---------------------------------------------------------------------------
# Engine container — tek bir dict üzerinden referans paylaşımı
# ---------------------------------------------------------------------------

class _EngineHolder:
    """
    Engine ve session factory'yi tutan container.

    Neden class: `from app.db.session import AsyncSessionLocal` yapıldığında
    doğrudan bir sessionmaker referansı alınır ve monkeypatch ile modül
    attribute'u değiştirmek bunu etkilemez. Bu container sayesinde
    `AsyncSessionLocal()` çağrısı her zaman güncel engine'i kullanır.
    """

    def __init__(self):
        self.engine = None
        self.session_factory = None

    def init(self, engine):
        self.engine = engine
        self.session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    def override(self, engine):
        """Test ortamında engine ve session factory'yi değiştirir."""
        self.engine = engine
        self.session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )


_holder = _EngineHolder()

# Production engine — modül yüklendiğinde oluşturulur
_production_engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    connect_args={"check_same_thread": False},
)


@event.listens_for(_production_engine.sync_engine, "connect")
def _set_sqlite_pragmas(dbapi_conn, _connection_record) -> None:
    """Enable WAL mode and foreign key enforcement on every new connection."""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


_holder.init(_production_engine)

# Public API — diğer modüller bunları import eder
engine = _production_engine  # Geriye uyumluluk; Alembic vb. kullanabilir


class _SessionLocalProxy:
    """
    async_sessionmaker proxy — her çağrıda _holder.session_factory'yi kullanır.
    `from app.db.session import AsyncSessionLocal` ile alınan referans bile
    override sonrası yeni factory'yi görür.
    """

    def __call__(self, *args, **kwargs):
        return _holder.session_factory(*args, **kwargs)

    def __getattr__(self, name):
        return getattr(_holder.session_factory, name)


AsyncSessionLocal = _SessionLocalProxy()


def override_engine(new_engine) -> None:
    """
    Test ortamında engine'i değiştirir.
    conftest.py'den çağrılır — tüm `AsyncSessionLocal()` çağrıları
    artık yeni engine'i kullanır.
    """
    _holder.override(new_engine)


async def get_db() -> AsyncSession:
    """FastAPI dependency: yields an async DB session."""
    async with _holder.session_factory() as session:
        yield session


async def create_tables() -> None:
    """Create all tables that are not yet managed by Alembic migrations.

    Called during app startup in development/testing only.
    In production, use `alembic upgrade head`.
    """
    async with _holder.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
