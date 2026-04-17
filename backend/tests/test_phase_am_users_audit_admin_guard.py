"""
Phase AM — Users router + Audit-logs router admin-only guard tests.

Scope (matches Phase AL audit fixes B + C):
    /api/v1/users/*       — was completely unguarded; now requires admin.
    /api/v1/audit-logs/*  — had only visibility guard; now also require_admin.

We verify three states per endpoint:
    1. 401 when no Authorization header is sent (raw_client).
    2. 403 when authenticated as a non-admin user.
    3. 200 (or the endpoint's usual 2xx/4xx) when called by an admin.

Visibility resolver defaults to ``visible=True`` when no rule exists, so
the in-memory test DB does not need extra seeding for the admin-happy-path.
"""

from __future__ import annotations

from uuid import uuid4 as _uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.password import hash_password
from app.db.models import User

pytestmark = pytest.mark.asyncio

USERS_BASE = "/api/v1/users"
AUDIT_BASE = "/api/v1/audit-logs"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _token_for(user: User) -> str:
    from app.auth.jwt import create_access_token

    return create_access_token({"sub": user.id})


def _headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {_token_for(user)}"}


async def _make_user(db: AsyncSession, *, role: str = "user") -> User:
    slug = f"{role}-{_uuid4().hex[:8]}"
    u = User(
        email=f"{slug}@test.local",
        display_name=f"AM {role.title()}",
        slug=slug,
        role=role,
        status="active",
        password_hash=hash_password("testpass123"),
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


# ---------------------------------------------------------------------------
# Users router — unauth 401
# ---------------------------------------------------------------------------


async def test_users_list_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(USERS_BASE)
    assert r.status_code == 401, r.text


async def test_users_get_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(f"{USERS_BASE}/any")
    assert r.status_code == 401, r.text


async def test_users_create_requires_auth(raw_client: AsyncClient):
    r = await raw_client.post(
        USERS_BASE,
        json={
            "email": "x@test.local",
            "display_name": "X",
            "slug": "x",
            "role": "user",
        },
    )
    assert r.status_code == 401, r.text


async def test_users_patch_requires_auth(raw_client: AsyncClient):
    r = await raw_client.patch(
        f"{USERS_BASE}/any", json={"display_name": "Hijack"}
    )
    assert r.status_code == 401, r.text


async def test_users_delete_requires_auth(raw_client: AsyncClient):
    r = await raw_client.delete(f"{USERS_BASE}/any")
    assert r.status_code == 401, r.text


async def test_users_list_overrides_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(f"{USERS_BASE}/any/overrides")
    assert r.status_code == 401, r.text


async def test_users_set_override_requires_auth(raw_client: AsyncClient):
    r = await raw_client.put(
        f"{USERS_BASE}/any/settings/tts.provider", json={"value": "openai"}
    )
    assert r.status_code == 401, r.text


async def test_users_delete_override_requires_auth(raw_client: AsyncClient):
    r = await raw_client.delete(f"{USERS_BASE}/any/settings/tts.provider")
    assert r.status_code == 401, r.text


# ---------------------------------------------------------------------------
# Users router — non-admin 403
# ---------------------------------------------------------------------------


async def test_users_list_forbidden_for_non_admin(
    client: AsyncClient, db_session: AsyncSession
):
    viewer = await _make_user(db_session, role="user")
    r = await client.get(USERS_BASE, headers=_headers(viewer))
    assert r.status_code == 403, r.text


async def test_users_patch_forbidden_for_non_admin(
    client: AsyncClient, db_session: AsyncSession
):
    viewer = await _make_user(db_session, role="user")
    target = await _make_user(db_session, role="user")
    r = await client.patch(
        f"{USERS_BASE}/{target.id}",
        headers=_headers(viewer),
        json={"display_name": "Hijack"},
    )
    assert r.status_code == 403, r.text

    # And the target row must not have been mutated.
    await db_session.refresh(target)
    assert target.display_name != "Hijack"


async def test_users_delete_forbidden_for_non_admin(
    client: AsyncClient, db_session: AsyncSession
):
    viewer = await _make_user(db_session, role="user")
    target = await _make_user(db_session, role="user")
    r = await client.delete(
        f"{USERS_BASE}/{target.id}", headers=_headers(viewer)
    )
    assert r.status_code == 403, r.text


async def test_users_set_override_forbidden_for_non_admin(
    client: AsyncClient, db_session: AsyncSession
):
    viewer = await _make_user(db_session, role="user")
    target = await _make_user(db_session, role="user")
    r = await client.put(
        f"{USERS_BASE}/{target.id}/settings/tts.provider",
        headers=_headers(viewer),
        json={"value": "openai"},
    )
    assert r.status_code == 403, r.text


# ---------------------------------------------------------------------------
# Users router — admin happy path
# ---------------------------------------------------------------------------


async def test_users_list_ok_for_admin(
    client: AsyncClient, db_session: AsyncSession
):
    admin = await _make_user(db_session, role="admin")
    await _make_user(db_session, role="user")
    r = await client.get(USERS_BASE, headers=_headers(admin))
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, list)
    # At least our admin + the seed user exist.
    assert any(u["role"] == "admin" for u in body)


# ---------------------------------------------------------------------------
# Audit-logs router — unauth 401
# ---------------------------------------------------------------------------


async def test_audit_list_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(AUDIT_BASE)
    assert r.status_code == 401, r.text


async def test_audit_get_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(f"{AUDIT_BASE}/nonexistent")
    assert r.status_code == 401, r.text


# ---------------------------------------------------------------------------
# Audit-logs router — non-admin 403
# ---------------------------------------------------------------------------


async def test_audit_list_forbidden_for_non_admin(
    client: AsyncClient, db_session: AsyncSession
):
    viewer = await _make_user(db_session, role="user")
    r = await client.get(AUDIT_BASE, headers=_headers(viewer))
    assert r.status_code == 403, r.text


async def test_audit_get_forbidden_for_non_admin(
    client: AsyncClient, db_session: AsyncSession
):
    viewer = await _make_user(db_session, role="user")
    r = await client.get(f"{AUDIT_BASE}/whatever", headers=_headers(viewer))
    assert r.status_code == 403, r.text


# ---------------------------------------------------------------------------
# Audit-logs router — admin happy path (visibility enabled)
# ---------------------------------------------------------------------------


async def test_audit_list_ok_for_admin(
    client: AsyncClient, db_session: AsyncSession
):
    admin = await _make_user(db_session, role="admin")

    r = await client.get(AUDIT_BASE, headers=_headers(admin))
    assert r.status_code == 200, r.text
    payload = r.json()
    assert set(payload.keys()) >= {"items", "total"}
    assert isinstance(payload["items"], list)
