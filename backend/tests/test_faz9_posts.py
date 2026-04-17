"""
Faz 9 — Platform post management tests.

Tests:
1. Post create endpoint
2. Post list returns array
3. Post list with filters
4. Post detail 404
5. Post stats endpoint
6. Capability endpoint
7. Post update (draft only)
8. Post delete (draft only)
9. PlatformPost model creation
10. EngagementTask community_post type
11. Delivery capability check (not_available for youtube community_post)
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/posts"


# ---------------------------------------------------------------------------
# 1. Post create endpoint
# ---------------------------------------------------------------------------

async def test_create_post(client: AsyncClient, user_headers: dict):
    """POST /posts should create a draft post."""
    resp = await client.post(BASE, json={
        "platform": "youtube",
        "body": "Test community post body",
        "post_type": "community_post",
    }, headers=user_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "draft"
    assert data["body"] == "Test community post body"
    assert data["platform"] == "youtube"
    assert data["delivery_status"] == "pending"


# ---------------------------------------------------------------------------
# 2-3. Post list
# ---------------------------------------------------------------------------

async def test_post_list_returns_array(client: AsyncClient, user_headers: dict):
    """GET /posts should return array."""
    resp = await client.get(BASE, headers=user_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_post_list_with_filters(client: AsyncClient, user_headers: dict):
    """GET /posts with filter params."""
    resp = await client.get(BASE, params={
        "platform": "youtube",
        "status": "draft",
        "limit": 50,
        "offset": 0,
    }, headers=user_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ---------------------------------------------------------------------------
# 4. Post detail 404
# ---------------------------------------------------------------------------

async def test_post_detail_404(client: AsyncClient, user_headers: dict):
    resp = await client.get(f"{BASE}/nonexistent-id-12345", headers=user_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 5. Post stats
# ---------------------------------------------------------------------------

async def test_post_stats(client: AsyncClient, user_headers: dict):
    resp = await client.get(f"{BASE}/stats", headers=user_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "draft" in data
    assert "queued" in data
    assert "posted" in data
    assert "failed" in data


# ---------------------------------------------------------------------------
# 6. Capability endpoint
# ---------------------------------------------------------------------------

async def test_capability_endpoint(client: AsyncClient, user_headers: dict):
    resp = await client.get(f"{BASE}/capability", headers=user_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "capabilities" in data
    assert "note" in data
    # YouTube community_post should be False
    assert data["capabilities"]["youtube"]["community_post"] is False


# ---------------------------------------------------------------------------
# 7. Post update (draft only)
# ---------------------------------------------------------------------------

async def test_update_draft_post(client: AsyncClient, admin_headers: dict):
    """PATCH /posts/{id} should update draft.

    Phase Final F2: channel_profile_id=None olan orphan post'u yalnizca admin
    guncelleyebilir; business logic (draft update) admin-header ile dogrulaniyor.
    """
    # Create first
    create_resp = await client.post(BASE, json={
        "platform": "youtube",
        "body": "Original body",
    }, headers=admin_headers)
    assert create_resp.status_code == 201
    post_id = create_resp.json()["id"]

    # Update
    update_resp = await client.patch(f"{BASE}/{post_id}", json={
        "body": "Updated body",
        "title": "New title",
    }, headers=admin_headers)
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["body"] == "Updated body"
    assert data["title"] == "New title"


# ---------------------------------------------------------------------------
# 8. Post delete (draft only)
# ---------------------------------------------------------------------------

async def test_delete_draft_post(client: AsyncClient, admin_headers: dict):
    """DELETE /posts/{id} should delete draft.

    Phase Final F2: orphan post yalnizca admin silinebilir.
    """
    create_resp = await client.post(BASE, json={
        "platform": "youtube",
        "body": "To be deleted",
    }, headers=admin_headers)
    assert create_resp.status_code == 201
    post_id = create_resp.json()["id"]

    del_resp = await client.delete(f"{BASE}/{post_id}", headers=admin_headers)
    assert del_resp.status_code == 204

    # Verify gone
    get_resp = await client.get(f"{BASE}/{post_id}", headers=admin_headers)
    assert get_resp.status_code == 404


# ---------------------------------------------------------------------------
# 9. PlatformPost model creation
# ---------------------------------------------------------------------------

async def test_platform_post_model_creation(db_session: AsyncSession):
    from app.db.models import PlatformPost
    from datetime import datetime, timezone
    import uuid

    now = datetime.now(timezone.utc)
    post = PlatformPost(
        id=str(uuid.uuid4()),
        platform="youtube",
        post_type="community_post",
        body="Test model body",
        title="Test title",
        status="draft",
        delivery_status="pending",
        created_at=now,
        updated_at=now,
    )
    db_session.add(post)
    await db_session.commit()
    await db_session.refresh(post)

    assert post.id is not None
    assert post.platform == "youtube"
    assert post.post_type == "community_post"
    assert post.status == "draft"
    assert post.delivery_status == "pending"


# ---------------------------------------------------------------------------
# 10. EngagementTask community_post type
# ---------------------------------------------------------------------------

async def test_engagement_task_community_post(db_session: AsyncSession):
    from app.db.models import EngagementTask, User, ChannelProfile, PlatformConnection
    from datetime import datetime, timezone
    import uuid

    now = datetime.now(timezone.utc)
    user_id = str(uuid.uuid4())
    channel_id = str(uuid.uuid4())
    connection_id = str(uuid.uuid4())

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
        type="community_post",
        target_object_type="platform_post",
        target_object_id=str(uuid.uuid4()),
        final_user_input="Test community post content",
        status="pending",
        created_at=now,
        updated_at=now,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    assert task.type == "community_post"
    assert task.target_object_type == "platform_post"
    assert task.status == "pending"


# ---------------------------------------------------------------------------
# 11. Delivery capability check
# ---------------------------------------------------------------------------

async def test_delivery_capability_youtube_not_available():
    """YouTube community_post should return not_available."""
    from app.posts.service import check_delivery_capability

    can_deliver, reason = check_delivery_capability("youtube", "community_post")
    assert can_deliver is False
    assert "API destegi sunmuyor" in reason

    # Unknown platform defaults to not available
    can_deliver2, reason2 = check_delivery_capability("tiktok", "community_post")
    assert can_deliver2 is False
