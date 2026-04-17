"""
Playlist management router — Faz 8 + Phase Final F2 ownership guard.

Endpoints:
  POST /playlists/sync                — YouTube playlist'leri senkronla (owner-only)
  GET  /playlists                     — Playlist'leri filtreli listele (owner-scoped)
  GET  /playlists/sync-status         — Playlist bazinda sync durumu (owner-scoped)
  POST /playlists/create              — YouTube'da yeni playlist olustur (owner-only)
  GET  /playlists/{playlist_id}       — Playlist detayi (owner or admin)
  POST /playlists/{playlist_id}/sync-items — Playlist item'larini senkronla (owner or admin)
  GET  /playlists/{playlist_id}/items — Playlist item'larini listele (owner or admin)
  POST /playlists/{playlist_id}/add-video — Playlist'e video ekle (owner or admin)
  POST /playlists/{playlist_id}/remove-video — Playlist'ten video cikar (owner or admin)

Ownership: SyncedPlaylist is scoped via its channel_profile_id → ChannelProfile.user_id.
The legacy `user_id` query parameter on add-video is removed; the caller is
identified via UserContext.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import UserContext, get_current_user_context, ensure_owner_or_admin
from app.db.models import ChannelProfile, SyncedPlaylist
from app.db.session import get_db
from app.playlists import service
from app.playlists.schemas import (
    SyncedPlaylistResponse,
    SyncedPlaylistItemResponse,
    PlaylistSyncRequest,
    PlaylistSyncResult,
    PlaylistItemSyncResult,
    PlaylistCreateRequest,
    PlaylistCreateResult,
    AddVideoToPlaylistRequest,
    AddVideoToPlaylistResult,
    RemoveVideoFromPlaylistRequest,
)

router = APIRouter(prefix="/playlists", tags=["Playlists"])


# ---------------------------------------------------------------------------
# Ownership helpers
# ---------------------------------------------------------------------------

async def _scope_channel_ids(db: AsyncSession, ctx: UserContext) -> Optional[List[str]]:
    if ctx.is_admin:
        return None
    result = await db.execute(
        select(ChannelProfile.id).where(ChannelProfile.user_id == ctx.user_id)
    )
    return [row[0] for row in result.all()]


async def _enforce_channel_ownership(
    db: AsyncSession, ctx: UserContext, channel_profile_id: Optional[str]
) -> None:
    if ctx.is_admin or channel_profile_id is None:
        return
    cp = await db.get(ChannelProfile, channel_profile_id)
    if cp is None:
        raise HTTPException(status_code=404, detail="Channel profile not found")
    ensure_owner_or_admin(ctx, cp.user_id, resource_label="channel")


async def _enforce_playlist_ownership(
    db: AsyncSession, ctx: UserContext, playlist: SyncedPlaylist
) -> None:
    if ctx.is_admin:
        return
    if playlist.channel_profile_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu playlist'e erisim yetkiniz yok",
        )
    cp = await db.get(ChannelProfile, playlist.channel_profile_id)
    owner = cp.user_id if cp else None
    ensure_owner_or_admin(ctx, owner, resource_label="playlist")


# ---------------------------------------------------------------------------
# Sync (owner-only)
# ---------------------------------------------------------------------------

@router.post("/sync", response_model=PlaylistSyncResult)
async def sync_playlists(
    body: PlaylistSyncRequest,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """YouTube playlist'leri ceker ve yerel DB'ye kaydeder (owner-only)."""
    await _enforce_channel_ownership(db, ctx, body.channel_profile_id)

    result = await service.sync_playlists(
        db,
        platform_connection_id=body.platform_connection_id,
        channel_profile_id=body.channel_profile_id,
    )
    return PlaylistSyncResult(**result)


@router.get("/sync-status")
async def sync_status(
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Playlist bazinda sync durumu (owner-scoped for non-admin)."""
    channel_ids = await _scope_channel_ids(db, ctx)
    return await service.get_sync_status(db, channel_profile_ids=channel_ids)


# ---------------------------------------------------------------------------
# List (owner-scoped)
# ---------------------------------------------------------------------------

@router.get("", response_model=List[SyncedPlaylistResponse])
async def list_playlists(
    channel_profile_id: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Playlist'leri filtreli listele — owner-scoped for non-admin."""
    if channel_profile_id is not None:
        await _enforce_channel_ownership(db, ctx, channel_profile_id)
        channel_ids: Optional[List[str]] = [channel_profile_id]
    else:
        channel_ids = await _scope_channel_ids(db, ctx)

    return await service.list_playlists(
        db,
        channel_profile_id=None,
        channel_profile_ids=channel_ids,
        platform=platform,
        limit=limit,
        offset=offset,
    )


@router.post("/create", response_model=PlaylistCreateResult)
async def create_playlist(
    body: PlaylistCreateRequest,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """YouTube'da yeni playlist olustur (owner-only for non-admin)."""
    await _enforce_channel_ownership(db, ctx, body.channel_profile_id)

    result = await service.create_playlist(
        db,
        title=body.title,
        description=body.description,
        privacy_status=body.privacy_status,
        platform_connection_id=body.platform_connection_id,
        channel_profile_id=body.channel_profile_id,
    )
    return PlaylistCreateResult(**result)


# ---------------------------------------------------------------------------
# Single-resource endpoints (owner or admin)
# ---------------------------------------------------------------------------

@router.get("/{playlist_id}", response_model=SyncedPlaylistResponse)
async def get_playlist(
    playlist_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Playlist detayi (owner or admin)."""
    playlist = await service.get_playlist(db, playlist_id)
    if not playlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist bulunamadi.",
        )
    await _enforce_playlist_ownership(db, ctx, playlist)
    return playlist


@router.post("/{playlist_id}/sync-items", response_model=PlaylistItemSyncResult)
async def sync_playlist_items(
    playlist_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Belirli playlist'in item'larini YouTube'dan ceker (owner or admin)."""
    playlist = await service.get_playlist(db, playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist bulunamadi.")
    await _enforce_playlist_ownership(db, ctx, playlist)

    result = await service.sync_playlist_items(db, playlist_id)
    return PlaylistItemSyncResult(**result)


@router.get("/{playlist_id}/items", response_model=List[SyncedPlaylistItemResponse])
async def list_playlist_items(
    playlist_id: str,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Playlist item'larini listele (owner or admin)."""
    playlist = await service.get_playlist(db, playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist bulunamadi.")
    await _enforce_playlist_ownership(db, ctx, playlist)

    return await service.list_playlist_items(
        db, playlist_id, limit=limit, offset=offset,
    )


@router.post("/{playlist_id}/add-video", response_model=AddVideoToPlaylistResult)
async def add_video_to_playlist(
    playlist_id: str,
    body: AddVideoToPlaylistRequest,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Playlist'e video ekle (owner or admin). Caller id is UserContext."""
    playlist = await service.get_playlist(db, playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist bulunamadi.")
    await _enforce_playlist_ownership(db, ctx, playlist)

    # Admin acting on behalf of owner: attribute the add to the channel owner.
    if ctx.is_admin and playlist.channel_profile_id:
        cp = await db.get(ChannelProfile, playlist.channel_profile_id)
        effective_user_id = cp.user_id if cp else ctx.user_id
    else:
        effective_user_id = ctx.user_id

    result = await service.add_video_to_playlist(
        db,
        playlist_id=playlist_id,
        video_id=body.video_id,
        user_id=effective_user_id,
        content_project_id=body.content_project_id,
        publish_record_id=body.publish_record_id,
    )
    return AddVideoToPlaylistResult(**result)


@router.post("/{playlist_id}/remove-video")
async def remove_video_from_playlist(
    playlist_id: str,
    body: RemoveVideoFromPlaylistRequest,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Playlist'ten video cikar (owner or admin)."""
    playlist = await service.get_playlist(db, playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist bulunamadi.")
    await _enforce_playlist_ownership(db, ctx, playlist)

    result = await service.remove_video_from_playlist(
        db,
        playlist_id=playlist_id,
        external_playlist_item_id=body.external_playlist_item_id,
    )
    return result
