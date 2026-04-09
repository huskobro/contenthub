"""
Faz 16 — Notification Center + Inbox/Calendar Operational Awareness tests.

Tests:
1. Notification model create via service
2. Event → notification creation (publish_failure → notification)
3. Duplicate notification guard
4. User notification center list endpoint
5. Unread count endpoint
6. Read/dismiss action
7. Inbox link — notification has related_inbox_item_id
8. Overdue/calendar notification entity ref
9. Admin notification visibility (scope_type filter)
10. Mark-all-read action
11. By-entity lookup
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

NOTIF_BASE = "/api/v1/notifications"


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
    slug = f"faz16-{uid[:8]}"
    user = User(id=uid, email=f"{slug}@test.local", display_name="Faz16 Test", slug=slug)
    db.add(user)
    await db.commit()
    return uid


async def _ensure_channel(db: AsyncSession, user_id: Optional[str] = None) -> str:
    from app.db.models import ChannelProfile
    if not user_id:
        user_id = await _ensure_user(db)
    ch = ChannelProfile(
        user_id=user_id,
        platform="youtube",
        platform_channel_id=f"UC_{_uuid()[:12]}",
        channel_title="Faz16 Test Channel",
    )
    db.add(ch)
    await db.commit()
    return ch.id


# ---------------------------------------------------------------------------
# 1. Notification model create via service
# ---------------------------------------------------------------------------

async def test_notification_create_via_service(db_session: AsyncSession):
    """create_notification creates a NotificationItem in DB."""
    from app.notifications.service import create_notification

    notif = await create_notification(
        db_session,
        notification_type="render_failure",
        title="Test notification",
        body="Something went wrong",
        severity="error",
        scope_type="admin",
    )
    assert notif is not None
    assert notif.notification_type == "render_failure"
    assert notif.severity == "error"
    assert notif.status == "unread"
    assert notif.scope_type == "admin"


# ---------------------------------------------------------------------------
# 2. Event → notification creation (publish_failure → notification)
# ---------------------------------------------------------------------------

async def test_event_creates_notification(db_session: AsyncSession):
    """emit_operation_event with publish_failure also creates a notification."""
    from app.automation.event_hooks import emit_operation_event
    from app.db.models import NotificationItem
    from sqlalchemy import select

    rec_id = _uuid()
    inbox_item = await emit_operation_event(
        db_session,
        item_type="publish_failure",
        title="Yayin basarisiz: video_x",
        reason="YouTube API rate limit",
        priority="urgent",
        related_entity_type="publish_record",
        related_entity_id=rec_id,
        action_url="/admin/publish/xyz",
    )
    assert inbox_item is not None
    await db_session.commit()

    # Check that a notification was also created
    q = select(NotificationItem).where(
        NotificationItem.related_entity_type == "publish_record",
        NotificationItem.related_entity_id == rec_id,
    )
    result = await db_session.execute(q)
    notif = result.scalar_one_or_none()
    assert notif is not None
    assert notif.notification_type == "publish_failure"
    assert notif.severity == "error"
    assert notif.related_inbox_item_id == inbox_item.id


# ---------------------------------------------------------------------------
# 3. Duplicate notification guard
# ---------------------------------------------------------------------------

async def test_notification_duplicate_guard(db_session: AsyncSession):
    """Second notification for same entity+type is deduplicated."""
    from app.notifications.service import create_notification
    from app.db.models import NotificationItem
    from sqlalchemy import select, func

    entity_id = _uuid()
    n1 = await create_notification(
        db_session,
        notification_type="render_failure",
        title="First",
        related_entity_type="job",
        related_entity_id=entity_id,
    )
    assert n1 is not None

    n2 = await create_notification(
        db_session,
        notification_type="render_failure",
        title="Second",
        related_entity_type="job",
        related_entity_id=entity_id,
    )
    assert n2 is None  # Duplicate guard

    # Only one notification exists
    q = select(func.count(NotificationItem.id)).where(
        NotificationItem.related_entity_id == entity_id,
    )
    result = await db_session.execute(q)
    count = result.scalar()
    assert count == 1


# ---------------------------------------------------------------------------
# 4. User notification center list endpoint
# ---------------------------------------------------------------------------

async def test_notification_list_endpoint(client: AsyncClient, db_session: AsyncSession, user_headers: dict):
    """GET /notifications returns created notifications."""
    # Create via API
    resp = await client.post(NOTIF_BASE, json={
        "notification_type": "publish_review",
        "title": "Review needed",
        "severity": "warning",
        "scope_type": "admin",
    },
    headers=user_headers,)
    assert resp.status_code == 201

    # List
    list_resp = await client.get(NOTIF_BASE, headers=user_headers)
    assert list_resp.status_code == 200
    items = list_resp.json()
    matched = [i for i in items if i["title"] == "Review needed"]
    assert len(matched) >= 1
    assert matched[0]["severity"] == "warning"


# ---------------------------------------------------------------------------
# 5. Unread count endpoint
# ---------------------------------------------------------------------------

async def test_unread_count(client: AsyncClient, db_session: AsyncSession, user_headers: dict):
    """GET /notifications/count returns correct unread count."""
    # Create two notifications
    await client.post(NOTIF_BASE, json={
        "notification_type": "render_failure",
        "title": "Count test 1",
        "severity": "error",
    },
    headers=user_headers,)
    await client.post(NOTIF_BASE, json={
        "notification_type": "source_scan_error",
        "title": "Count test 2",
        "severity": "warning",
    },
    headers=user_headers,)

    resp = await client.get(f"{NOTIF_BASE}/count", headers=user_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["unread"] >= 2
    assert data["total"] >= 2


# ---------------------------------------------------------------------------
# 6. Read/dismiss action
# ---------------------------------------------------------------------------

async def test_read_dismiss_actions(client: AsyncClient, db_session: AsyncSession, user_headers: dict):
    """PATCH /notifications/{id} can mark as read or dismissed."""
    # Create
    create_resp = await client.post(NOTIF_BASE, json={
        "notification_type": "publish_review",
        "title": "Action test",
        "severity": "info",
    },
    headers=user_headers,)
    notif_id = create_resp.json()["id"]

    # Mark read
    read_resp = await client.patch(f"{NOTIF_BASE}/{notif_id}", json={"status": "read"}, headers=user_headers)
    assert read_resp.status_code == 200
    assert read_resp.json()["status"] == "read"
    assert read_resp.json()["read_at"] is not None

    # Mark dismissed
    dismiss_resp = await client.patch(f"{NOTIF_BASE}/{notif_id}", json={"status": "dismissed"}, headers=user_headers)
    assert dismiss_resp.status_code == 200
    assert dismiss_resp.json()["status"] == "dismissed"
    assert dismiss_resp.json()["dismissed_at"] is not None


# ---------------------------------------------------------------------------
# 7. Inbox link — notification has related_inbox_item_id
# ---------------------------------------------------------------------------

async def test_inbox_link_in_notification(db_session: AsyncSession):
    """Notification created by event hook has related_inbox_item_id set."""
    from app.automation.event_hooks import emit_operation_event
    from app.db.models import NotificationItem
    from sqlalchemy import select

    rec_id = _uuid()
    inbox_item = await emit_operation_event(
        db_session,
        item_type="source_scan_error",
        title="Scan failed",
        reason="Connection timeout",
        priority="normal",
        related_entity_type="source_scan",
        related_entity_id=rec_id,
    )
    assert inbox_item is not None
    await db_session.commit()

    q = select(NotificationItem).where(
        NotificationItem.related_entity_id == rec_id,
    )
    result = await db_session.execute(q)
    notif = result.scalar_one_or_none()
    assert notif is not None
    assert notif.related_inbox_item_id == inbox_item.id


# ---------------------------------------------------------------------------
# 8. Overdue/calendar notification entity ref
# ---------------------------------------------------------------------------

async def test_notification_entity_refs(db_session: AsyncSession):
    """Notifications from event hooks carry correct entity type and ID."""
    from app.automation.event_hooks import emit_operation_event
    from app.db.models import NotificationItem
    from sqlalchemy import select

    job_id = _uuid()
    await emit_operation_event(
        db_session,
        item_type="render_failure",
        title="Job failed: news_bulletin",
        reason="FFmpeg crash",
        priority="high",
        related_entity_type="job",
        related_entity_id=job_id,
        action_url=f"/admin/jobs/{job_id}",
    )
    await db_session.flush()

    q = select(NotificationItem).where(
        NotificationItem.related_entity_id == job_id,
    )
    result = await db_session.execute(q)
    notif = result.scalar_one_or_none()
    assert notif is not None
    assert notif.related_entity_type == "job"
    assert notif.action_url == f"/admin/jobs/{job_id}"
    assert notif.severity == "error"  # high priority → error severity


# ---------------------------------------------------------------------------
# 9. Admin notification visibility (scope_type filter)
# ---------------------------------------------------------------------------

async def test_admin_scope_filter(client: AsyncClient, db_session: AsyncSession, user_headers: dict):
    """GET /notifications?scope_type=admin returns only admin-scoped notifications."""
    # Create admin notification
    await client.post(NOTIF_BASE, json={
        "notification_type": "publish_failure",
        "title": "Admin only",
        "severity": "error",
        "scope_type": "admin",
    },
    headers=user_headers,)
    # Create user notification
    await client.post(NOTIF_BASE, json={
        "notification_type": "render_failure",
        "title": "User only",
        "severity": "error",
        "scope_type": "user",
    },
    headers=user_headers,)

    # Filter admin
    resp = await client.get(NOTIF_BASE, params={"scope_type": "admin"}, headers=user_headers)
    assert resp.status_code == 200
    items = resp.json()
    for item in items:
        assert item["scope_type"] == "admin"


# ---------------------------------------------------------------------------
# 10. Mark-all-read action
# ---------------------------------------------------------------------------

async def test_mark_all_read(client: AsyncClient, db_session: AsyncSession, user_headers: dict):
    """POST /notifications/mark-all-read marks all unread as read."""
    # Create notifications
    await client.post(NOTIF_BASE, json={
        "notification_type": "publish_review",
        "title": "Bulk read 1",
        "severity": "info",
    },
    headers=user_headers,)
    await client.post(NOTIF_BASE, json={
        "notification_type": "publish_review",
        "title": "Bulk read 2",
        "severity": "warning",
    },
    headers=user_headers,)

    # Mark all read
    resp = await client.post(f"{NOTIF_BASE}/mark-all-read", headers=user_headers)
    assert resp.status_code == 200
    assert resp.json()["marked_read"] >= 2

    # Verify count
    count_resp = await client.get(f"{NOTIF_BASE}/count", headers=user_headers)
    assert count_resp.json()["unread"] == 0


# ---------------------------------------------------------------------------
# 11. By-entity lookup
# ---------------------------------------------------------------------------

async def test_by_entity_lookup(client: AsyncClient, db_session: AsyncSession, user_headers: dict):
    """GET /notifications/by-entity/{type}/{id} returns matching notifications."""
    entity_id = _uuid()
    await client.post(NOTIF_BASE, json={
        "notification_type": "render_failure",
        "title": "Entity lookup test",
        "severity": "error",
        "related_entity_type": "job",
        "related_entity_id": entity_id,
    },
    headers=user_headers,)

    resp = await client.get(f"{NOTIF_BASE}/by-entity/job/{entity_id}", headers=user_headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert items[0]["related_entity_id"] == entity_id
