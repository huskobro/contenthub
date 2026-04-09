"""
Faz 17a — Cross-Module Capability Mount + Guarded UX Closure tests.

Tests:
  1. capability matrix — publish guard (blocked_by_token → can_publish blocked)
  2. capability matrix — comments read guard (blocked_by_scope)
  3. capability matrix — comments reply guard (blocked_by_scope)
  4. capability matrix — playlists read guard (blocked_by_connection)
  5. capability matrix — playlists write guard (blocked_by_scope)
  6. capability matrix — posts create guard (unsupported on youtube)
  7. capability matrix — healthy connection all supported
  8. capability endpoint returns correct matrix via API
  9. health endpoint reflects capability issues
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


@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)
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

ALL_YT_SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]


def _make_token(user: User) -> str:
    from app.auth.jwt import create_access_token
    return create_access_token({"sub": user.id})


def _auth_headers(user: User) -> dict:
    return {"Authorization": f"Bearer {_make_token(user)}"}


async def _create_user(db: AsyncSession, display_name: str = "Test User") -> User:
    from app.auth.password import hash_password
    slug = f"user-{_uuid()[:8]}"
    u = User(
        email=f"{slug}@test.com",
        display_name=display_name,
        slug=slug,
        role="user",
        status="active",
        password_hash=hash_password("testpass123"),
    )
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
# Test 1: Publish guard — blocked_by_token
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_publish_guard_blocked_by_token(db_session):
    from app.platform_connections.capability import compute_capability_matrix

    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    conn = await _create_connection(
        db_session, ch.id,
        token_state="expired",
        scopes_granted=ALL_YT_SCOPES,
    )
    matrix = compute_capability_matrix(conn)
    assert matrix["can_publish"] == "blocked_by_token"


# ---------------------------------------------------------------------------
# Test 2: Comments read guard — blocked_by_scope
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_comments_read_guard_blocked_by_scope(db_session):
    from app.platform_connections.capability import compute_capability_matrix

    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    # Only upload scope — missing force-ssl needed for comments
    conn = await _create_connection(
        db_session, ch.id,
        scopes_granted=["https://www.googleapis.com/auth/youtube.upload"],
        scope_status="partial",
    )
    matrix = compute_capability_matrix(conn)
    assert matrix["can_read_comments"] == "blocked_by_scope"


# ---------------------------------------------------------------------------
# Test 3: Comments reply guard — blocked_by_scope
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_comments_reply_guard_blocked_by_scope(db_session):
    from app.platform_connections.capability import compute_capability_matrix

    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    # Only upload scope — missing force-ssl needed for reply
    conn = await _create_connection(
        db_session, ch.id,
        scopes_granted=["https://www.googleapis.com/auth/youtube.upload"],
        scope_status="partial",
    )
    matrix = compute_capability_matrix(conn)
    assert matrix["can_reply_comments"] == "blocked_by_scope"


# ---------------------------------------------------------------------------
# Test 4: Playlists read guard — blocked_by_connection
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_playlists_read_guard_blocked_by_connection(db_session):
    from app.platform_connections.capability import compute_capability_matrix

    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    conn = await _create_connection(
        db_session, ch.id,
        connection_status="disconnected",
        scopes_granted=ALL_YT_SCOPES,
    )
    matrix = compute_capability_matrix(conn)
    assert matrix["can_read_playlists"] == "blocked_by_connection"


# ---------------------------------------------------------------------------
# Test 5: Playlists write guard — blocked_by_scope
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_playlists_write_guard_blocked_by_scope(db_session):
    from app.platform_connections.capability import compute_capability_matrix

    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    # Only analytics scope — missing youtube/force-ssl for playlists
    conn = await _create_connection(
        db_session, ch.id,
        scopes_granted=["https://www.googleapis.com/auth/yt-analytics.readonly"],
        scope_status="partial",
    )
    matrix = compute_capability_matrix(conn)
    assert matrix["can_write_playlists"] == "blocked_by_scope"


# ---------------------------------------------------------------------------
# Test 6: Posts create guard — unsupported on YouTube
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_posts_create_guard_unsupported(db_session):
    from app.platform_connections.capability import compute_capability_matrix

    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    conn = await _create_connection(
        db_session, ch.id,
        scopes_granted=ALL_YT_SCOPES,
    )
    matrix = compute_capability_matrix(conn)
    assert matrix["can_create_posts"] == "unsupported"


# ---------------------------------------------------------------------------
# Test 7: Healthy connection — all supported (except unsupported)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_healthy_connection_all_supported(db_session):
    from app.platform_connections.capability import compute_capability_matrix

    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    conn = await _create_connection(
        db_session, ch.id,
        scopes_granted=ALL_YT_SCOPES,
    )
    matrix = compute_capability_matrix(conn)
    # All should be supported except can_create_posts (unsupported on youtube)
    for cap in ["can_publish", "can_read_comments", "can_reply_comments",
                "can_read_playlists", "can_write_playlists", "can_read_analytics",
                "can_sync_channel_info"]:
        assert matrix[cap] == "supported", f"{cap} should be supported, got {matrix[cap]}"
    assert matrix["can_create_posts"] == "unsupported"


# ---------------------------------------------------------------------------
# Test 8: Capability endpoint returns matrix via API
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_capability_endpoint_returns_matrix(db_session, client):
    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    conn = await _create_connection(
        db_session, ch.id,
        scopes_granted=ALL_YT_SCOPES,
    )

    resp = await client.get(
        f"/api/v1/platform-connections/{conn.id}/capability",
        headers=_auth_headers(u),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "can_publish" in data
    assert data["can_publish"] == "supported"
    assert data["can_create_posts"] == "unsupported"


# ---------------------------------------------------------------------------
# Test 9: Health endpoint reflects capability issues
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_endpoint_reflects_issues(db_session, client):
    u = await _create_user(db_session)
    ch = await _create_channel(db_session, u.id)
    conn = await _create_connection(
        db_session, ch.id,
        token_state="expired",
        scopes_granted=ALL_YT_SCOPES,
    )

    resp = await client.get(
        f"/api/v1/platform-connections/{conn.id}/health",
        headers=_auth_headers(u),
    )
    assert resp.status_code == 200
    data = resp.json()
    health = data["health"]
    assert health["health_level"] in ("token_issue", "partial", "disconnected")
    assert health["capability_matrix"]["can_publish"] == "blocked_by_token"
