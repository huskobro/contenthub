"""
Faz 14 + 14a — Content Calendar + Scheduling Surface + Policy/Inbox Closure tests.

Tests 1-11: Faz 14 original tests
Tests 12-21: Faz 14a closure tests
  12. Channel calendar context returns policy summary
  13. Channel context with publish_windows_json display
  14. Channel context with max_daily_posts
  15. Calendar ↔ inbox relation (inbox_item_id enrichment)
  16. Overdue event detail includes all fields
  17. ContentProject platform filter via primary_platform
  18. Detail panel upgraded fields present in response
  19. Admin/user scope — channel context respects channel ID
  20. Channel context with no policy returns defaults
  21. Inbox cross-ref only matches open items
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

CAL_BASE = "/api/v1/calendar/events"
CTX_BASE = "/api/v1/calendar/channel-context"
POLICY_BASE = "/api/v1/automation-policies"
INBOX_BASE = "/api/v1/operations-inbox"


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
    primary_platform: Optional[str] = None,
) -> str:
    from app.db.models import ContentProject
    pid = _uuid()
    proj = ContentProject(
        id=pid, user_id=user_id, channel_profile_id=channel_id,
        module_type="standard_video", title=f"Test Proje {pid[:6]}",
        content_status=status, deadline_at=deadline_at,
        primary_platform=primary_platform,
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

async def test_calendar_empty(client: AsyncClient, admin_headers: dict):
    """No data returns empty list.

    Uses a far-future window (365+ days out) so leftover data from other
    session-scoped fixtures does not contaminate this baseline assertion.
    """
    far_start = _now() + timedelta(days=365)
    far_end = far_start + timedelta(days=7)
    resp = await client.get(CAL_BASE, params=_params(far_start, far_end), headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# 2. ContentProject deadline events
# ---------------------------------------------------------------------------

async def test_project_deadline_event(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """ContentProject with deadline_at appears as calendar event."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    deadline = _now() + timedelta(days=3)
    await _create_project(db_session, user_id, ch_id, deadline)

    start = _now() - timedelta(days=1)
    end = _now() + timedelta(days=7)
    resp = await client.get(CAL_BASE, params=_params(start, end), headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    proj_events = [e for e in data if e["event_type"] == "content_project"]
    assert len(proj_events) >= 1
    assert proj_events[0]["id"].startswith("proj-")


# ---------------------------------------------------------------------------
# 3. PublishRecord scheduled events
# ---------------------------------------------------------------------------

async def test_publish_scheduled_event(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """PublishRecord with scheduled_at appears as calendar event."""
    job_id = await _ensure_job(db_session)
    sched = _now() + timedelta(days=2)
    await _create_publish(db_session, job_id, scheduled_at=sched)

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=1), _now() + timedelta(days=7),
    ),
    headers=admin_headers,)
    assert resp.status_code == 200
    pub_events = [e for e in resp.json() if e["event_type"] == "publish_record"]
    assert len(pub_events) >= 1
    assert pub_events[0]["id"].startswith("pub-")


# ---------------------------------------------------------------------------
# 4. PlatformPost scheduled events
# ---------------------------------------------------------------------------

async def test_post_scheduled_event(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """PlatformPost with scheduled_for appears as calendar event."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    sched = _now() + timedelta(days=1)
    await _create_post(db_session, ch_id, scheduled_for=sched)

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=1), _now() + timedelta(days=7),
    ),
    headers=admin_headers,)
    assert resp.status_code == 200
    post_events = [e for e in resp.json() if e["event_type"] == "platform_post"]
    assert len(post_events) >= 1
    assert post_events[0]["id"].startswith("post-")


# ---------------------------------------------------------------------------
# 5. Date range filtering (out-of-range excluded)
# ---------------------------------------------------------------------------

async def test_date_range_excludes_outside(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """Events outside date range are not returned."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    # Deadline far in the future
    await _create_project(db_session, user_id, ch_id, _now() + timedelta(days=60))

    # Query a narrow window
    resp = await client.get(CAL_BASE, params=_params(
        _now(), _now() + timedelta(days=5),
    ),
    headers=admin_headers,)
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

async def test_channel_filter(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
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
    ),
    headers=admin_headers,)
    assert resp.status_code == 200
    for ev in resp.json():
        if ev["channel_profile_id"]:
            assert ev["channel_profile_id"] == ch_a


# ---------------------------------------------------------------------------
# 7. Event type filter
# ---------------------------------------------------------------------------

async def test_event_type_filter(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
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
    ),
    headers=admin_headers,)
    assert resp.status_code == 200
    for ev in resp.json():
        assert ev["event_type"] == "content_project"


# ---------------------------------------------------------------------------
# 8. Overdue flag
# ---------------------------------------------------------------------------

async def test_overdue_flag(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """Past-deadline draft project has is_overdue=True."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    past = _now() - timedelta(hours=6)
    await _create_project(db_session, user_id, ch_id, past, status="draft")

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=2), _now() + timedelta(days=1),
    ),
    headers=admin_headers,)
    assert resp.status_code == 200
    overdue = [e for e in resp.json() if e["is_overdue"] is True]
    assert len(overdue) >= 1


# ---------------------------------------------------------------------------
# 9. Events sorted by start_at
# ---------------------------------------------------------------------------

async def test_events_sorted(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """Events are returned sorted by start_at ascending."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    # Create 3 projects with different deadlines
    for days in [5, 1, 3]:
        await _create_project(db_session, user_id, ch_id, _now() + timedelta(days=days))

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=1), _now() + timedelta(days=10),
        event_type="content_project",
    ),
    headers=admin_headers,)
    assert resp.status_code == 200
    data = resp.json()
    dates = [e["start_at"] for e in data]
    assert dates == sorted(dates)


# ---------------------------------------------------------------------------
# 10. Owner user filter
# ---------------------------------------------------------------------------

async def test_owner_filter(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
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
    ),
    headers=admin_headers,)
    assert resp.status_code == 200
    for ev in resp.json():
        if ev["owner_user_id"]:
            assert ev["owner_user_id"] == user_a


# ---------------------------------------------------------------------------
# 11. Mixed event sources aggregated
# ---------------------------------------------------------------------------

async def test_mixed_aggregation(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
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
    ),
    headers=admin_headers,)
    assert resp.status_code == 200
    types = {e["event_type"] for e in resp.json()}
    assert "content_project" in types
    assert "publish_record" in types
    assert "platform_post" in types


# ===========================================================================
# Faz 14a — Policy/Inbox Closure tests
# ===========================================================================


# ---------------------------------------------------------------------------
# 12. Channel calendar context returns policy summary
# ---------------------------------------------------------------------------

async def test_channel_context_policy_summary(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """Channel context endpoint returns policy summary."""
    channel_id = await _ensure_channel(db_session)
    # Create a policy for this channel
    await client.post(POLICY_BASE, json={
        "channel_profile_id": channel_id,
        "name": "Cal Context Test",
        "is_enabled": True,
        "source_scan_mode": "automatic",
        "draft_generation_mode": "manual_review",
        "render_mode": "disabled",
        "publish_mode": "manual_review",
        "post_publish_mode": "automatic",
    },
    headers=admin_headers,)

    resp = await client.get(f"{CTX_BASE}/{channel_id}", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["channel_profile_id"] == channel_id
    assert data["policy_enabled"] is True
    assert data["publish_mode"] == "manual_review"
    assert data["checkpoint_summary"] is not None
    assert "otomatik" in data["checkpoint_summary"]


# ---------------------------------------------------------------------------
# 13. Channel context with publish_windows_json display
# ---------------------------------------------------------------------------

async def test_channel_context_publish_windows(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """publish_windows_json is parsed and displayed."""
    channel_id = await _ensure_channel(db_session)
    import json
    windows = json.dumps([{"days": "Pzt-Cum", "start": "09:00", "end": "18:00"}])
    await client.post(POLICY_BASE, json={
        "channel_profile_id": channel_id,
        "name": "Windows Test",
        "is_enabled": True,
        "publish_windows_json": windows,
    },
    headers=admin_headers,)

    resp = await client.get(f"{CTX_BASE}/{channel_id}", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["publish_windows_display"] is not None
    assert "09:00" in data["publish_windows_display"]
    assert "18:00" in data["publish_windows_display"]


# ---------------------------------------------------------------------------
# 14. Channel context with max_daily_posts
# ---------------------------------------------------------------------------

async def test_channel_context_max_daily_posts(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """max_daily_posts shown in channel context."""
    channel_id = await _ensure_channel(db_session)
    await client.post(POLICY_BASE, json={
        "channel_profile_id": channel_id,
        "name": "Max Posts Test",
        "is_enabled": True,
        "max_daily_posts": 3,
    },
    headers=admin_headers,)

    resp = await client.get(f"{CTX_BASE}/{channel_id}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["max_daily_posts"] == 3


# ---------------------------------------------------------------------------
# 15. Calendar ↔ inbox relation (inbox_item_id enrichment)
# ---------------------------------------------------------------------------

async def test_calendar_inbox_relation(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """Events with matching inbox items get inbox_item_id populated."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    deadline = _now() + timedelta(days=2)
    proj_id = await _create_project(db_session, user_id, ch_id, deadline)

    # Create an inbox item linked to this project
    inbox_resp = await client.post(INBOX_BASE, json={
        "item_type": "publish_review",
        "title": "Proje onay bekliyor",
        "owner_user_id": user_id,
        "related_entity_type": "content_project",
        "related_entity_id": proj_id,
    },
    headers=admin_headers,)
    assert inbox_resp.status_code == 201

    # Get calendar events
    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=1), _now() + timedelta(days=7),
    ),
    headers=admin_headers,)
    assert resp.status_code == 200
    proj_events = [e for e in resp.json() if e["event_type"] == "content_project" and e["related_project_id"] == proj_id]
    assert len(proj_events) >= 1
    assert proj_events[0]["inbox_item_id"] is not None
    assert proj_events[0]["inbox_item_status"] == "open"


# ---------------------------------------------------------------------------
# 16. Overdue event detail includes all fields
# ---------------------------------------------------------------------------

async def test_overdue_event_detail_fields(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """Overdue event has correct fields in response."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    past = _now() - timedelta(hours=3)
    await _create_project(db_session, user_id, ch_id, past, status="draft")

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=2), _now() + timedelta(days=1),
    ),
    headers=admin_headers,)
    assert resp.status_code == 200
    overdue = [e for e in resp.json() if e["is_overdue"]]
    assert len(overdue) >= 1
    ev = overdue[0]
    assert ev["event_type"] == "content_project"
    assert ev["channel_profile_id"] is not None
    assert ev["owner_user_id"] is not None
    assert ev["status"] == "draft"
    assert ev["action_url"] is not None
    assert ev["meta_summary"] is not None


# ---------------------------------------------------------------------------
# 17. ContentProject platform filter via primary_platform
# ---------------------------------------------------------------------------

async def test_project_platform_filter(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """Platform filter restricts ContentProject events via primary_platform."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    deadline = _now() + timedelta(days=2)
    await _create_project(db_session, user_id, ch_id, deadline, primary_platform="youtube")
    await _create_project(db_session, user_id, ch_id, deadline, primary_platform="tiktok")

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=1), _now() + timedelta(days=7),
        platform="youtube", event_type="content_project",
    ),
    headers=admin_headers,)
    assert resp.status_code == 200
    for ev in resp.json():
        assert ev["primary_platform"] == "youtube" or ev["platform"] == "youtube"


# ---------------------------------------------------------------------------
# 18. Detail panel upgraded fields present in response
# ---------------------------------------------------------------------------

async def test_detail_upgraded_fields(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """CalendarEvent response includes Faz 14a fields."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    proj_id = await _create_project(db_session, user_id, ch_id, _now() + timedelta(days=1), primary_platform="youtube")

    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=1), _now() + timedelta(days=7),
        event_type="content_project", platform="youtube",
    ),
    headers=admin_headers,)
    assert resp.status_code == 200
    data = resp.json()
    # Find our specific project
    matched = [e for e in data if e["related_project_id"] == proj_id]
    assert len(matched) >= 1
    ev = matched[0]
    # Faz 14a fields exist in response
    assert "primary_platform" in ev
    assert "inbox_item_id" in ev
    assert "inbox_item_status" in ev
    assert ev["primary_platform"] == "youtube"


# ---------------------------------------------------------------------------
# 19. Admin/user scope — channel context respects channel ID
# ---------------------------------------------------------------------------

async def test_channel_context_scope(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """Channel context returns data for the specific channel only."""
    user_id = await _ensure_user(db_session)
    ch_a = await _ensure_channel(db_session, user_id)
    ch_b = await _ensure_channel(db_session, user_id)

    await client.post(POLICY_BASE, json={
        "channel_profile_id": ch_a,
        "name": "Policy A",
        "is_enabled": True,
        "max_daily_posts": 10,
    },
    headers=admin_headers,)

    # ch_a has policy
    resp_a = await client.get(f"{CTX_BASE}/{ch_a}", headers=admin_headers)
    assert resp_a.status_code == 200
    assert resp_a.json()["max_daily_posts"] == 10
    assert resp_a.json()["policy_id"] is not None

    # ch_b has no policy
    resp_b = await client.get(f"{CTX_BASE}/{ch_b}", headers=admin_headers)
    assert resp_b.status_code == 200
    assert resp_b.json()["policy_id"] is None
    assert resp_b.json()["max_daily_posts"] is None


# ---------------------------------------------------------------------------
# 20. Channel context with no policy returns defaults
# ---------------------------------------------------------------------------

async def test_channel_context_no_policy(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """Channel with no policy returns sensible defaults."""
    ch_id = await _ensure_channel(db_session)

    resp = await client.get(f"{CTX_BASE}/{ch_id}", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["policy_id"] is None
    assert data["policy_enabled"] is False
    assert data["publish_mode"] == "disabled"
    assert data["open_inbox_count"] == 0


# ---------------------------------------------------------------------------
# 21. Inbox cross-ref only matches open items
# ---------------------------------------------------------------------------

async def test_inbox_crossref_only_open(client: AsyncClient, db_session: AsyncSession, admin_headers: dict):
    """Resolved inbox items are not cross-referenced in calendar events."""
    user_id = await _ensure_user(db_session)
    ch_id = await _ensure_channel(db_session, user_id)
    deadline = _now() + timedelta(days=2)
    proj_id = await _create_project(db_session, user_id, ch_id, deadline)

    # Create and then resolve an inbox item
    inbox_resp = await client.post(INBOX_BASE, json={
        "item_type": "publish_review",
        "title": "Resolved item",
        "owner_user_id": user_id,
        "related_entity_type": "content_project",
        "related_entity_id": proj_id,
    },
    headers=admin_headers,)
    item_id = inbox_resp.json()["id"]
    await client.patch(f"{INBOX_BASE}/{item_id}", json={"status": "resolved"}, headers=admin_headers)

    # Calendar events should NOT have this resolved item
    resp = await client.get(CAL_BASE, params=_params(
        _now() - timedelta(days=1), _now() + timedelta(days=7),
    ),
    headers=admin_headers,)
    assert resp.status_code == 200
    proj_events = [e for e in resp.json() if e["related_project_id"] == proj_id]
    assert len(proj_events) >= 1
    assert proj_events[0]["inbox_item_id"] is None
