"""
Faz 8 — Playlist management tests.

Tests:
1. Sync endpoint reachable
2. Playlist list returns array
3. Playlist list with filters
4. Playlist detail 404
5. Sync status endpoint
6. Playlist items endpoint (empty)
7. Add video to nonexistent playlist
8. SyncedPlaylist model creation
9. SyncedPlaylistItem model creation
10. Duplicate playlist protection (unique external_playlist_id)
11. Duplicate item protection (unique external_playlist_item_id)
12. EngagementTask playlist_add type
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/playlists"


# ---------------------------------------------------------------------------
# 1. Sync endpoint reachable
# ---------------------------------------------------------------------------

async def test_sync_endpoint_reachable(client: AsyncClient, user_headers: dict):
    """Sync endpoint should be registered and accept POST."""
    resp = await client.post(f"{BASE}/sync", json={}, headers=user_headers)
    # Expect auth error (no YouTube token) or 200 or 500 (token store not configured)
    assert resp.status_code in (200, 500, 422), f"Unexpected: {resp.status_code} — {resp.text}"


# ---------------------------------------------------------------------------
# 2-3. Playlist list
# ---------------------------------------------------------------------------

async def test_playlist_list_returns_array(client: AsyncClient, user_headers: dict):
    """Playlist list should return empty array."""
    resp = await client.get(BASE, headers=user_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_playlist_list_with_filters(client: AsyncClient, user_headers: dict):
    """Playlist list accepts filter params."""
    resp = await client.get(BASE, params={
        "platform": "youtube",
        "limit": 50,
        "offset": 0,
    }, headers=user_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ---------------------------------------------------------------------------
# 4. Playlist detail 404
# ---------------------------------------------------------------------------

async def test_playlist_detail_404(client: AsyncClient, user_headers: dict):
    resp = await client.get(f"{BASE}/nonexistent-id-12345", headers=user_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 5. Sync status
# ---------------------------------------------------------------------------

async def test_sync_status_returns_array(client: AsyncClient, user_headers: dict):
    resp = await client.get(f"{BASE}/sync-status", headers=user_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ---------------------------------------------------------------------------
# 6. Playlist items (empty playlist)
# ---------------------------------------------------------------------------

async def test_playlist_items_empty(client: AsyncClient, db_session: AsyncSession, user_headers: dict):
    """Items endpoint for a real playlist should return empty list."""
    from app.db.models import SyncedPlaylist
    from datetime import datetime, timezone
    import uuid

    now = datetime.now(timezone.utc)
    pl = SyncedPlaylist(
        id=str(uuid.uuid4()),
        platform="youtube",
        external_playlist_id=f"PL_{uuid.uuid4().hex[:12]}",
        title="Test Playlist Items",
        sync_status="synced",
        created_at=now, updated_at=now,
    )
    db_session.add(pl)
    await db_session.commit()

    resp = await client.get(f"{BASE}/{pl.id}/items", headers=user_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) == 0


# ---------------------------------------------------------------------------
# 7. Add video to nonexistent playlist
# ---------------------------------------------------------------------------

async def test_add_video_nonexistent_playlist(client: AsyncClient, user_headers: dict):
    resp = await client.post(
        f"{BASE}/nonexistent-id-12345/add-video",
        params={"user_id": "test-user"},
        json={
            "playlist_id": "nonexistent-id-12345",
            "video_id": "dQw4w9WgXcQ",
        },
        headers=user_headers,
    )
    assert resp.status_code in (200, 404)
    if resp.status_code == 200:
        data = resp.json()
        assert data["success"] is False


# ---------------------------------------------------------------------------
# 8. SyncedPlaylist model creation
# ---------------------------------------------------------------------------

async def test_synced_playlist_model_creation(db_session: AsyncSession):
    from app.db.models import SyncedPlaylist
    from datetime import datetime, timezone
    import uuid

    pl = SyncedPlaylist(
        id=str(uuid.uuid4()),
        platform="youtube",
        external_playlist_id=f"PL_{uuid.uuid4().hex[:12]}",
        title="Test Playlist",
        description="Test description",
        privacy_status="private",
        item_count=5,
        sync_status="synced",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(pl)
    await db_session.commit()
    await db_session.refresh(pl)

    assert pl.id is not None
    assert pl.platform == "youtube"
    assert pl.title == "Test Playlist"
    assert pl.item_count == 5


# ---------------------------------------------------------------------------
# 9. SyncedPlaylistItem model creation
# ---------------------------------------------------------------------------

async def test_synced_playlist_item_creation(db_session: AsyncSession):
    from app.db.models import SyncedPlaylist, SyncedPlaylistItem
    from datetime import datetime, timezone
    import uuid

    now = datetime.now(timezone.utc)
    pl = SyncedPlaylist(
        id=str(uuid.uuid4()),
        platform="youtube",
        external_playlist_id=f"PL_{uuid.uuid4().hex[:12]}",
        title="Parent Playlist",
        sync_status="synced",
        created_at=now, updated_at=now,
    )
    db_session.add(pl)
    await db_session.flush()

    item = SyncedPlaylistItem(
        id=str(uuid.uuid4()),
        playlist_id=pl.id,
        external_video_id="dQw4w9WgXcQ",
        external_playlist_item_id=f"PLI_{uuid.uuid4().hex[:12]}",
        title="Test Video",
        position=0,
        synced_at=now,
        created_at=now, updated_at=now,
    )
    db_session.add(item)
    await db_session.commit()
    await db_session.refresh(item)

    assert item.playlist_id == pl.id
    assert item.external_video_id == "dQw4w9WgXcQ"
    assert item.position == 0


# ---------------------------------------------------------------------------
# 10. Duplicate playlist protection
# ---------------------------------------------------------------------------

async def test_duplicate_playlist_protection(db_session: AsyncSession):
    from app.db.models import SyncedPlaylist
    from datetime import datetime, timezone
    from sqlalchemy.exc import IntegrityError
    import uuid

    ext_id = f"PL_DUPE_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)
    base = {
        "platform": "youtube",
        "external_playlist_id": ext_id,
        "title": "Duplicate Test",
        "sync_status": "synced",
        "created_at": now, "updated_at": now,
    }

    p1 = SyncedPlaylist(id=str(uuid.uuid4()), **base)
    db_session.add(p1)
    await db_session.commit()

    p2 = SyncedPlaylist(id=str(uuid.uuid4()), **base)
    db_session.add(p2)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


# ---------------------------------------------------------------------------
# 11. Duplicate item protection
# ---------------------------------------------------------------------------

async def test_duplicate_item_protection(db_session: AsyncSession):
    from app.db.models import SyncedPlaylist, SyncedPlaylistItem
    from datetime import datetime, timezone
    from sqlalchemy.exc import IntegrityError
    import uuid

    now = datetime.now(timezone.utc)
    pl = SyncedPlaylist(
        id=str(uuid.uuid4()),
        platform="youtube",
        external_playlist_id=f"PL_{uuid.uuid4().hex[:12]}",
        title="Dupe Item Test",
        sync_status="synced",
        created_at=now, updated_at=now,
    )
    db_session.add(pl)
    await db_session.flush()

    ext_item_id = f"PLI_DUPE_{uuid.uuid4().hex[:8]}"
    base = {
        "playlist_id": pl.id,
        "external_video_id": "dQw4w9WgXcQ",
        "external_playlist_item_id": ext_item_id,
        "position": 0,
        "created_at": now, "updated_at": now,
    }

    i1 = SyncedPlaylistItem(id=str(uuid.uuid4()), **base)
    db_session.add(i1)
    await db_session.commit()

    i2 = SyncedPlaylistItem(id=str(uuid.uuid4()), **base)
    db_session.add(i2)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


# ---------------------------------------------------------------------------
# 12. EngagementTask playlist_add type
# ---------------------------------------------------------------------------

async def test_engagement_task_playlist_add(db_session: AsyncSession):
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
        type="playlist_add",
        target_object_type="youtube_playlist",
        target_object_id="PLxxxxxxxxxxxxxxxxxxxxxxxxxx",
        final_user_input="Video dQw4w9WgXcQ added to playlist Test",
        status="executed",
        executed_at=now,
        created_at=now,
        updated_at=now,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    assert task.type == "playlist_add"
    assert task.target_object_type == "youtube_playlist"
    assert task.status == "executed"
