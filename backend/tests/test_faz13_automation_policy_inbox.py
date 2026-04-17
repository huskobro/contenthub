"""
Faz 13 — Automation Policy + Checkpoint Model + Operations Inbox tests.

Tests:
1. AutomationPolicy create with V2 fields
2. AutomationPolicy update checkpoint modes
3. Checkpoint mode validation (reject invalid modes)
4. Policy evaluation helper — disabled mode
5. Policy evaluation helper — manual_review mode
6. Policy evaluation helper — automatic mode
7. Operations Inbox item create
8. Operations Inbox item status update + resolved_at auto-set
9. Inbox list filtering by owner_user_id
10. Policy by-channel endpoint + full checkpoint evaluate endpoint
"""

import json
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

POLICY_BASE = "/api/v1/automation-policies"
INBOX_BASE = "/api/v1/operations-inbox"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _ensure_user(db_session: AsyncSession) -> str:
    """Create a minimal user and return its id."""
    from app.db.models import User
    import uuid
    uid = str(uuid.uuid4())
    slug = f"faz13-{uid[:8]}"
    user = User(id=uid, email=f"{slug}@test.local", display_name="Faz13 Test", slug=slug)
    db_session.add(user)
    await db_session.commit()
    return uid


async def _ensure_channel(db_session: AsyncSession) -> str:
    """Create a minimal user + channel profile and return channel id."""
    from app.db.models import ChannelProfile
    user_id = await _ensure_user(db_session)
    ch = ChannelProfile(
        user_id=user_id,
        profile_name="Faz13 Test Kanal",
        channel_slug=f"faz13-{__import__('uuid').uuid4().hex[:8]}",
    )
    db_session.add(ch)
    await db_session.commit()
    await db_session.refresh(ch)
    return ch.id


# ---------------------------------------------------------------------------
# 1. AutomationPolicy create with V2 fields
# ---------------------------------------------------------------------------

async def test_policy_create_v2(client: AsyncClient, db_session: AsyncSession, user_headers: dict):
    """Create policy with V2 checkpoint fields."""
    channel_id = await _ensure_channel(db_session)
    resp = await client.post(POLICY_BASE, json={
        "channel_profile_id": channel_id,
        "name": "Test Politika",
        "is_enabled": True,
        "source_scan_mode": "automatic",
        "draft_generation_mode": "manual_review",
        "render_mode": "disabled",
        "publish_mode": "manual_review",
        "post_publish_mode": "disabled",
        "max_daily_posts": 5,
    },
    headers=user_headers,)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Politika"
    assert data["is_enabled"] is True
    assert data["source_scan_mode"] == "automatic"
    assert data["draft_generation_mode"] == "manual_review"
    assert data["render_mode"] == "disabled"
    assert data["publish_mode"] == "manual_review"
    assert data["post_publish_mode"] == "disabled"
    assert data["max_daily_posts"] == 5


# ---------------------------------------------------------------------------
# 2. AutomationPolicy update checkpoint modes
# ---------------------------------------------------------------------------

async def test_policy_update_modes(client: AsyncClient, db_session: AsyncSession, user_headers: dict):
    """Update individual checkpoint modes."""
    channel_id = await _ensure_channel(db_session)
    create_resp = await client.post(POLICY_BASE, json={
        "channel_profile_id": channel_id,
        "name": "Update Test",
    },
    headers=user_headers,)
    pid = create_resp.json()["id"]

    resp = await client.patch(f"{POLICY_BASE}/{pid}", json={
        "source_scan_mode": "automatic",
        "publish_mode": "automatic",
    },
    headers=user_headers,)
    assert resp.status_code == 200
    data = resp.json()
    assert data["source_scan_mode"] == "automatic"
    assert data["publish_mode"] == "automatic"
    # Others unchanged
    assert data["render_mode"] == "disabled"


# ---------------------------------------------------------------------------
# 3. Checkpoint mode enum validation
# ---------------------------------------------------------------------------

async def test_checkpoint_mode_validation(db_session: AsyncSession):
    """Service rejects invalid checkpoint mode values."""
    from app.automation.service import create_automation_policy
    from app.automation.schemas import AutomationPolicyCreate

    channel_id = await _ensure_channel(db_session)
    payload = AutomationPolicyCreate(
        channel_profile_id=channel_id,
        source_scan_mode="invalid_mode",
    )
    with pytest.raises(ValueError, match="Gecersiz mode"):
        await create_automation_policy(db_session, payload)


# ---------------------------------------------------------------------------
# 4. Policy evaluation — disabled mode
# ---------------------------------------------------------------------------

async def test_evaluate_disabled(db_session: AsyncSession):
    """Disabled checkpoint returns should_proceed=False, requires_review=False."""
    from app.automation.service import evaluate_checkpoint, create_automation_policy
    from app.automation.schemas import AutomationPolicyCreate

    channel_id = await _ensure_channel(db_session)
    policy = await create_automation_policy(db_session, AutomationPolicyCreate(
        channel_profile_id=channel_id,
        is_enabled=True,
        render_mode="disabled",
    ))
    decision = evaluate_checkpoint(policy, "render")
    assert decision.mode == "disabled"
    assert decision.should_proceed is False
    assert decision.requires_review is False


# ---------------------------------------------------------------------------
# 5. Policy evaluation — manual_review mode
# ---------------------------------------------------------------------------

async def test_evaluate_manual_review(db_session: AsyncSession):
    """manual_review returns should_proceed=False, requires_review=True."""
    from app.automation.service import evaluate_checkpoint, create_automation_policy
    from app.automation.schemas import AutomationPolicyCreate

    channel_id = await _ensure_channel(db_session)
    policy = await create_automation_policy(db_session, AutomationPolicyCreate(
        channel_profile_id=channel_id,
        is_enabled=True,
        publish_mode="manual_review",
    ))
    decision = evaluate_checkpoint(policy, "publish")
    assert decision.mode == "manual_review"
    assert decision.should_proceed is False
    assert decision.requires_review is True


# ---------------------------------------------------------------------------
# 6. Policy evaluation — automatic mode
# ---------------------------------------------------------------------------

async def test_evaluate_automatic(db_session: AsyncSession):
    """automatic returns should_proceed=True, requires_review=False."""
    from app.automation.service import evaluate_checkpoint, create_automation_policy
    from app.automation.schemas import AutomationPolicyCreate

    channel_id = await _ensure_channel(db_session)
    policy = await create_automation_policy(db_session, AutomationPolicyCreate(
        channel_profile_id=channel_id,
        is_enabled=True,
        source_scan_mode="automatic",
    ))
    decision = evaluate_checkpoint(policy, "source_scan")
    assert decision.mode == "automatic"
    assert decision.should_proceed is True
    assert decision.requires_review is False


# ---------------------------------------------------------------------------
# 7. Operations Inbox item create
# ---------------------------------------------------------------------------

async def test_inbox_item_create(client: AsyncClient, user_headers: dict):
    """Create an inbox item."""
    resp = await client.post(INBOX_BASE, json={
        "item_type": "publish_review",
        "title": "Yayin onay bekliyor",
        "reason": "Publish record pending review",
        "priority": "high",
        "action_url": "/admin/publish/test-123",
    },
    headers=user_headers,)
    assert resp.status_code == 201
    data = resp.json()
    assert data["item_type"] == "publish_review"
    assert data["title"] == "Yayin onay bekliyor"
    assert data["status"] == "open"
    assert data["priority"] == "high"


# ---------------------------------------------------------------------------
# 8. Inbox item status update + resolved_at auto-set
# ---------------------------------------------------------------------------

async def test_inbox_resolve_sets_timestamp(client: AsyncClient, user_headers: dict):
    """Resolving an inbox item auto-sets resolved_at."""
    create_resp = await client.post(INBOX_BASE, json={
        "item_type": "render_failure",
        "title": "Render basarisiz",
    },
    headers=user_headers,)
    item_id = create_resp.json()["id"]

    resp = await client.patch(f"{INBOX_BASE}/{item_id}", json={"status": "resolved"}, headers=user_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "resolved"
    assert data["resolved_at"] is not None


# ---------------------------------------------------------------------------
# 9. Inbox list filtering by owner_user_id
# ---------------------------------------------------------------------------

async def test_inbox_filter_by_owner(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """Inbox list filters by owner_user_id.

    Phase AN-1: ownership enforced. Only an admin caller can legitimately
    filter *another* user's inbox items via ``owner_user_id``. A non-admin
    caller would have its scope pinned to its own id (covered by
    ``test_phase_an_automation_policies_guard::test_inbox_list_non_admin_only_sees_own_rows``).
    """
    owner = await _ensure_user(db_session)
    other = await _ensure_user(db_session)

    await client.post(INBOX_BASE, json={
        "item_type": "comment_reply",
        "title": "Yorum cevabi bekliyor",
        "owner_user_id": owner,
    },
    headers=admin_headers,)
    await client.post(INBOX_BASE, json={
        "item_type": "post_action",
        "title": "Post gonderimi",
        "owner_user_id": other,
    },
    headers=admin_headers,)

    resp = await client.get(INBOX_BASE, params={"owner_user_id": owner}, headers=admin_headers)
    assert resp.status_code == 200
    items = resp.json()
    for item in items:
        assert item["owner_user_id"] == owner


# ---------------------------------------------------------------------------
# 10. Policy by-channel + evaluate endpoint
# ---------------------------------------------------------------------------

async def test_policy_by_channel_and_evaluate(client: AsyncClient, db_session: AsyncSession, user_headers: dict):
    """by-channel endpoint returns policy; evaluate returns all checkpoint decisions."""
    channel_id = await _ensure_channel(db_session)
    create_resp = await client.post(POLICY_BASE, json={
        "channel_profile_id": channel_id,
        "name": "Evaluate Test",
        "is_enabled": True,
        "source_scan_mode": "automatic",
        "draft_generation_mode": "manual_review",
        "render_mode": "disabled",
        "publish_mode": "manual_review",
        "post_publish_mode": "automatic",
    },
    headers=user_headers,)
    pid = create_resp.json()["id"]

    # by-channel
    resp = await client.get(f"{POLICY_BASE}/by-channel/{channel_id}", headers=user_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == pid

    # evaluate
    resp2 = await client.get(f"{POLICY_BASE}/{pid}/evaluate", headers=user_headers)
    assert resp2.status_code == 200
    decisions = resp2.json()
    assert len(decisions) == 5
    modes = {d["checkpoint"]: d["mode"] for d in decisions}
    assert modes["source_scan"] == "automatic"
    assert modes["draft_generation"] == "manual_review"
    assert modes["render"] == "disabled"
    assert modes["publish"] == "manual_review"
    assert modes["post_publish"] == "automatic"
