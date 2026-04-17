"""
Phase AM — Platform Connections ownership guard tests.

Scope (matches Phase AL audit fix A):
    The legacy Faz 2 CRUD endpoints (`/api/v1/platform-connections`) must not
    leak connections across users anymore. Every read/write now requires
    UserContext and, for non-admin callers, scopes to connections whose
    ChannelProfile.user_id equals the caller id.

Tested endpoints:
    GET  /platform-connections                 (list — legacy Faz 2)
    GET  /platform-connections/{id}            (read — legacy)
    PATCH /platform-connections/{id}           (mutate — legacy)
    DELETE /platform-connections/{id}          (hard delete — legacy)
    GET  /platform-connections/{id}/health     (Faz 17 detail)
    GET  /platform-connections/{id}/capability (Faz 17 matrix)

Each test uses JWT via `admin_headers` / `user_headers` from conftest.
A second `raw_client` is used for the unauthenticated-401 case.
"""

from __future__ import annotations

import json
from uuid import uuid4 as _uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ChannelProfile, PlatformConnection, User
from app.auth.password import hash_password

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/platform-connections"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _make_user(db: AsyncSession, *, role: str = "user") -> User:
    slug = f"{role}-{_uuid4().hex[:8]}"
    u = User(
        email=f"{slug}@test.local",
        display_name=f"Phase AM {role.title()}",
        slug=slug,
        role=role,
        status="active",
        password_hash=hash_password("testpass123"),
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


def _headers_for(user: User) -> dict[str, str]:
    from app.auth.jwt import create_access_token

    return {"Authorization": f"Bearer {create_access_token({'sub': user.id})}"}


async def _make_channel(db: AsyncSession, owner: User) -> ChannelProfile:
    ch = ChannelProfile(
        user_id=owner.id,
        profile_name=f"ch-{_uuid4().hex[:6]}",
        channel_slug=f"am-{_uuid4().hex[:8]}",
        default_language="tr",
        status="active",
    )
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch


async def _make_connection(
    db: AsyncSession,
    channel: ChannelProfile,
    *,
    platform: str = "youtube",
    is_primary: bool = False,
) -> PlatformConnection:
    conn = PlatformConnection(
        channel_profile_id=channel.id,
        platform=platform,
        external_account_id=f"ext-{_uuid4().hex[:6]}",
        external_account_name="Phase AM Account",
        auth_state="authorized",
        token_state="valid",
        scope_status="sufficient",
        scopes_granted=json.dumps(["https://www.googleapis.com/auth/youtube"]),
        connection_status="connected",
        requires_reauth=False,
        is_primary=is_primary,
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return conn


# ---------------------------------------------------------------------------
# Unauthenticated access — every CRUD endpoint rejects
# ---------------------------------------------------------------------------


async def test_list_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(BASE)
    assert r.status_code == 401, r.text


async def test_get_by_id_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(f"{BASE}/any-id")
    assert r.status_code == 401, r.text


async def test_patch_requires_auth(raw_client: AsyncClient):
    r = await raw_client.patch(f"{BASE}/any-id", json={"is_primary": True})
    assert r.status_code == 401, r.text


async def test_delete_requires_auth(raw_client: AsyncClient):
    r = await raw_client.delete(f"{BASE}/any-id")
    assert r.status_code == 401, r.text


async def test_health_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(f"{BASE}/any-id/health")
    assert r.status_code == 401, r.text


async def test_capability_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(f"{BASE}/any-id/capability")
    assert r.status_code == 401, r.text


# ---------------------------------------------------------------------------
# Non-admin list — only own connections
# ---------------------------------------------------------------------------


async def test_user_list_scopes_to_own_connections(
    client: AsyncClient, db_session: AsyncSession
):
    """User A should only see connections tied to their own ChannelProfile."""
    user_a = await _make_user(db_session)
    user_b = await _make_user(db_session)
    ch_a = await _make_channel(db_session, user_a)
    ch_b = await _make_channel(db_session, user_b)
    conn_a = await _make_connection(db_session, ch_a)
    await _make_connection(db_session, ch_b)

    r = await client.get(BASE, headers=_headers_for(user_a))
    assert r.status_code == 200, r.text
    items = r.json()
    assert isinstance(items, list)
    ids = {row["id"] for row in items}
    assert conn_a.id in ids
    assert all(row["channel_profile_id"] == ch_a.id for row in items), (
        "User A should never see User B's connections"
    )


async def test_admin_list_sees_all(
    client: AsyncClient, db_session: AsyncSession
):
    admin = await _make_user(db_session, role="admin")
    user_a = await _make_user(db_session)
    user_b = await _make_user(db_session)
    ch_a = await _make_channel(db_session, user_a)
    ch_b = await _make_channel(db_session, user_b)
    conn_a = await _make_connection(db_session, ch_a)
    conn_b = await _make_connection(db_session, ch_b)

    r = await client.get(BASE, headers=_headers_for(admin))
    assert r.status_code == 200, r.text
    ids = {row["id"] for row in r.json()}
    assert conn_a.id in ids
    assert conn_b.id in ids


async def test_user_channel_filter_rejects_foreign_channel(
    client: AsyncClient, db_session: AsyncSession
):
    """User A asking for ?channel_profile_id=<User B's channel> must 404."""
    user_a = await _make_user(db_session)
    user_b = await _make_user(db_session)
    ch_b = await _make_channel(db_session, user_b)
    await _make_connection(db_session, ch_b)

    r = await client.get(
        BASE,
        params={"channel_profile_id": ch_b.id},
        headers=_headers_for(user_a),
    )
    # ensure_owner_or_admin raises 403; audit requirement is "no leak" — 403 is
    # acceptable as long as the foreign data never flows.
    assert r.status_code in (403, 404), r.text


# ---------------------------------------------------------------------------
# Single-ID reads — cross-user IDs return 404
# ---------------------------------------------------------------------------


async def test_user_cannot_read_foreign_connection_by_id(
    client: AsyncClient, db_session: AsyncSession
):
    user_a = await _make_user(db_session)
    user_b = await _make_user(db_session)
    ch_b = await _make_channel(db_session, user_b)
    conn_b = await _make_connection(db_session, ch_b)

    r = await client.get(f"{BASE}/{conn_b.id}", headers=_headers_for(user_a))
    assert r.status_code == 404, r.text


async def test_admin_can_read_any_connection(
    client: AsyncClient, db_session: AsyncSession
):
    admin = await _make_user(db_session, role="admin")
    user_b = await _make_user(db_session)
    ch_b = await _make_channel(db_session, user_b)
    conn_b = await _make_connection(db_session, ch_b)

    r = await client.get(f"{BASE}/{conn_b.id}", headers=_headers_for(admin))
    assert r.status_code == 200, r.text
    assert r.json()["id"] == conn_b.id


async def test_user_cannot_read_foreign_connection_health(
    client: AsyncClient, db_session: AsyncSession
):
    user_a = await _make_user(db_session)
    user_b = await _make_user(db_session)
    ch_b = await _make_channel(db_session, user_b)
    conn_b = await _make_connection(db_session, ch_b)

    r = await client.get(
        f"{BASE}/{conn_b.id}/health", headers=_headers_for(user_a)
    )
    assert r.status_code == 404, r.text


async def test_user_cannot_read_foreign_connection_capability(
    client: AsyncClient, db_session: AsyncSession
):
    user_a = await _make_user(db_session)
    user_b = await _make_user(db_session)
    ch_b = await _make_channel(db_session, user_b)
    conn_b = await _make_connection(db_session, ch_b)

    r = await client.get(
        f"{BASE}/{conn_b.id}/capability", headers=_headers_for(user_a)
    )
    assert r.status_code == 404, r.text


# ---------------------------------------------------------------------------
# Mutations — PATCH / DELETE scoped
# ---------------------------------------------------------------------------


async def test_user_cannot_patch_foreign_connection(
    client: AsyncClient, db_session: AsyncSession
):
    user_a = await _make_user(db_session)
    user_b = await _make_user(db_session)
    ch_b = await _make_channel(db_session, user_b)
    conn_b = await _make_connection(db_session, ch_b, is_primary=False)

    r = await client.patch(
        f"{BASE}/{conn_b.id}",
        headers=_headers_for(user_a),
        json={"is_primary": True},
    )
    assert r.status_code == 404, r.text

    # Ensure the underlying record was NOT mutated.
    await db_session.refresh(conn_b)
    assert conn_b.is_primary is False


async def test_user_cannot_delete_foreign_connection(
    client: AsyncClient, db_session: AsyncSession
):
    user_a = await _make_user(db_session)
    user_b = await _make_user(db_session)
    ch_b = await _make_channel(db_session, user_b)
    conn_b = await _make_connection(db_session, ch_b)

    r = await client.delete(
        f"{BASE}/{conn_b.id}", headers=_headers_for(user_a)
    )
    assert r.status_code == 404, r.text

    # Still present.
    still = await db_session.get(PlatformConnection, conn_b.id)
    assert still is not None


async def test_owner_can_patch_own_connection(
    client: AsyncClient, db_session: AsyncSession
):
    user_a = await _make_user(db_session)
    ch_a = await _make_channel(db_session, user_a)
    conn_a = await _make_connection(db_session, ch_a, is_primary=False)

    r = await client.patch(
        f"{BASE}/{conn_a.id}",
        headers=_headers_for(user_a),
        json={"is_primary": True},
    )
    assert r.status_code == 200, r.text
    assert r.json()["is_primary"] is True


async def test_owner_can_delete_own_connection(
    client: AsyncClient, db_session: AsyncSession
):
    user_a = await _make_user(db_session)
    ch_a = await _make_channel(db_session, user_a)
    conn_a = await _make_connection(db_session, ch_a)
    conn_id = conn_a.id

    r = await client.delete(
        f"{BASE}/{conn_id}", headers=_headers_for(user_a)
    )
    assert r.status_code == 204, r.text

    # The endpoint used its own session; expire our local identity map so we
    # observe the actual DB row state (not the stale in-memory object).
    db_session.expire_all()
    gone = await db_session.get(PlatformConnection, conn_id)
    assert gone is None, "DELETE was issued; row must not survive"


async def test_admin_can_delete_any_connection(
    client: AsyncClient, db_session: AsyncSession
):
    admin = await _make_user(db_session, role="admin")
    user_b = await _make_user(db_session)
    ch_b = await _make_channel(db_session, user_b)
    conn_b = await _make_connection(db_session, ch_b)
    conn_id = conn_b.id

    r = await client.delete(
        f"{BASE}/{conn_id}", headers=_headers_for(admin)
    )
    assert r.status_code == 204, r.text
    db_session.expire_all()
    gone = await db_session.get(PlatformConnection, conn_id)
    assert gone is None, "Admin DELETE must remove the row"
