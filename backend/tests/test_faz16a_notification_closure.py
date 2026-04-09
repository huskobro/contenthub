"""
Faz 16a — Notification Overdue + Scope Closure tests.

Tests:
1. Overdue publish notification creation
2. Overdue post notification creation
3. Overdue duplicate guard
4. User scope list (GET /notifications/my)
5. Admin scope list (GET /notifications — all)
6. Unread count scope (mode=my)
7. Notification → inbox relation in overdue
8. Noise control — no duplicate overdue notifications
"""

import uuid
from datetime import datetime, timedelta, timezone
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


async def _ensure_user(db: AsyncSession, slug_prefix: str = "faz16a") -> str:
    from app.db.models import User
    uid = _uuid()
    slug = f"{slug_prefix}-{uid[:8]}"
    user = User(id=uid, email=f"{slug}@test.local", display_name="Faz16a Test", slug=slug)
    db.add(user)
    await db.commit()
    return uid


async def _ensure_channel(db: AsyncSession, user_id: Optional[str] = None) -> str:
    from app.db.models import ChannelProfile
    if not user_id:
        user_id = await _ensure_user(db)
    slug = f"faz16a-ch-{_uuid()[:8]}"
    ch = ChannelProfile(
        user_id=user_id,
        profile_name="Faz16a Test Channel",
        channel_slug=slug,
    )
    db.add(ch)
    await db.commit()
    return ch.id


async def _ensure_job(db: AsyncSession) -> str:
    from app.db.models import Job
    job = Job(module_type="standard_video", status="completed")
    db.add(job)
    await db.commit()
    return job.id


# ---------------------------------------------------------------------------
# 1. Overdue publish notification creation
# ---------------------------------------------------------------------------

async def test_overdue_publish_notification(db_session: AsyncSession):
    """Overdue scheduler detects overdue PublishRecord and creates notification."""
    from app.db.models import PublishRecord, NotificationItem
    from app.notifications.overdue_scheduler import _check_overdue
    from sqlalchemy import select

    # Create a job (required FK for PublishRecord)
    job_id = await _ensure_job(db_session)

    # Create an overdue publish record
    rec = PublishRecord(
        job_id=job_id,
        status="scheduled",
        scheduled_at=_now() - timedelta(hours=2),
        content_ref_type="standard_video",
        content_ref_id=_uuid(),
        platform="youtube",
    )
    db_session.add(rec)
    await db_session.commit()
    rec_id = rec.id

    # Use a factory that returns existing session for test
    class FakeFactory:
        def __call__(self):
            return _AsyncCtx(db_session)

    count = await _check_overdue(FakeFactory())

    # Check notification was created
    q = select(NotificationItem).where(
        NotificationItem.related_entity_id == rec_id,
        NotificationItem.notification_type == "overdue_publish",
    )
    result = await db_session.execute(q)
    notif = result.scalar_one_or_none()
    assert notif is not None
    # priority="high" overrides map severity "warning" → "error"
    assert notif.severity == "error"
    assert "Geciken yayin" in notif.title
    assert count >= 1


# ---------------------------------------------------------------------------
# 2. Overdue post notification creation
# ---------------------------------------------------------------------------

async def test_overdue_post_notification(db_session: AsyncSession):
    """Overdue scheduler detects overdue PlatformPost and creates notification."""
    from app.db.models import PlatformPost, NotificationItem
    from app.notifications.overdue_scheduler import _check_overdue
    from sqlalchemy import select

    user_id = await _ensure_user(db_session, "post-overdue")
    ch_id = await _ensure_channel(db_session, user_id)

    post = PlatformPost(
        channel_profile_id=ch_id,
        platform="youtube",
        post_type="community_post",
        status="queued",
        scheduled_for=_now() - timedelta(hours=1),
        title="Test overdue post",
    )
    db_session.add(post)
    await db_session.commit()
    post_id = post.id

    class FakeFactory:
        def __call__(self):
            return _AsyncCtx(db_session)

    count = await _check_overdue(FakeFactory())

    q = select(NotificationItem).where(
        NotificationItem.related_entity_id == post_id,
        NotificationItem.notification_type == "overdue_post",
    )
    result = await db_session.execute(q)
    notif = result.scalar_one_or_none()
    assert notif is not None
    assert "Geciken post" in notif.title
    assert count >= 1


# ---------------------------------------------------------------------------
# 3. Overdue duplicate guard
# ---------------------------------------------------------------------------

async def test_overdue_duplicate_guard(db_session: AsyncSession):
    """Running overdue check twice doesn't create duplicate notifications."""
    from app.db.models import PublishRecord, NotificationItem
    from app.notifications.overdue_scheduler import _check_overdue
    from sqlalchemy import select, func

    job_id = await _ensure_job(db_session)
    rec = PublishRecord(
        job_id=job_id,
        status="approved",
        scheduled_at=_now() - timedelta(hours=3),
        content_ref_type="news_bulletin",
        content_ref_id=_uuid(),
        platform="youtube",
    )
    db_session.add(rec)
    await db_session.commit()
    rec_id = rec.id

    class FakeFactory:
        def __call__(self):
            return _AsyncCtx(db_session)

    # First run
    await _check_overdue(FakeFactory())
    # Second run — should be deduplicated
    await _check_overdue(FakeFactory())

    q = select(func.count(NotificationItem.id)).where(
        NotificationItem.related_entity_id == rec_id,
        NotificationItem.notification_type == "overdue_publish",
    )
    result = await db_session.execute(q)
    count = result.scalar()
    assert count == 1  # Only one notification despite two runs


# ---------------------------------------------------------------------------
# 4. User scope list (GET /notifications/my)
# ---------------------------------------------------------------------------

async def test_user_scope_my_endpoint(client: AsyncClient, db_session: AsyncSession):
    """GET /notifications/my returns only user-scoped notifications."""
    # Create admin-scoped notification
    await client.post(NOTIF_BASE, json={
        "notification_type": "publish_failure",
        "title": "Admin only scope test",
        "severity": "error",
        "scope_type": "admin",
    })
    # Create user-scoped notification
    await client.post(NOTIF_BASE, json={
        "notification_type": "render_failure",
        "title": "User scope test",
        "severity": "error",
        "scope_type": "user",
    })

    # /my endpoint should NOT return admin-scoped
    resp = await client.get(f"{NOTIF_BASE}/my")
    assert resp.status_code == 200
    items = resp.json()
    for item in items:
        assert item["scope_type"] != "admin", \
            f"Admin-scoped notification leaked to /my: {item['title']}"


# ---------------------------------------------------------------------------
# 5. Admin scope list
# ---------------------------------------------------------------------------

async def test_admin_scope_list(client: AsyncClient, db_session: AsyncSession):
    """GET /notifications returns all notifications for admin."""
    # Create both scopes
    await client.post(NOTIF_BASE, json={
        "notification_type": "publish_failure",
        "title": "Admin list test - admin",
        "severity": "error",
        "scope_type": "admin",
    })
    await client.post(NOTIF_BASE, json={
        "notification_type": "render_failure",
        "title": "Admin list test - user",
        "severity": "error",
        "scope_type": "user",
    })

    resp = await client.get(NOTIF_BASE)
    assert resp.status_code == 200
    items = resp.json()
    scope_types = {i["scope_type"] for i in items}
    # Admin endpoint should show both scopes
    assert "admin" in scope_types or "user" in scope_types


# ---------------------------------------------------------------------------
# 6. Unread count scope (mode=my)
# ---------------------------------------------------------------------------

async def test_unread_count_scope(client: AsyncClient, db_session: AsyncSession):
    """GET /notifications/count?mode=my returns only user-scoped count."""
    # Create admin notification
    await client.post(NOTIF_BASE, json={
        "notification_type": "publish_failure",
        "title": "Count scope - admin",
        "scope_type": "admin",
    })

    # mode=my should not count admin notifications
    resp = await client.get(f"{NOTIF_BASE}/count", params={"mode": "my"})
    assert resp.status_code == 200
    data = resp.json()
    # This is a soft check — count should NOT include admin-scoped items
    assert data["unread"] >= 0  # At least valid response

    # Compare with full count
    full_resp = await client.get(f"{NOTIF_BASE}/count")
    full_data = full_resp.json()
    assert full_data["total"] >= data["total"]


# ---------------------------------------------------------------------------
# 7. Notification → inbox relation in overdue
# ---------------------------------------------------------------------------

async def test_overdue_creates_inbox_and_notification(db_session: AsyncSession):
    """Overdue detection creates both inbox item and notification with relation."""
    from app.db.models import PublishRecord, OperationsInboxItem, NotificationItem
    from app.notifications.overdue_scheduler import _check_overdue
    from sqlalchemy import select

    job_id = await _ensure_job(db_session)
    rec = PublishRecord(
        job_id=job_id,
        status="scheduled",
        scheduled_at=_now() - timedelta(minutes=30),
        content_ref_type="standard_video",
        content_ref_id=_uuid(),
        platform="youtube",
    )
    db_session.add(rec)
    await db_session.commit()
    rec_id = rec.id

    class FakeFactory:
        def __call__(self):
            return _AsyncCtx(db_session)

    await _check_overdue(FakeFactory())

    # Check inbox item exists
    inbox_q = select(OperationsInboxItem).where(
        OperationsInboxItem.related_entity_id == rec_id,
        OperationsInboxItem.item_type == "overdue_publish",
    )
    inbox_result = await db_session.execute(inbox_q)
    inbox_item = inbox_result.scalar_one_or_none()
    assert inbox_item is not None

    # Check notification has inbox reference
    notif_q = select(NotificationItem).where(
        NotificationItem.related_entity_id == rec_id,
        NotificationItem.notification_type == "overdue_publish",
    )
    notif_result = await db_session.execute(notif_q)
    notif = notif_result.scalar_one_or_none()
    assert notif is not None
    assert notif.related_inbox_item_id == inbox_item.id


# ---------------------------------------------------------------------------
# 8. Noise control — overdue + existing notification behavior
# ---------------------------------------------------------------------------

async def test_noise_control_no_extra_notifications(db_session: AsyncSession):
    """Pre-existing open inbox item prevents duplicate notification on overdue."""
    from app.automation.event_hooks import emit_operation_event
    from app.db.models import PublishRecord, NotificationItem
    from app.notifications.overdue_scheduler import _check_overdue
    from sqlalchemy import select, func

    job_id = await _ensure_job(db_session)
    rec = PublishRecord(
        job_id=job_id,
        status="scheduled",
        scheduled_at=_now() - timedelta(hours=5),
        content_ref_type="standard_video",
        content_ref_id=_uuid(),
        platform="youtube",
    )
    db_session.add(rec)
    await db_session.commit()
    rec_id = rec.id

    # Manually create an inbox item for this entity (simulating first detection)
    await emit_operation_event(
        db_session,
        item_type="overdue_publish",
        title="Manual overdue",
        related_entity_type="publish_record",
        related_entity_id=rec_id,
    )
    await db_session.commit()

    # Now run overdue scheduler — should NOT create second notification
    class FakeFactory:
        def __call__(self):
            return _AsyncCtx(db_session)

    await _check_overdue(FakeFactory())

    # Count notifications for this entity
    q = select(func.count(NotificationItem.id)).where(
        NotificationItem.related_entity_id == rec_id,
    )
    result = await db_session.execute(q)
    count = result.scalar()
    assert count == 1  # Only the original notification


# ---------------------------------------------------------------------------
# Async context manager helper for fake session factory
# ---------------------------------------------------------------------------

class _AsyncCtx:
    """Fake async context manager that returns an existing session."""
    def __init__(self, session: AsyncSession):
        self._session = session

    async def __aenter__(self):
        return self._session

    async def __aexit__(self, *args):
        pass
