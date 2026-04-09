"""
Playlist sync & management service — Faz 8.

YouTube playlist CRUD ve item yonetimi.
YouTube Data API v3 uzerinden httpx ile calisir.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import SyncedPlaylist, SyncedPlaylistItem, EngagementTask
from app.publish.youtube.token_store import YouTubeTokenStore
from app.publish.youtube.errors import YouTubeAuthError

logger = logging.getLogger(__name__)

# YouTube API endpoints
YT_PLAYLISTS_URL = "https://www.googleapis.com/youtube/v3/playlists"
YT_PLAYLIST_ITEMS_URL = "https://www.googleapis.com/youtube/v3/playlistItems"

MAX_PLAYLISTS_PER_SYNC = 200
MAX_ITEMS_PER_SYNC = 500


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _get_access_token(token_store: Optional[YouTubeTokenStore] = None) -> str:
    store = token_store or YouTubeTokenStore()
    return await store.get_access_token()


# ---------------------------------------------------------------------------
# Playlist Sync
# ---------------------------------------------------------------------------

async def sync_playlists(
    db: AsyncSession,
    token_store: Optional[YouTubeTokenStore] = None,
    platform_connection_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
) -> dict:
    """
    YouTube playlists.list API ile kullanicinin tum playlist'lerini ceker ve DB'ye upsert eder.
    """
    errors: list[str] = []
    total_fetched = 0
    new_playlists = 0
    updated_playlists = 0

    try:
        access_token = await _get_access_token(token_store)
    except YouTubeAuthError as exc:
        return {
            "total_fetched": 0,
            "new_playlists": 0,
            "updated_playlists": 0,
            "errors": [f"Auth hatasi: {exc}"],
        }

    headers = {"Authorization": f"Bearer {access_token}"}
    next_page_token: Optional[str] = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        while total_fetched < MAX_PLAYLISTS_PER_SYNC:
            params: dict = {
                "part": "snippet,status,contentDetails",
                "mine": "true",
                "maxResults": 50,
            }
            if next_page_token:
                params["pageToken"] = next_page_token

            try:
                resp = await client.get(YT_PLAYLISTS_URL, headers=headers, params=params)
            except httpx.HTTPError as exc:
                errors.append(f"HTTP hatasi: {exc}")
                break

            if resp.status_code == 403:
                errors.append("YouTube API 403 — Erisim reddedildi veya kota asimi.")
                break
            if resp.status_code != 200:
                errors.append(f"YouTube API hatasi: HTTP {resp.status_code} — {resp.text[:200]}")
                break

            data = resp.json()
            items = data.get("items", [])
            if not items:
                break

            for item in items:
                total_fetched += 1
                ext_id = item.get("id", "")
                snippet = item.get("snippet", {})
                status_obj = item.get("status", {})
                content_details = item.get("contentDetails", {})

                # Thumbnails
                thumbs = snippet.get("thumbnails", {})
                thumb_url = (
                    thumbs.get("medium", {}).get("url")
                    or thumbs.get("default", {}).get("url")
                )

                is_new, is_updated = await _upsert_playlist(
                    db,
                    external_playlist_id=ext_id,
                    title=snippet.get("title", ""),
                    description=snippet.get("description"),
                    privacy_status=status_obj.get("privacyStatus", "private"),
                    item_count=content_details.get("itemCount", 0),
                    thumbnail_url=thumb_url,
                    platform_connection_id=platform_connection_id,
                    channel_profile_id=channel_profile_id,
                )
                if is_new:
                    new_playlists += 1
                elif is_updated:
                    updated_playlists += 1

            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break

    try:
        await db.commit()
    except Exception as exc:
        errors.append(f"DB commit hatasi: {exc}")
        await db.rollback()

    return {
        "total_fetched": total_fetched,
        "new_playlists": new_playlists,
        "updated_playlists": updated_playlists,
        "errors": errors,
    }


async def _upsert_playlist(
    db: AsyncSession,
    external_playlist_id: str,
    title: str,
    description: Optional[str],
    privacy_status: str,
    item_count: int,
    thumbnail_url: Optional[str],
    platform_connection_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
) -> tuple[bool, bool]:
    """Upsert a playlist. Returns (is_new, is_updated)."""
    stmt = select(SyncedPlaylist).where(
        SyncedPlaylist.external_playlist_id == external_playlist_id
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    now = _now()

    if existing:
        changed = False
        for field, new_val in [
            ("title", title),
            ("description", description),
            ("privacy_status", privacy_status),
            ("item_count", item_count),
            ("thumbnail_url", thumbnail_url),
        ]:
            if new_val is not None and getattr(existing, field) != new_val:
                setattr(existing, field, new_val)
                changed = True
        existing.last_synced_at = now
        existing.sync_status = "synced"
        existing.updated_at = now
        return (False, changed)
    else:
        playlist = SyncedPlaylist(
            platform="youtube",
            platform_connection_id=platform_connection_id,
            channel_profile_id=channel_profile_id,
            external_playlist_id=external_playlist_id,
            title=title,
            description=description,
            privacy_status=privacy_status,
            item_count=item_count,
            thumbnail_url=thumbnail_url,
            sync_status="synced",
            last_synced_at=now,
        )
        db.add(playlist)
        return (True, False)


# ---------------------------------------------------------------------------
# Playlist Item Sync (lazy — on playlist detail)
# ---------------------------------------------------------------------------

async def sync_playlist_items(
    db: AsyncSession,
    playlist_id: str,
    token_store: Optional[YouTubeTokenStore] = None,
) -> dict:
    """
    Belirli bir playlist'in item'larini YouTube API'den ceker ve DB'ye upsert eder.
    """
    playlist = await db.get(SyncedPlaylist, playlist_id)
    if not playlist:
        return {
            "playlist_id": playlist_id,
            "total_fetched": 0,
            "new_items": 0,
            "updated_items": 0,
            "errors": [f"Playlist bulunamadi: {playlist_id}"],
        }

    errors: list[str] = []
    total_fetched = 0
    new_items = 0
    updated_items = 0

    try:
        access_token = await _get_access_token(token_store)
    except YouTubeAuthError as exc:
        return {
            "playlist_id": playlist_id,
            "total_fetched": 0,
            "new_items": 0,
            "updated_items": 0,
            "errors": [f"Auth hatasi: {exc}"],
        }

    headers = {"Authorization": f"Bearer {access_token}"}
    next_page_token: Optional[str] = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        while total_fetched < MAX_ITEMS_PER_SYNC:
            params: dict = {
                "part": "snippet,contentDetails",
                "playlistId": playlist.external_playlist_id,
                "maxResults": 50,
            }
            if next_page_token:
                params["pageToken"] = next_page_token

            try:
                resp = await client.get(YT_PLAYLIST_ITEMS_URL, headers=headers, params=params)
            except httpx.HTTPError as exc:
                errors.append(f"HTTP hatasi: {exc}")
                break

            if resp.status_code != 200:
                errors.append(f"YouTube API hatasi: HTTP {resp.status_code} — {resp.text[:200]}")
                break

            data = resp.json()
            items = data.get("items", [])
            if not items:
                break

            for item in items:
                total_fetched += 1
                snippet = item.get("snippet", {})
                content_details = item.get("contentDetails", {})
                ext_item_id = item.get("id", "")
                video_id = content_details.get("videoId") or snippet.get("resourceId", {}).get("videoId", "")
                position = snippet.get("position", 0)

                thumbs = snippet.get("thumbnails", {})
                thumb_url = (
                    thumbs.get("medium", {}).get("url")
                    or thumbs.get("default", {}).get("url")
                )

                is_new, is_updated = await _upsert_playlist_item(
                    db,
                    playlist_id=playlist.id,
                    external_video_id=video_id,
                    external_playlist_item_id=ext_item_id,
                    title=snippet.get("title"),
                    thumbnail_url=thumb_url,
                    position=position,
                )
                if is_new:
                    new_items += 1
                elif is_updated:
                    updated_items += 1

            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break

    # Update playlist item_count
    playlist.item_count = total_fetched if total_fetched > 0 else playlist.item_count
    playlist.last_synced_at = _now()
    playlist.updated_at = _now()

    try:
        await db.commit()
    except Exception as exc:
        errors.append(f"DB commit hatasi: {exc}")
        await db.rollback()

    return {
        "playlist_id": playlist_id,
        "total_fetched": total_fetched,
        "new_items": new_items,
        "updated_items": updated_items,
        "errors": errors,
    }


async def _upsert_playlist_item(
    db: AsyncSession,
    playlist_id: str,
    external_video_id: str,
    external_playlist_item_id: Optional[str],
    title: Optional[str],
    thumbnail_url: Optional[str],
    position: int,
) -> tuple[bool, bool]:
    """Upsert a playlist item. Returns (is_new, is_updated)."""
    now = _now()

    if external_playlist_item_id:
        stmt = select(SyncedPlaylistItem).where(
            SyncedPlaylistItem.external_playlist_item_id == external_playlist_item_id
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
    else:
        # Fallback: match by playlist_id + external_video_id
        stmt = select(SyncedPlaylistItem).where(
            SyncedPlaylistItem.playlist_id == playlist_id,
            SyncedPlaylistItem.external_video_id == external_video_id,
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()

    if existing:
        changed = False
        for field, new_val in [
            ("title", title),
            ("thumbnail_url", thumbnail_url),
            ("position", position),
        ]:
            if new_val is not None and getattr(existing, field) != new_val:
                setattr(existing, field, new_val)
                changed = True
        existing.synced_at = now
        existing.updated_at = now
        return (False, changed)
    else:
        item = SyncedPlaylistItem(
            playlist_id=playlist_id,
            external_video_id=external_video_id,
            external_playlist_item_id=external_playlist_item_id,
            title=title,
            thumbnail_url=thumbnail_url,
            position=position,
            synced_at=now,
        )
        db.add(item)
        return (True, False)


# ---------------------------------------------------------------------------
# Playlist CRUD
# ---------------------------------------------------------------------------

async def create_playlist(
    db: AsyncSession,
    title: str,
    description: str = "",
    privacy_status: str = "private",
    token_store: Optional[YouTubeTokenStore] = None,
    platform_connection_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
) -> dict:
    """YouTube'da yeni playlist olustur ve DB'ye kaydet."""
    try:
        access_token = await _get_access_token(token_store)
    except YouTubeAuthError as exc:
        return {
            "success": False,
            "playlist_id": None,
            "external_playlist_id": None,
            "error": f"Auth hatasi: {exc}",
        }

    body = {
        "snippet": {
            "title": title,
            "description": description,
        },
        "status": {
            "privacyStatus": privacy_status,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                YT_PLAYLISTS_URL,
                params={"part": "snippet,status"},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json=body,
            )

        if resp.status_code not in (200, 201):
            return {
                "success": False,
                "playlist_id": None,
                "external_playlist_id": None,
                "error": f"YouTube API hatasi: HTTP {resp.status_code} — {resp.text[:300]}",
            }

        data = resp.json()
        ext_id = data.get("id", "")

    except httpx.HTTPError as exc:
        return {
            "success": False,
            "playlist_id": None,
            "external_playlist_id": None,
            "error": f"HTTP hatasi: {exc}",
        }

    # Save to DB
    playlist = SyncedPlaylist(
        platform="youtube",
        platform_connection_id=platform_connection_id,
        channel_profile_id=channel_profile_id,
        external_playlist_id=ext_id,
        title=title,
        description=description,
        privacy_status=privacy_status,
        item_count=0,
        sync_status="synced",
        last_synced_at=_now(),
    )
    db.add(playlist)

    try:
        await db.commit()
        await db.refresh(playlist)
    except Exception as exc:
        await db.rollback()
        return {
            "success": True,
            "playlist_id": None,
            "external_playlist_id": ext_id,
            "error": f"YouTube'da olusturuldu ama DB kaydi basarisiz: {exc}",
        }

    return {
        "success": True,
        "playlist_id": playlist.id,
        "external_playlist_id": ext_id,
        "error": None,
    }


# ---------------------------------------------------------------------------
# Add / Remove Video from Playlist
# ---------------------------------------------------------------------------

async def add_video_to_playlist(
    db: AsyncSession,
    playlist_id: str,
    video_id: str,
    user_id: str,
    content_project_id: Optional[str] = None,
    publish_record_id: Optional[str] = None,
    token_store: Optional[YouTubeTokenStore] = None,
) -> dict:
    """YouTube playlist'e video ekle, EngagementTask olustur."""
    playlist = await db.get(SyncedPlaylist, playlist_id)
    if not playlist:
        return {
            "success": False,
            "engagement_task_id": None,
            "external_playlist_item_id": None,
            "error": f"Playlist bulunamadi: {playlist_id}",
        }

    # Duplicate check
    dup_stmt = select(SyncedPlaylistItem).where(
        SyncedPlaylistItem.playlist_id == playlist_id,
        SyncedPlaylistItem.external_video_id == video_id,
    )
    dup_result = await db.execute(dup_stmt)
    if dup_result.scalar_one_or_none():
        return {
            "success": False,
            "engagement_task_id": None,
            "external_playlist_item_id": None,
            "error": f"Bu video zaten bu playlist'te: {video_id}",
        }

    try:
        access_token = await _get_access_token(token_store)
    except YouTubeAuthError as exc:
        return {
            "success": False,
            "engagement_task_id": None,
            "external_playlist_item_id": None,
            "error": f"Auth hatasi: {exc}",
        }

    body = {
        "snippet": {
            "playlistId": playlist.external_playlist_id,
            "resourceId": {
                "kind": "youtube#video",
                "videoId": video_id,
            },
        }
    }

    ext_item_id: Optional[str] = None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                YT_PLAYLIST_ITEMS_URL,
                params={"part": "snippet"},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json=body,
            )

        if resp.status_code not in (200, 201):
            return {
                "success": False,
                "engagement_task_id": None,
                "external_playlist_item_id": None,
                "error": f"YouTube API hatasi: HTTP {resp.status_code} — {resp.text[:300]}",
            }

        data = resp.json()
        ext_item_id = data.get("id")

    except httpx.HTTPError as exc:
        return {
            "success": False,
            "engagement_task_id": None,
            "external_playlist_item_id": None,
            "error": f"HTTP hatasi: {exc}",
        }

    now = _now()

    # Save playlist item
    item = SyncedPlaylistItem(
        playlist_id=playlist_id,
        external_video_id=video_id,
        external_playlist_item_id=ext_item_id,
        content_project_id=content_project_id,
        publish_record_id=publish_record_id,
        position=playlist.item_count,
        synced_at=now,
    )
    db.add(item)

    # Update playlist item count
    playlist.item_count = (playlist.item_count or 0) + 1
    playlist.updated_at = now

    # Create EngagementTask
    task = EngagementTask(
        user_id=user_id,
        channel_profile_id=playlist.channel_profile_id or "",
        platform_connection_id=playlist.platform_connection_id or "",
        content_project_id=content_project_id,
        type="playlist_add",
        target_object_type="youtube_playlist",
        target_object_id=playlist.external_playlist_id,
        final_user_input=f"Video {video_id} added to playlist {playlist.title}",
        status="executed",
        executed_at=now,
    )
    db.add(task)

    try:
        await db.commit()
        await db.refresh(task)
    except Exception as exc:
        await db.rollback()
        return {
            "success": True,
            "engagement_task_id": None,
            "external_playlist_item_id": ext_item_id,
            "error": f"YouTube'a eklendi ama DB kaydi basarisiz: {exc}",
        }

    return {
        "success": True,
        "engagement_task_id": task.id,
        "external_playlist_item_id": ext_item_id,
        "error": None,
    }


async def remove_video_from_playlist(
    db: AsyncSession,
    playlist_id: str,
    external_playlist_item_id: str,
    token_store: Optional[YouTubeTokenStore] = None,
) -> dict:
    """YouTube playlist'ten item sil."""
    # Find item
    stmt = select(SyncedPlaylistItem).where(
        SyncedPlaylistItem.playlist_id == playlist_id,
        SyncedPlaylistItem.external_playlist_item_id == external_playlist_item_id,
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()

    if not item:
        return {"success": False, "error": f"Playlist item bulunamadi: {external_playlist_item_id}"}

    try:
        access_token = await _get_access_token(token_store)
    except YouTubeAuthError as exc:
        return {"success": False, "error": f"Auth hatasi: {exc}"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.delete(
                YT_PLAYLIST_ITEMS_URL,
                params={"id": external_playlist_item_id},
                headers={"Authorization": f"Bearer {access_token}"},
            )

        if resp.status_code not in (200, 204):
            return {
                "success": False,
                "error": f"YouTube API hatasi: HTTP {resp.status_code} — {resp.text[:300]}",
            }

    except httpx.HTTPError as exc:
        return {"success": False, "error": f"HTTP hatasi: {exc}"}

    # Remove from DB
    await db.delete(item)

    # Update playlist item count
    playlist = await db.get(SyncedPlaylist, playlist_id)
    if playlist:
        playlist.item_count = max(0, (playlist.item_count or 0) - 1)
        playlist.updated_at = _now()

    try:
        await db.commit()
    except Exception as exc:
        await db.rollback()
        return {"success": False, "error": f"DB silme hatasi: {exc}"}

    return {"success": True, "error": None}


# ---------------------------------------------------------------------------
# List / Get helpers
# ---------------------------------------------------------------------------

async def list_playlists(
    db: AsyncSession,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> list[SyncedPlaylist]:
    """Playlist'leri filtreli listele."""
    q = select(SyncedPlaylist).order_by(SyncedPlaylist.updated_at.desc())
    if channel_profile_id:
        q = q.where(SyncedPlaylist.channel_profile_id == channel_profile_id)
    if platform:
        q = q.where(SyncedPlaylist.platform == platform)
    q = q.offset(offset).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_playlist(db: AsyncSession, playlist_id: str) -> Optional[SyncedPlaylist]:
    return await db.get(SyncedPlaylist, playlist_id)


async def list_playlist_items(
    db: AsyncSession,
    playlist_id: str,
    limit: int = 200,
    offset: int = 0,
) -> list[SyncedPlaylistItem]:
    q = (
        select(SyncedPlaylistItem)
        .where(SyncedPlaylistItem.playlist_id == playlist_id)
        .order_by(SyncedPlaylistItem.position.asc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_sync_status(db: AsyncSession) -> list[dict]:
    """Playlist bazinda sync ozeti."""
    stmt = (
        select(
            SyncedPlaylist.id,
            SyncedPlaylist.title,
            SyncedPlaylist.external_playlist_id,
            SyncedPlaylist.item_count,
            SyncedPlaylist.sync_status,
            SyncedPlaylist.last_synced_at,
        )
        .order_by(SyncedPlaylist.updated_at.desc())
    )
    result = await db.execute(stmt)
    return [
        {
            "id": row.id,
            "title": row.title,
            "external_playlist_id": row.external_playlist_id,
            "item_count": row.item_count,
            "sync_status": row.sync_status,
            "last_synced_at": row.last_synced_at,
        }
        for row in result.all()
    ]
