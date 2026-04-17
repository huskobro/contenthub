"""
Phase AN-1 — Automation Policies + Operations Inbox ownership guard tests.

Scope (matches Phase AL audit finding + AM-2b follow-up):
    /api/v1/automation-policies/*   — was authenticated but NOT ownership-enforced.
    /api/v1/operations-inbox/*      — same.

We verify:
    - Unauth (no Bearer) -> 401.
    - Non-admin cross-user read/write -> 403 (single resource) or filtered
      empty list (collection); non-admin **cannot** see another user's rows
      even by passing owner_user_id=X in the query string.
    - Admin happy path -> 200, sees all rows.
    - Non-admin create: payload `owner_user_id` spoof is ignored; the row
      ends up owned by the caller.
"""

from __future__ import annotations

from uuid import uuid4 as _uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.password import hash_password
from app.db.models import (
    AutomationPolicy,
    ChannelProfile,
    OperationsInboxItem,
    User,
)

pytestmark = pytest.mark.asyncio


POLICY_BASE = "/api/v1/automation-policies"
INBOX_BASE = "/api/v1/operations-inbox"


# ---------------------------------------------------------------------------
# Helpers (same pattern as test_phase_am_users_audit_admin_guard.py)
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
        display_name=f"AN {role.title()}",
        slug=slug,
        role=role,
        status="active",
        password_hash=hash_password("testpass123"),
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


async def _make_channel(db: AsyncSession, *, owner_id: str) -> ChannelProfile:
    ch = ChannelProfile(
        user_id=owner_id,
        profile_name=f"Ch-{_uuid4().hex[:6]}",
        channel_slug=f"ch-{_uuid4().hex[:8]}",
    )
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch


async def _make_policy(
    db: AsyncSession,
    *,
    owner_id: str,
    channel_profile_id: str,
    name: str = "Policy",
) -> AutomationPolicy:
    p = AutomationPolicy(
        channel_profile_id=channel_profile_id,
        owner_user_id=owner_id,
        name=name,
        is_enabled=False,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


async def _make_inbox(
    db: AsyncSession,
    *,
    owner_id: str | None,
    channel_profile_id: str | None = None,
    title: str = "item",
) -> OperationsInboxItem:
    it = OperationsInboxItem(
        item_type="publish_review",
        channel_profile_id=channel_profile_id,
        owner_user_id=owner_id,
        title=title,
    )
    db.add(it)
    await db.commit()
    await db.refresh(it)
    return it


# ---------------------------------------------------------------------------
# Automation policies — unauth
# ---------------------------------------------------------------------------


async def test_policies_list_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(POLICY_BASE)
    assert r.status_code == 401, r.text


async def test_policies_get_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(f"{POLICY_BASE}/any-id")
    assert r.status_code == 401, r.text


async def test_policies_patch_requires_auth(raw_client: AsyncClient):
    r = await raw_client.patch(f"{POLICY_BASE}/any-id", json={"is_enabled": True})
    assert r.status_code == 401, r.text


async def test_policies_create_requires_auth(raw_client: AsyncClient):
    r = await raw_client.post(POLICY_BASE, json={"channel_profile_id": "x"})
    assert r.status_code == 401, r.text


# ---------------------------------------------------------------------------
# Automation policies — non-admin cross-user defense
# ---------------------------------------------------------------------------


async def test_policies_list_non_admin_only_sees_own_rows(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    """Non-admin must not see another user's policies even if they
    specify `owner_user_id=<other>` in the query string."""
    owner = await _make_user(db_session)
    attacker = await _make_user(db_session)
    ch_owner = await _make_channel(db_session, owner_id=owner.id)
    ch_attacker = await _make_channel(db_session, owner_id=attacker.id)
    await _make_policy(db_session, owner_id=owner.id, channel_profile_id=ch_owner.id)
    await _make_policy(
        db_session, owner_id=attacker.id, channel_profile_id=ch_attacker.id,
    )

    # Snapshot attacker headers before any endpoint-side commit expires
    # our db_session's copy of the user row.
    headers = _headers(attacker)

    # Try to spoof: ask for owner's policies.
    r = await raw_client.get(
        POLICY_BASE, headers=headers, params={"owner_user_id": owner.id},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    # Filter must collapse to attacker's rows only.
    assert all(row["owner_user_id"] == attacker.id for row in body), body
    assert len(body) == 1


async def test_policies_get_non_admin_cannot_read_other_user(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    owner = await _make_user(db_session)
    attacker = await _make_user(db_session)
    ch = await _make_channel(db_session, owner_id=owner.id)
    policy = await _make_policy(
        db_session, owner_id=owner.id, channel_profile_id=ch.id,
    )
    headers = _headers(attacker)

    r = await raw_client.get(f"{POLICY_BASE}/{policy.id}", headers=headers)
    assert r.status_code == 403, r.text


async def test_policies_patch_non_admin_cannot_mutate_other_user(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    owner = await _make_user(db_session)
    attacker = await _make_user(db_session)
    ch = await _make_channel(db_session, owner_id=owner.id)
    policy = await _make_policy(
        db_session, owner_id=owner.id, channel_profile_id=ch.id,
    )
    headers = _headers(attacker)

    r = await raw_client.patch(
        f"{POLICY_BASE}/{policy.id}",
        headers=headers,
        json={"is_enabled": True, "max_daily_posts": 999},
    )
    assert r.status_code == 403, r.text


async def test_policies_evaluate_non_admin_cannot_read_other_user(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    owner = await _make_user(db_session)
    attacker = await _make_user(db_session)
    ch = await _make_channel(db_session, owner_id=owner.id)
    policy = await _make_policy(
        db_session, owner_id=owner.id, channel_profile_id=ch.id,
    )
    headers = _headers(attacker)

    r = await raw_client.get(
        f"{POLICY_BASE}/{policy.id}/evaluate", headers=headers,
    )
    assert r.status_code == 403, r.text


async def test_policies_by_channel_non_admin_cannot_read_other_user(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    owner = await _make_user(db_session)
    attacker = await _make_user(db_session)
    ch = await _make_channel(db_session, owner_id=owner.id)
    await _make_policy(
        db_session, owner_id=owner.id, channel_profile_id=ch.id,
    )
    headers = _headers(attacker)

    r = await raw_client.get(
        f"{POLICY_BASE}/by-channel/{ch.id}", headers=headers,
    )
    assert r.status_code == 403, r.text


# ---------------------------------------------------------------------------
# Automation policies — create spoof defense
# ---------------------------------------------------------------------------


async def test_policies_create_non_admin_owner_spoof_is_ignored(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    """Non-admin caller posts owner_user_id=<someone-else>; backend pins it
    to the caller's id."""
    caller = await _make_user(db_session)
    victim = await _make_user(db_session)
    ch = await _make_channel(db_session, owner_id=caller.id)
    headers = _headers(caller)

    r = await raw_client.post(
        POLICY_BASE,
        headers=headers,
        json={
            "channel_profile_id": ch.id,
            "owner_user_id": victim.id,  # spoof attempt
            "name": "should-pin-to-caller",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["owner_user_id"] == caller.id, body


# ---------------------------------------------------------------------------
# Automation policies — admin happy path
# ---------------------------------------------------------------------------


async def test_policies_list_admin_sees_all(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    admin = await _make_user(db_session, role="admin")
    u1 = await _make_user(db_session)
    u2 = await _make_user(db_session)
    ch1 = await _make_channel(db_session, owner_id=u1.id)
    ch2 = await _make_channel(db_session, owner_id=u2.id)
    await _make_policy(db_session, owner_id=u1.id, channel_profile_id=ch1.id)
    await _make_policy(db_session, owner_id=u2.id, channel_profile_id=ch2.id)
    headers = _headers(admin)

    r = await raw_client.get(POLICY_BASE, headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    owners = {row["owner_user_id"] for row in body}
    assert u1.id in owners and u2.id in owners, owners


async def test_policies_admin_can_read_any(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    admin = await _make_user(db_session, role="admin")
    other = await _make_user(db_session)
    ch = await _make_channel(db_session, owner_id=other.id)
    policy = await _make_policy(
        db_session, owner_id=other.id, channel_profile_id=ch.id,
    )
    headers = _headers(admin)

    r = await raw_client.get(f"{POLICY_BASE}/{policy.id}", headers=headers)
    assert r.status_code == 200, r.text


async def test_policies_non_admin_happy_path_own_resource(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    owner = await _make_user(db_session)
    ch = await _make_channel(db_session, owner_id=owner.id)
    policy = await _make_policy(
        db_session, owner_id=owner.id, channel_profile_id=ch.id,
    )
    headers = _headers(owner)

    # GET own
    r = await raw_client.get(f"{POLICY_BASE}/{policy.id}", headers=headers)
    assert r.status_code == 200, r.text

    # PATCH own
    r = await raw_client.patch(
        f"{POLICY_BASE}/{policy.id}",
        headers=headers,
        json={"is_enabled": True},
    )
    assert r.status_code == 200, r.text
    assert r.json()["is_enabled"] is True


# ---------------------------------------------------------------------------
# Operations inbox — unauth
# ---------------------------------------------------------------------------


async def test_inbox_list_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(INBOX_BASE)
    assert r.status_code == 401, r.text


async def test_inbox_get_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(f"{INBOX_BASE}/any")
    assert r.status_code == 401, r.text


async def test_inbox_patch_requires_auth(raw_client: AsyncClient):
    r = await raw_client.patch(f"{INBOX_BASE}/any", json={"status": "resolved"})
    assert r.status_code == 401, r.text


async def test_inbox_count_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(f"{INBOX_BASE}/count")
    assert r.status_code == 401, r.text


# ---------------------------------------------------------------------------
# Operations inbox — non-admin cross-user defense
# ---------------------------------------------------------------------------


async def test_inbox_list_non_admin_only_sees_own_rows(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    owner = await _make_user(db_session)
    attacker = await _make_user(db_session)
    await _make_inbox(db_session, owner_id=owner.id, title="owners")
    await _make_inbox(db_session, owner_id=attacker.id, title="attackers")
    headers = _headers(attacker)

    # Spoof: pass owner_user_id=<other>
    r = await raw_client.get(
        INBOX_BASE, headers=headers, params={"owner_user_id": owner.id},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert all(row["owner_user_id"] == attacker.id for row in body), body


async def test_inbox_get_non_admin_cannot_read_other_user(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    owner = await _make_user(db_session)
    attacker = await _make_user(db_session)
    item = await _make_inbox(db_session, owner_id=owner.id)
    headers = _headers(attacker)

    r = await raw_client.get(f"{INBOX_BASE}/{item.id}", headers=headers)
    assert r.status_code == 403, r.text


async def test_inbox_patch_non_admin_cannot_mutate_other_user(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    owner = await _make_user(db_session)
    attacker = await _make_user(db_session)
    item = await _make_inbox(db_session, owner_id=owner.id)
    headers = _headers(attacker)

    r = await raw_client.patch(
        f"{INBOX_BASE}/{item.id}", headers=headers, json={"status": "resolved"},
    )
    assert r.status_code == 403, r.text


async def test_inbox_count_non_admin_scoped_to_self(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    """Count endpoint: non-admin caller only sees their own open count,
    even if owner_user_id=<other> is provided."""
    owner = await _make_user(db_session)
    attacker = await _make_user(db_session)
    # 2 open items for the owner, 0 for attacker
    await _make_inbox(db_session, owner_id=owner.id, title="o1")
    await _make_inbox(db_session, owner_id=owner.id, title="o2")
    headers = _headers(attacker)

    r = await raw_client.get(
        f"{INBOX_BASE}/count", headers=headers,
        params={"owner_user_id": owner.id},
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"count": 0}


async def test_inbox_create_non_admin_owner_spoof_is_ignored(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    caller = await _make_user(db_session)
    victim = await _make_user(db_session)
    headers = _headers(caller)

    r = await raw_client.post(
        INBOX_BASE,
        headers=headers,
        json={
            "item_type": "publish_review",
            "owner_user_id": victim.id,  # spoof
            "title": "should-pin-to-caller",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["owner_user_id"] == caller.id, body


# ---------------------------------------------------------------------------
# Operations inbox — admin happy path
# ---------------------------------------------------------------------------


async def test_inbox_admin_sees_all(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    admin = await _make_user(db_session, role="admin")
    u1 = await _make_user(db_session)
    u2 = await _make_user(db_session)
    await _make_inbox(db_session, owner_id=u1.id, title="a")
    await _make_inbox(db_session, owner_id=u2.id, title="b")
    headers = _headers(admin)

    r = await raw_client.get(INBOX_BASE, headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    owners = {row["owner_user_id"] for row in body}
    assert u1.id in owners and u2.id in owners, owners


async def test_inbox_non_admin_happy_path_own_resource(
    raw_client: AsyncClient, db_session: AsyncSession,
):
    owner = await _make_user(db_session)
    item = await _make_inbox(db_session, owner_id=owner.id)
    headers = _headers(owner)

    # GET own
    r = await raw_client.get(f"{INBOX_BASE}/{item.id}", headers=headers)
    assert r.status_code == 200, r.text

    # PATCH own
    r = await raw_client.patch(
        f"{INBOX_BASE}/{item.id}", headers=headers,
        json={"status": "resolved"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "resolved"
