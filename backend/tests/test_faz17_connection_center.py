"""
Faz 17 — Connection Center + Capability Matrix tests.

Tests:
  1. connection health summary (healthy)
  2. capability matrix — supported
  3. capability matrix — blocked_by_token
  4. capability matrix — blocked_by_scope
  5. capability matrix — blocked_by_connection
  6. capability matrix — unsupported (youtube can_create_posts)
  7. requires_reauth derived state
  8. user center /my endpoint
  9. admin center endpoint + KPIs
  10. empty state (no connections)
"""

from __future__ import annotations

import json
import pytest
from uuid import uuid4 as _uuid4
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.session import get_db
from app.db.models import Base, User, ChannelProfile, PlatformConnection
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

_uuid = lambda: str(_uuid4())

# ---------------------------------------------------------------------------
# DB fixtures
# ---------------------------------------------------------------------------

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)


async def _override_get_db():
    async with TestSession() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session():
    async with TestSession() as session:
        yield session


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_user(db: AsyncSession, display_name: str = "Test User") -> User:
    slug = f"user-{_uuid()[:8]}"
    u = User(email=f"{slug}@test.com", display_name=display_name, slug=slug, role="user")
    db.add(u)
    await db.commit()
    return u


async def _create_channel(db: AsyncSession, user_id: str, name: str = "Test Channel") -> ChannelProfile:
    ch = ChannelProfile(user_id=user_id, profile_name=name, channel_slug=f"ch-{_uuid()[:8]}")
    db.add(ch)
    await db.commit()
    return ch


async def _create_connection(
    db: AsyncSession,
    channel_profile_id: str,
    *,
    platform: str = "youtube",
    connection_status: str = "connected",
    token_state: str = "valid",
    scope_status: str = "sufficient",
    scopes_granted: list[str] | None = None,
    requires_reauth: bool = False,
    is_primary: bool = False,
    external_account_name: str | None = "Test Account",
    last_error: str | None = None,
) -> PlatformConnection:
    conn = PlatformConnection(
        channel_profile_id=channel_profile_id,
        platform=platform,
        connection_status=connection_status,
        token_state=token_state,
        auth_state="authorized" if connection_status == "connected" else "pending",
        scope_status=scope_status,
        scopes_granted=json.dumps(scopes_granted) if scopes_granted else None,
        requires_reauth=requires_reauth,
        is_primary=is_primary,
        external_account_name=external_account_name,
        last_error=last_error,
    )
    db.add(conn)
    await db.commit()
    return conn


# ---------------------------------------------------------------------------
# Test 1: Health summary — healthy connection
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_summary_healthy(db_session):
    from app.platform_connections.capability import compute_health_summary

    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    conn = await _create_connection(
        db_session, ch.id,
        scopes_granted=["https://www.googleapis.com/auth/youtube"],
    )

    health = compute_health_summary(conn)
    assert health["health_level"] == "healthy"
    assert health["blocked_count"] == 0
    assert health["supported_count"] > 0
    assert len(health["issues"]) == 0


# ---------------------------------------------------------------------------
# Test 2: Capability matrix — supported
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_capability_matrix_supported(db_session):
    from app.platform_connections.capability import compute_capability_matrix

    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    conn = await _create_connection(
        db_session, ch.id,
        scopes_granted=["https://www.googleapis.com/auth/youtube"],
    )

    matrix = compute_capability_matrix(conn)
    assert matrix["can_publish"] == "supported"
    assert matrix["can_read_comments"] == "supported"
    assert matrix["can_read_playlists"] == "supported"
    assert matrix["can_sync_channel_info"] == "supported"


# ---------------------------------------------------------------------------
# Test 3: Capability — blocked by token
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_capability_blocked_by_token(db_session):
    from app.platform_connections.capability import compute_capability_matrix

    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    conn = await _create_connection(
        db_session, ch.id, token_state="expired",
    )

    matrix = compute_capability_matrix(conn)
    assert matrix["can_publish"] == "blocked_by_token"
    assert matrix["can_read_comments"] == "blocked_by_token"


# ---------------------------------------------------------------------------
# Test 4: Capability — blocked by scope
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_capability_blocked_by_scope(db_session):
    from app.platform_connections.capability import compute_capability_matrix

    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    # Only readonly scope — can't publish
    conn = await _create_connection(
        db_session, ch.id,
        scopes_granted=["https://www.googleapis.com/auth/youtube.readonly"],
    )

    matrix = compute_capability_matrix(conn)
    assert matrix["can_publish"] == "blocked_by_scope"
    assert matrix["can_read_playlists"] == "supported"  # readonly is enough


# ---------------------------------------------------------------------------
# Test 5: Capability — blocked by connection
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_capability_blocked_by_connection(db_session):
    from app.platform_connections.capability import compute_capability_matrix

    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    conn = await _create_connection(
        db_session, ch.id, connection_status="disconnected",
    )

    matrix = compute_capability_matrix(conn)
    assert matrix["can_publish"] == "blocked_by_connection"
    assert matrix["can_read_analytics"] == "blocked_by_connection"


# ---------------------------------------------------------------------------
# Test 6: Capability — unsupported (youtube can_create_posts)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_capability_unsupported(db_session):
    from app.platform_connections.capability import compute_capability_matrix

    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    conn = await _create_connection(
        db_session, ch.id,
        scopes_granted=["https://www.googleapis.com/auth/youtube"],
    )

    matrix = compute_capability_matrix(conn)
    assert matrix["can_create_posts"] == "unsupported"


# ---------------------------------------------------------------------------
# Test 7: requires_reauth derived state
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_requires_reauth_derived(db_session):
    from app.platform_connections.capability import compute_health_summary

    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    conn = await _create_connection(
        db_session, ch.id, requires_reauth=True,
    )

    health = compute_health_summary(conn)
    assert health["health_level"] == "reauth_required"
    assert any("Yeniden yetkilendirme" in i for i in health["issues"])
    # All capabilities blocked by connection
    for k, v in health["capability_matrix"].items():
        if v != "unsupported":
            assert v == "blocked_by_connection"


# ---------------------------------------------------------------------------
# Test 8: User center /my endpoint
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_user_center_my(db_session, client: AsyncClient):
    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    await _create_connection(
        db_session, ch.id,
        scopes_granted=["https://www.googleapis.com/auth/youtube"],
    )

    resp = await client.get(
        "/api/v1/platform-connections/center/my",
        headers={"X-ContentHub-User-Id": u.id},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1
    item = data["items"][0]
    assert "health" in item
    assert item["health"]["health_level"] == "healthy"
    assert "capability_matrix" in item["health"]


# ---------------------------------------------------------------------------
# Test 9: Admin center endpoint + KPIs
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_center_with_kpis(db_session, client: AsyncClient):
    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    await _create_connection(
        db_session, ch.id,
        scopes_granted=["https://www.googleapis.com/auth/youtube"],
    )
    await _create_connection(
        db_session, ch.id,
        connection_status="disconnected",
        external_account_name="Broken Account",
    )

    resp = await client.get("/api/v1/platform-connections/center/admin")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    assert data["kpis"] is not None
    kpis = data["kpis"]
    assert kpis["total"] >= 2
    assert kpis["healthy"] >= 1
    assert kpis["disconnected"] >= 1


# ---------------------------------------------------------------------------
# Test 10: Empty state (no connections)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_empty_state(db_session, client: AsyncClient):
    u = await _create_user(db_session)

    resp = await client.get(
        "/api/v1/platform-connections/center/my",
        headers={"X-ContentHub-User-Id": u.id},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []
