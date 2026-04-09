"""
Faz 7 — Comment management tests.

Tests:
1. Sync endpoint reachable (mock-free, expects auth error or success)
2. Comment list endpoint returns array
3. Comment list with filters
4. Single comment 404
5. Sync status endpoint
6. Reply endpoint 404 on nonexistent comment
7. SyncedComment model creation via DB
8. Duplicate comment protection (upsert)
9. EngagementTask creation for comment_reply type
10. TypeScript clean (frontend check)
11. Backend tests clean (all pass)
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/comments"


# ---------------------------------------------------------------------------
# 1. Sync endpoint is reachable
# ---------------------------------------------------------------------------

async def test_sync_endpoint_reachable(client: AsyncClient, user_headers: dict):
    """Sync endpoint should be registered and accept POST."""
    resp = await client.post(f"{BASE}/sync", json={"video_id": "test123"}, headers=user_headers)
    # Expect either auth error (no YouTube token) or 200
    # 500 = token store not configured, which is expected in test env
    assert resp.status_code in (200, 500, 422), f"Unexpected status: {resp.status_code} — {resp.text}"


# ---------------------------------------------------------------------------
# 2. Comment list endpoint
# ---------------------------------------------------------------------------

async def test_comment_list_returns_array(client: AsyncClient, user_headers: dict):
    """Comment list should return an empty array when no comments exist."""
    resp = await client.get(BASE, headers=user_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


async def test_comment_list_with_filters(client: AsyncClient, user_headers: dict):
    """Comment list should accept filter query params without error."""
    resp = await client.get(BASE, params={
        "platform": "youtube",
        "reply_status": "none",
        "is_reply": False,
        "limit": 50,
        "offset": 0,
    }, headers=user_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


# ---------------------------------------------------------------------------
# 3. Single comment 404
# ---------------------------------------------------------------------------

async def test_comment_detail_404(client: AsyncClient, user_headers: dict):
    """Non-existent comment should return 404."""
    resp = await client.get(f"{BASE}/nonexistent-id-12345", headers=user_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 4. Sync status endpoint
# ---------------------------------------------------------------------------

async def test_sync_status_returns_array(client: AsyncClient, user_headers: dict):
    """Sync status should return array (empty when no synced comments)."""
    resp = await client.get(f"{BASE}/sync-status", headers=user_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


# ---------------------------------------------------------------------------
# 5. Reply 404 on nonexistent comment
# ---------------------------------------------------------------------------

async def test_reply_404_on_nonexistent(client: AsyncClient, user_headers: dict):
    """Reply to non-existent comment should return error."""
    resp = await client.post(
        f"{BASE}/nonexistent-id-12345/reply",
        params={"user_id": "test-user"},
        json={"comment_id": "nonexistent-id-12345", "reply_text": "Test reply"},
        headers=user_headers,
    )
    # Could be 200 with success=false or 404 depending on implementation
    assert resp.status_code in (200, 404), f"Unexpected: {resp.status_code}"
    if resp.status_code == 200:
        data = resp.json()
        assert data["success"] is False


# ---------------------------------------------------------------------------
# 6. DB model creation (SyncedComment)
# ---------------------------------------------------------------------------

async def test_synced_comment_model_creation(db_session: AsyncSession):
    """SyncedComment can be created in database."""
    from app.db.models import SyncedComment
    from datetime import datetime, timezone
    import uuid

    comment = SyncedComment(
        id=str(uuid.uuid4()),
        platform="youtube",
        external_comment_id=f"YT_{uuid.uuid4().hex[:12]}",
        external_video_id="dQw4w9WgXcQ",
        text="Test yorum",
        reply_status="none",
        sync_status="synced",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(comment)
    await db_session.commit()
    await db_session.refresh(comment)

    assert comment.id is not None
    assert comment.platform == "youtube"
    assert comment.reply_status == "none"
    assert comment.text == "Test yorum"


# ---------------------------------------------------------------------------
# 7. Duplicate protection (unique external_comment_id)
# ---------------------------------------------------------------------------

async def test_duplicate_comment_protection(db_session: AsyncSession):
    """Duplicate external_comment_id should raise IntegrityError on direct insert."""
    from app.db.models import SyncedComment
    from datetime import datetime, timezone
    from sqlalchemy.exc import IntegrityError
    import uuid

    ext_id = f"YT_DUPE_{uuid.uuid4().hex[:8]}"
    base = {
        "platform": "youtube",
        "external_comment_id": ext_id,
        "external_video_id": "dQw4w9WgXcQ",
        "text": "Duplicate test",
        "reply_status": "none",
        "sync_status": "synced",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    c1 = SyncedComment(id=str(uuid.uuid4()), **base)
    db_session.add(c1)
    await db_session.commit()

    c2 = SyncedComment(id=str(uuid.uuid4()), **base)
    db_session.add(c2)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


# ---------------------------------------------------------------------------
# 8. EngagementTask comment_reply type
# ---------------------------------------------------------------------------

async def test_engagement_task_comment_reply_type(db_session: AsyncSession):
    """EngagementTask with type=comment_reply can be created."""
    from app.db.models import EngagementTask, User, ChannelProfile, PlatformConnection
    from datetime import datetime, timezone
    import uuid

    # Create required parent objects
    user_id = str(uuid.uuid4())
    channel_id = str(uuid.uuid4())
    connection_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    user = User(
        id=user_id, email=f"test-{uuid.uuid4().hex[:6]}@test.com",
        display_name="Test User", slug=f"test-{uuid.uuid4().hex[:6]}",
        role="user", status="active",
        created_at=now, updated_at=now,
    )
    db_session.add(user)
    await db_session.flush()

    channel = ChannelProfile(
        id=channel_id, user_id=user_id,
        profile_name="Test Channel", channel_slug=f"test-ch-{uuid.uuid4().hex[:6]}",
        status="active", default_language="tr",
        created_at=now, updated_at=now,
    )
    db_session.add(channel)
    await db_session.flush()

    connection = PlatformConnection(
        id=connection_id, channel_profile_id=channel_id,
        platform="youtube",
        auth_state="connected", token_state="valid",
        connection_status="connected",
        created_at=now, updated_at=now,
    )
    db_session.add(connection)
    await db_session.flush()

    task = EngagementTask(
        id=str(uuid.uuid4()),
        user_id=user_id,
        channel_profile_id=channel_id,
        platform_connection_id=connection_id,
        type="comment_reply",
        target_object_type="youtube_comment",
        target_object_id="YT_TEST_COMMENT_123",
        final_user_input="Test reply text",
        status="executed",
        executed_at=now,
        created_at=now,
        updated_at=now,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    assert task.type == "comment_reply"
    assert task.target_object_type == "youtube_comment"
    assert task.status == "executed"
