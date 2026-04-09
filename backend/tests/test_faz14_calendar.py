"""
Faz 14 — Content Calendar + Scheduling Surface tests.

Tests:
1. Calendar events endpoint returns empty list for no data
2. ContentProject deadline events appear in calendar
3. PublishRecord scheduled events appear in calendar
4. PlatformPost scheduled events appear in calendar
5. Date range filtering works (out-of-range excluded)
6. Channel filter works
7. Event type filter works
8. Overdue flag set for past-deadline projects
9. Events sorted by start_at
10. Owner user filter works
11. Mixed event sources aggregated correctly
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

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
    slug = f"faz14-{uid[:8]}"
    user = User(id=uid, email=f"{slug}@test.local", display_name="Faz14 Test", slug=slug)
    db.add(user)
    await db.commit()
    return uid


async def _ensure_channel(db: AsyncSession, user_id: Optional[str] = None) -> str:
    from app.db.models import ChannelProfile
    if not user_id:
        user_id = await _ensure_user(db)
    ch = ChannelProfile(
        user_id=user_id,
        profile_name="Faz14 Kanal",
        channel_slug=f"faz14-{uuid.uuid4().hex[:8]}",
    )
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch.id


async def _ensure_job(db: AsyncSession) -> str:
    from app.db.models import Job
    jid = _uuid()
    job = Job(id=jid, module_type="standard_video", status="completed")
    db.add(job)
    await db.commit()
    return jid


async def _create_project(
    db: AsyncSession, user_id: str, channel_id: str,
    deadline_at: datetime, status: str = "draft",
) -> str:
    from app.db.models import ContentProject
    pid = _uuid()
    proj = ContentProject(
        id=pid, user_id=user_id, channel_profile_id=channel_id,
        module_type="standard_video", title=f"Test Proje {pid[:6]}",
        content_status=status, deadline_at=deadline_at,
    )
    db.add(proj)
    await db.commit()
    return pid


async def _create_publish(
    db: AsyncSession, job_id: str,
    scheduled_at: Optional[datetime] = None, published_at: Optional[datetime] = None,
    status: str = "scheduled", platform: str = "youtube",
) -> str:
    from app.db.models import PublishRecord
    rid = _uuid()
    rec = PublishRecord(
        id=rid, job_id=job_id, content_ref_type="standard_video",
        content_ref_id=_uuid(), platform=platform, status=status,
        scheduled_at=scheduled_at, published_at=published_at,
    )
    db.add(rec)
    await db.commit()
    return rid


async def _create_post(
    db: AsyncSession, channel_id: str,
    scheduled_for: Optional[datetime] = None, posted_at: Optional[datetime] = None,
    status: str = "draft", platform: str = "youtube",
) -> str:
    from app.db.models import PlatformPost
    pid = _uuid()
    post = PlatformPost(
        id=pid, channel_profile_id=channel_id, platform=platform,
        status=status, body="Test post",
        scheduled_for=scheduled_for, posted_at=posted_at,
    )
    db.add(post)
    await db.commit()
    return pid


def _params(start: datetime, end: datetime, **extra: str) -> dict:
    p = {"start_date": start.isoformat(), "end_date": end.isoformat()}
    p.update(extra)
    return p


# ---------------------------------------------------------------------------
# 1. Empty calendar
# ---------------------------------------------------------------------------

async def test_calendar_empty(client: AsyncClient):
    """No data returns empty list."""
    now = _now()
    resp = await client.get(CAL_BASE, params=_params(now, now + timedelta(days=7)))
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# 2. ContentProject deadline events
# ---------------------------------------------------------------------------

async def test_project_deadline_event(client: AsyncClient, db_session: AsyncSession):
    """ContentProject with deadline_at appears as calendar event."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    deadline = _now() + timedelta(days=3)
    await _create_project(db_session, user_id, ch_id, deadline)

    start = _now() - timedelta(days=1)
    end = _now() + timedelta(days=7)
    resp = await client.get(CAL_BASE, params=_params(start, end))
    assert resp.status_code == 200
    data = resp.json()
    proj_events = [e for e in data if e["event_type"] == "content_project"]
    assert len(proj_events) >= 1
    assert proj_events[0]["id"].startswith("proj-")


# ---------------------------------------------------------------------------
# 3. PublishRecord scheduled events
# ---------------------------------------------------------------------------

async def test_publish_scheduled_event(client: AsyncClient, db_session: AsyncSession):
    """PublishRecord with scheduled_at appears as calendar event."""
    job_id = await _ensure_job(db_session)
    sched = _now() + timedelta(days=2)
    await _create_publish(db_session, job_id, scheduled_at=sched)

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=1), _now() + timedelta(days=7),
    ))
    assert resp.status_code == 200
    pub_events = [e for e in resp.json() if e["event_type"] == "publish_record"]
    assert len(pub_events) >= 1
    assert pub_events[0]["id"].startswith("pub-")


# ---------------------------------------------------------------------------
# 4. PlatformPost scheduled events
# ---------------------------------------------------------------------------

async def test_post_scheduled_event(client: AsyncClient, db_session: AsyncSession):
    """PlatformPost with scheduled_for appears as calendar event."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    sched = _now() + timedelta(days=1)
    await _create_post(db_session, ch_id, scheduled_for=sched)

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=1), _now() + timedelta(days=7),
    ))
    assert resp.status_code == 200
    post_events = [e for e in resp.json() if e["event_type"] == "platform_post"]
    assert len(post_events) >= 1
    assert post_events[0]["id"].startswith("post-")


# ---------------------------------------------------------------------------
# 5. Date range filtering (out-of-range excluded)
# ---------------------------------------------------------------------------

async def test_date_range_excludes_outside(client: AsyncClient, db_session: AsyncSession):
    """Events outside date range are not returned."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    # Deadline far in the future
    await _create_project(db_session, user_id, ch_id, _now() + timedelta(days=60))

    # Query a narrow window
    resp = await client.get(CAL_BASE, params=_params(
        _now(), _now() + timedelta(days=5),
    ))
    assert resp.status_code == 200
    proj_events = [e for e in resp.json() if e["event_type"] == "content_project"]
    # Should not include the 60-day-out deadline
    for ev in proj_events:
        ev_date = datetime.fromisoformat(ev["start_at"]).replace(tzinfo=None)
        limit = (_now() + timedelta(days=6)).replace(tzinfo=None)
        assert ev_date <= limit


# ---------------------------------------------------------------------------
# 6. Channel filter
# ---------------------------------------------------------------------------

async def test_channel_filter(client: AsyncClient, db_session: AsyncSession):
    """channel_profile_id filter restricts results."""
    user_id = await _ensure_user(db_session)
    ch_a = await _ensure_channel(db_session, user_id)
    ch_b = await _ensure_channel(db_session, user_id)
    deadline = _now() + timedelta(days=2)
    await _create_project(db_session, user_id, ch_a, deadline)
    await _create_project(db_session, user_id, ch_b, deadline)

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=1), _now() + timedelta(days=7),
        channel_profile_id=ch_a,
    ))
    assert resp.status_code == 200
    for ev in resp.json():
        if ev["channel_profile_id"]:
            assert ev["channel_profile_id"] == ch_a


# ---------------------------------------------------------------------------
# 7. Event type filter
# ---------------------------------------------------------------------------

async def test_event_type_filter(client: AsyncClient, db_session: AsyncSession):
    """event_type filter restricts to single source."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    deadline = _now() + timedelta(days=2)
    await _create_project(db_session, user_id, ch_id, deadline)
    job_id = await _ensure_job(db_session)
    await _create_publish(db_session, job_id, scheduled_at=_now() + timedelta(days=3))

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=1), _now() + timedelta(days=7),
        event_type="content_project",
    ))
    assert resp.status_code == 200
    for ev in resp.json():
        assert ev["event_type"] == "content_project"


# ---------------------------------------------------------------------------
# 8. Overdue flag
# ---------------------------------------------------------------------------

async def test_overdue_flag(client: AsyncClient, db_session: AsyncSession):
    """Past-deadline draft project has is_overdue=True."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    past = _now() - timedelta(hours=6)
    await _create_project(db_session, user_id, ch_id, past, status="draft")

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=2), _now() + timedelta(days=1),
    ))
    assert resp.status_code == 200
    overdue = [e for e in resp.json() if e["is_overdue"] is True]
    assert len(overdue) >= 1


# ---------------------------------------------------------------------------
# 9. Events sorted by start_at
# ---------------------------------------------------------------------------

async def test_events_sorted(client: AsyncClient, db_session: AsyncSession):
    """Events are returned sorted by start_at ascending."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    # Create 3 projects with different deadlines
    for days in [5, 1, 3]:
        await _create_project(db_session, user_id, ch_id, _now() + timedelta(days=days))

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=1), _now() + timedelta(days=10),
        event_type="content_project",
    ))
    assert resp.status_code == 200
    data = resp.json()
    dates = [e["start_at"] for e in data]
    assert dates == sorted(dates)


# ---------------------------------------------------------------------------
# 10. Owner user filter
# ---------------------------------------------------------------------------

async def test_owner_filter(client: AsyncClient, db_session: AsyncSession):
    """owner_user_id filter restricts project events."""
    user_a = await _ensure_user(db_session)
    user_b = await _ensure_user(db_session)
    ch_a = await _ensure_channel(db_session, user_a)
    ch_b = await _ensure_channel(db_session, user_b)
    deadline = _now() + timedelta(days=2)
    await _create_project(db_session, user_a, ch_a, deadline)
    await _create_project(db_session, user_b, ch_b, deadline)

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=1), _now() + timedelta(days=7),
        owner_user_id=user_a,
    ))
    assert resp.status_code == 200
    for ev in resp.json():
        if ev["owner_user_id"]:
            assert ev["owner_user_id"] == user_a


# ---------------------------------------------------------------------------
# 11. Mixed event sources aggregated
# ---------------------------------------------------------------------------

async def test_mixed_aggregation(client: AsyncClient, db_session: AsyncSession):
    """All three event sources aggregated into one response."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    base = _now() + timedelta(days=2)

    await _create_project(db_session, user_id, ch_id, base)
    job_id = await _ensure_job(db_session)
    await _create_publish(db_session, job_id, scheduled_at=base + timedelta(hours=1))
    await _create_post(db_session, ch_id, scheduled_for=base + timedelta(hours=2))

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=1), _now() + timedelta(days=7),
    ))
    assert resp.status_code == 200
    types = {e["event_type"] for e in resp.json()}
    assert "content_project" in types
    assert "publish_record" in types
    assert "platform_post" in types
