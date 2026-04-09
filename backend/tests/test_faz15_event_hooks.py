"""
Faz 15 — Event Hooks + Automatic Inbox Population + Policy Trigger Bridge tests.

Tests:
1. emit_operation_event creates inbox item
2. Duplicate inbox guard prevents second item
3. Publish submit_for_review creates publish_review inbox item
4. Publish mark_failed creates publish_failure inbox item
5. Render/job failure creates render_failure inbox item
6. Source scan failure creates source_scan_error inbox item
7. evaluate_and_emit with manual_review creates inbox item
8. evaluate_and_emit with automatic mode does NOT create inbox item
9. Calendar shows newly created inbox items
10. Duplicate guard allows after resolution
11. User/admin scope — inbox items have correct entity refs
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

INBOX_BASE = "/api/v1/operations-inbox"
POLICY_BASE = "/api/v1/automation-policies"
CAL_BASE = "/api/v1/calendar/events"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _ensure_user(db: AsyncSession) -> str:
    from app.db.models import User
    uid = _uuid()
    slug = f"faz15-{uid[:8]}"
    user = User(id=uid, email=f"{slug}@test.local", display_name="Faz15 Test", slug=slug)
    db.add(user)
    await db.commit()
    return uid


async def _ensure_channel(db: AsyncSession, user_id: Optional[str] = None) -> str:
    from app.db.models import ChannelProfile
    if not user_id:
        user_id = await _ensure_user(db)
    ch = ChannelProfile(
        user_id=user_id,
        profile_name="Faz15 Kanal",
        channel_slug=f"faz15-{uuid.uuid4().hex[:8]}",
    )
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch.id


async def _ensure_job(db: AsyncSession, status: str = "running", owner_id: Optional[str] = None) -> str:
    from app.db.models import Job
    jid = _uuid()
    job = Job(id=jid, module_type="standard_video", status=status, owner_id=owner_id)
    db.add(job)
    await db.commit()
    return jid


async def _ensure_publish_record(db: AsyncSession, job_id: str, status: str = "draft") -> str:
    from app.db.models import PublishRecord
    rid = _uuid()
    rec = PublishRecord(
        id=rid, job_id=job_id, content_ref_type="standard_video",
        content_ref_id=_uuid(), platform="youtube", status=status,
    )
    db.add(rec)
    await db.commit()
    return rid


# ---------------------------------------------------------------------------
# 1. emit_operation_event creates inbox item
# ---------------------------------------------------------------------------

async def test_emit_creates_inbox_item(db_session: AsyncSession):
    """emit_operation_event creates an inbox item."""
    from app.automation.event_hooks import emit_operation_event

    item = await emit_operation_event(
        db_session,
        item_type="publish_review",
        title="Test item",
        reason="Test reason",
        related_entity_type="publish_record",
        related_entity_id=_uuid(),
    )
    await db_session.commit()
    assert item is not None
    assert item.item_type == "publish_review"
    assert item.title == "Test item"
    assert item.status == "open"


# ---------------------------------------------------------------------------
# 2. Duplicate inbox guard
# ---------------------------------------------------------------------------

async def test_duplicate_guard(db_session: AsyncSession):
    """Second emit for same entity+type returns None (duplicate guard)."""
    from app.automation.event_hooks import emit_operation_event

    entity_id = _uuid()
    item1 = await emit_operation_event(
        db_session,
        item_type="publish_failure",
        title="First failure",
        related_entity_type="publish_record",
        related_entity_id=entity_id,
    )
    await db_session.commit()
    assert item1 is not None

    item2 = await emit_operation_event(
        db_session,
        item_type="publish_failure",
        title="Second failure",
        related_entity_type="publish_record",
        related_entity_id=entity_id,
    )
    assert item2 is None  # duplicate guard


# ---------------------------------------------------------------------------
# 3. Publish submit_for_review creates inbox item
# ---------------------------------------------------------------------------

async def test_publish_review_creates_inbox(db_session: AsyncSession):
    """submit_for_review auto-creates publish_review inbox item."""
    from app.publish.service import submit_for_review

    job_id = await _ensure_job(db_session, status="completed")
    rec_id = await _ensure_publish_record(db_session, job_id, status="draft")

    # Submit for review via service
    await submit_for_review(session=db_session, record_id=rec_id)

    # Check inbox via direct DB query
    from app.db.models import OperationsInboxItem
    from sqlalchemy import select
    q = select(OperationsInboxItem).where(
        OperationsInboxItem.related_entity_id == rec_id,
        OperationsInboxItem.item_type == "publish_review",
    )
    result = await db_session.execute(q)
    item = result.scalar_one_or_none()
    assert item is not None
    assert item.item_type == "publish_review"
    assert item.priority == "high"


# ---------------------------------------------------------------------------
# 4. Publish mark_failed creates inbox item
# ---------------------------------------------------------------------------

async def test_publish_failure_creates_inbox(db_session: AsyncSession):
    """mark_failed auto-creates publish_failure inbox item."""
    from app.publish.service import mark_failed

    job_id = await _ensure_job(db_session, status="completed")
    rec_id = await _ensure_publish_record(db_session, job_id, status="publishing")

    # Mark failed via service
    await mark_failed(
        session=db_session,
        record_id=rec_id,
        error_message="YouTube API rate limit exceeded",
    )

    # Check inbox via direct DB query
    from app.db.models import OperationsInboxItem
    from sqlalchemy import select
    q = select(OperationsInboxItem).where(
        OperationsInboxItem.related_entity_id == rec_id,
        OperationsInboxItem.item_type == "publish_failure",
    )
    result = await db_session.execute(q)
    item = result.scalar_one_or_none()
    assert item is not None
    assert item.priority == "urgent"
    assert "rate limit" in item.reason.lower()


# ---------------------------------------------------------------------------
# 5. Job failure creates render_failure inbox item
# ---------------------------------------------------------------------------

async def test_job_failure_creates_inbox(db_session: AsyncSession):
    """Job transition to failed creates render_failure inbox item."""
    from app.jobs.service import transition_job_status

    job_id = await _ensure_job(db_session, status="running")
    await transition_job_status(
        db_session, job_id, "failed",
        last_error="Remotion render crashed: out of memory",
    )

    # Check inbox via direct DB query
    from app.db.models import OperationsInboxItem
    from sqlalchemy import select
    q = select(OperationsInboxItem).where(
        OperationsInboxItem.related_entity_id == job_id,
        OperationsInboxItem.item_type == "render_failure",
    )
    result = await db_session.execute(q)
    item = result.scalar_one_or_none()
    assert item is not None
    assert "basarisiz" in item.title.lower()
    assert "out of memory" in item.reason.lower()


# ---------------------------------------------------------------------------
# 6. Source scan failure creates inbox item
# ---------------------------------------------------------------------------

async def test_scan_failure_creates_inbox(db_session: AsyncSession):
    """Source scan failure creates source_scan_error inbox item."""
    from app.db.models import NewsSource, SourceScan
    from app.source_scans.scan_engine import _mark_failed

    # Create source + scan
    src = NewsSource(
        name="Bad Source", source_type="rss",
        feed_url="http://invalid.local/rss",
    )
    db_session.add(src)
    await db_session.commit()
    await db_session.refresh(src)

    scan = SourceScan(source_id=src.id, status="running", scan_mode="manual")
    db_session.add(scan)
    await db_session.commit()
    await db_session.refresh(scan)

    await _mark_failed(db_session, scan, "feedparser: connection refused")

    # Check inbox
    from app.db.models import OperationsInboxItem
    from sqlalchemy import select
    q = select(OperationsInboxItem).where(
        OperationsInboxItem.related_entity_id == scan.id,
        OperationsInboxItem.item_type == "source_scan_error",
    )
    result = await db_session.execute(q)
    item = result.scalar_one_or_none()
    assert item is not None
    assert "connection refused" in item.reason.lower()


# ---------------------------------------------------------------------------
# 7. evaluate_and_emit with manual_review
# ---------------------------------------------------------------------------

async def test_policy_bridge_manual_review(client: AsyncClient, db_session: AsyncSession):
    """evaluate_and_emit creates inbox item when checkpoint is manual_review."""
    from app.automation.event_hooks import evaluate_and_emit

    ch_id = await _ensure_channel(db_session)
    # Create policy with publish=manual_review
    await client.post(POLICY_BASE, json={
        "channel_profile_id": ch_id,
        "name": "Bridge Test",
        "is_enabled": True,
        "publish_mode": "manual_review",
    })

    entity_id = _uuid()
    item = await evaluate_and_emit(
        db_session,
        channel_profile_id=ch_id,
        checkpoint="publish",
        item_type="publish_review",
        title="Policy bridge test",
        related_entity_type="publish_record",
        related_entity_id=entity_id,
    )
    await db_session.commit()
    assert item is not None
    assert item.item_type == "publish_review"


# ---------------------------------------------------------------------------
# 8. evaluate_and_emit with automatic mode — no inbox
# ---------------------------------------------------------------------------

async def test_policy_bridge_automatic_no_inbox(client: AsyncClient, db_session: AsyncSession):
    """evaluate_and_emit does NOT create inbox item when checkpoint is automatic."""
    from app.automation.event_hooks import evaluate_and_emit

    ch_id = await _ensure_channel(db_session)
    await client.post(POLICY_BASE, json={
        "channel_profile_id": ch_id,
        "name": "Auto Test",
        "is_enabled": True,
        "publish_mode": "automatic",
    })

    item = await evaluate_and_emit(
        db_session,
        channel_profile_id=ch_id,
        checkpoint="publish",
        item_type="publish_review",
        title="Should not be created",
        related_entity_type="publish_record",
        related_entity_id=_uuid(),
    )
    assert item is None  # automatic → no review needed


# ---------------------------------------------------------------------------
# 9. Calendar shows newly created inbox items
# ---------------------------------------------------------------------------

async def test_calendar_shows_new_inbox_items(client: AsyncClient, db_session: AsyncSession):
    """Automatically created inbox items are visible in calendar cross-ref."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    from app.db.models import ContentProject
    proj_id = _uuid()
    proj = ContentProject(
        id=proj_id, user_id=user_id, channel_profile_id=ch_id,
        module_type="standard_video", title="Calendar Inbox Test",
        content_status="draft", deadline_at=_now() + timedelta(days=2),
    )
    db_session.add(proj)
    await db_session.commit()

    # Create an inbox item linked to this project
    from app.automation.event_hooks import emit_operation_event
    await emit_operation_event(
        db_session,
        item_type="publish_review",
        title="Proje onay bekliyor",
        related_entity_type="content_project",
        related_entity_id=proj_id,
        owner_user_id=user_id,
    )
    await db_session.commit()

    # Calendar should show the inbox relation
    resp = await client.get(CAL_BASE, params={
        "start_date": (_now() - timedelta(days=1)).isoformat(),
        "end_date": (_now() + timedelta(days=7)).isoformat(),
    })
    assert resp.status_code == 200
    proj_events = [e for e in resp.json() if e["related_project_id"] == proj_id]
    assert len(proj_events) >= 1
    assert proj_events[0]["inbox_item_id"] is not None


# ---------------------------------------------------------------------------
# 10. Duplicate guard allows after resolution
# ---------------------------------------------------------------------------

async def test_duplicate_guard_allows_after_resolve(client: AsyncClient, db_session: AsyncSession):
    """After resolving an inbox item, a new one can be created for same entity."""
    from app.automation.event_hooks import emit_operation_event

    entity_id = _uuid()
    item1 = await emit_operation_event(
        db_session,
        item_type="render_failure",
        title="First failure",
        related_entity_type="job",
        related_entity_id=entity_id,
    )
    await db_session.commit()
    assert item1 is not None

    # Resolve the item
    from app.db.models import OperationsInboxItem
    resolved_item = await db_session.get(OperationsInboxItem, item1.id)
    resolved_item.status = "resolved"
    resolved_item.resolved_at = _now()
    await db_session.commit()

    # Now a new one should be allowed
    item2 = await emit_operation_event(
        db_session,
        item_type="render_failure",
        title="Second failure after resolve",
        related_entity_type="job",
        related_entity_id=entity_id,
    )
    await db_session.commit()
    assert item2 is not None
    assert item2.id != item1.id


# ---------------------------------------------------------------------------
# 11. Inbox items have correct entity refs
# ---------------------------------------------------------------------------

async def test_inbox_entity_refs(db_session: AsyncSession):
    """Inbox items created by hooks have correct entity references."""
    from app.automation.event_hooks import emit_operation_event

    proj_id = _uuid()
    entity_id = _uuid()
    user_id = await _ensure_user(db_session)

    item = await emit_operation_event(
        db_session,
        item_type="publish_review",
        title="Entity ref test",
        owner_user_id=user_id,
        related_project_id=proj_id,
        related_entity_type="publish_record",
        related_entity_id=entity_id,
        action_url="/admin/publish/test",
    )
    await db_session.commit()
    assert item is not None
    assert item.owner_user_id == user_id
    assert item.related_project_id == proj_id
    assert item.related_entity_type == "publish_record"
    assert item.related_entity_id == entity_id
    assert item.action_url == "/admin/publish/test"
