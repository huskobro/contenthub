"""
Test konfigürasyon ve ortak fixture'lar.

DB izolasyonu: testler in-memory SQLite kullanır — production data/contenthub.db
asla değiştirilmez.

Strateji:
  session-scoped autouse fixture ile app.db.session modülündeki engine
  ve AsyncSessionLocal in-memory engine'e yönlendirilir. override_engine()
  proxy pattern sayesinde `from app.db.session import AsyncSessionLocal`
  yapan tüm test dosyaları (kendi client fixture'ını tanımlasalar bile)
  in-memory DB'yi kullanır.

Sprint 2: Auth fixture'ları eklendi — admin_user, regular_user, admin_headers,
user_headers. Tüm API testleri bu fixture'ları kullanarak JWT auth gönderir.
"""

import pytest
from uuid import uuid4 as _uuid4
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import event

from app.main import app
from app.db.session import get_db, override_engine
from app.db.base import Base
from app.db.models import User
from app.modules.registry import module_registry
from app.modules.standard_video.definition import STANDARD_VIDEO_MODULE
from app.modules.news_bulletin.definition import NEWS_BULLETIN_MODULE


# Test ortamında global registry'e modülleri kaydet
module_registry.register(STANDARD_VIDEO_MODULE)
module_registry.register(NEWS_BULLETIN_MODULE)


# ---------------------------------------------------------------------------
# In-memory test DB — production DB'ye dokunmaz
# ---------------------------------------------------------------------------

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
async def test_engine():
    """Session-scoped in-memory SQLite engine."""
    _engine = create_async_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(_engine.sync_engine, "connect")
    def _set_pragmas(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield _engine
    await _engine.dispose()


@pytest.fixture(autouse=True, scope="session")
async def _override_db_engine(test_engine):
    """
    Tüm testler boyunca app.db.session modülünü in-memory engine'e yönlendirir.
    Proxy pattern sayesinde `from app.db.session import AsyncSessionLocal`
    ile alınan referanslar bile override'ı görür.
    """
    override_engine(test_engine)
    yield
    # Session sonu — restore gerekmez, process kapanıyor


@pytest.fixture
async def client(test_engine) -> AsyncClient:
    """
    Test client — in-memory DB kullanır.
    """
    TestSessionLocal = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def override_get_db():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
async def db_session(test_engine):
    """
    Test DB session — in-memory SQLite üzerinde çalışır.
    """
    TestSessionLocal = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with TestSessionLocal() as session:
        yield session


# ---------------------------------------------------------------------------
# Auth fixtures — Sprint 2
# ---------------------------------------------------------------------------

def _make_token(user: User) -> str:
    """JWT access token üretir."""
    from app.auth.jwt import create_access_token
    return create_access_token({"sub": user.id})


async def _create_test_user(db: AsyncSession, *, role: str = "user") -> User:
    """In-memory DB'de test kullanıcısı oluşturur."""
    from app.auth.password import hash_password
    slug = f"{role}-{str(_uuid4())[:8]}"
    u = User(
        email=f"{slug}@test.local",
        display_name=f"Test {role.title()}",
        slug=slug,
        role=role,
        status="active",
        password_hash=hash_password("testpass123"),
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Test admin kullanıcısı."""
    return await _create_test_user(db_session, role="admin")


@pytest.fixture
async def regular_user(db_session: AsyncSession) -> User:
    """Test user kullanıcısı."""
    return await _create_test_user(db_session, role="user")


@pytest.fixture
def admin_headers(admin_user: User) -> dict[str, str]:
    """Admin JWT Authorization header."""
    return {"Authorization": f"Bearer {_make_token(admin_user)}"}


@pytest.fixture
def user_headers(regular_user: User) -> dict[str, str]:
    """User JWT Authorization header."""
    return {"Authorization": f"Bearer {_make_token(regular_user)}"}
