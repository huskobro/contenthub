"""
Playlist management router — Faz 8.

Endpoints:
  POST /playlists/sync                — YouTube playlist'leri senkronla
  GET  /playlists                     — Playlist'leri filtreli listele
  GET  /playlists/sync-status         — Playlist bazinda sync durumu
  POST /playlists/create              — YouTube'da yeni playlist olustur
  GET  /playlists/{playlist_id}       — Playlist detayi
  POST /playlists/{playlist_id}/sync-items — Playlist item'larini senkronla
  GET  /playlists/{playlist_id}/items — Playlist item'larini listele
  POST /playlists/{playlist_id}/add-video — Playlist'e video ekle
  POST /playlists/{playlist_id}/remove-video — Playlist'ten video cikar
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

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


@router.post("/sync", response_model=PlaylistSyncResult)
async def sync_playlists(
    body: PlaylistSyncRequest,
    db: AsyncSession = Depends(get_db),
):
    """YouTube playlist'leri ceker ve yerel DB'ye kaydeder (upsert)."""
    result = await service.sync_playlists(
        db,
        platform_connection_id=body.platform_connection_id,
        channel_profile_id=body.channel_profile_id,
    )
    return PlaylistSyncResult(**result)


@router.get("/sync-status")
async def sync_status(db: AsyncSession = Depends(get_db)):
    """Playlist bazinda sync durumu."""
    return await service.get_sync_status(db)


@router.get("", response_model=List[SyncedPlaylistResponse])
async def list_playlists(
    channel_profile_id: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Playlist'leri filtreli listele."""
    return await service.list_playlists(
        db,
        channel_profile_id=channel_profile_id,
        platform=platform,
        limit=limit,
        offset=offset,
    )


@router.post("/create", response_model=PlaylistCreateResult)
async def create_playlist(
    body: PlaylistCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """YouTube'da yeni playlist olustur."""
    result = await service.create_playlist(
        db,
        title=body.title,
        description=body.description,
        privacy_status=body.privacy_status,
        platform_connection_id=body.platform_connection_id,
        channel_profile_id=body.channel_profile_id,
    )
    return PlaylistCreateResult(**result)


@router.get("/{playlist_id}", response_model=SyncedPlaylistResponse)
async def get_playlist(
    playlist_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Playlist detayi."""
    playlist = await service.get_playlist(db, playlist_id)
    if not playlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist bulunamadi.",
        )
    return playlist


@router.post("/{playlist_id}/sync-items", response_model=PlaylistItemSyncResult)
async def sync_playlist_items(
    playlist_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Belirli playlist'in item'larini YouTube'dan ceker."""
    result = await service.sync_playlist_items(db, playlist_id)
    return PlaylistItemSyncResult(**result)


@router.get("/{playlist_id}/items", response_model=List[SyncedPlaylistItemResponse])
async def list_playlist_items(
    playlist_id: str,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Playlist item'larini listele."""
    return await service.list_playlist_items(
        db, playlist_id, limit=limit, offset=offset,
    )


@router.post("/{playlist_id}/add-video", response_model=AddVideoToPlaylistResult)
async def add_video_to_playlist(
    playlist_id: str,
    body: AddVideoToPlaylistRequest,
    user_id: str = Query(..., description="Islem yapan kullanici ID"),
    db: AsyncSession = Depends(get_db),
):
    """Playlist'e video ekle."""
    result = await service.add_video_to_playlist(
        db,
        playlist_id=playlist_id,
        video_id=body.video_id,
        user_id=user_id,
        content_project_id=body.content_project_id,
        publish_record_id=body.publish_record_id,
    )
    return AddVideoToPlaylistResult(**result)


@router.post("/{playlist_id}/remove-video")
async def remove_video_from_playlist(
    playlist_id: str,
    body: RemoveVideoFromPlaylistRequest,
    db: AsyncSession = Depends(get_db),
):
    """Playlist'ten video cikar."""
    result = await service.remove_video_from_playlist(
        db,
        playlist_id=playlist_id,
        external_playlist_item_id=body.external_playlist_item_id,
    )
    return result
