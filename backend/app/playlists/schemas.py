"""
Playlist sync & management schemas — Faz 8.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SyncedPlaylistResponse(BaseModel):
    id: str
    platform: str
    platform_connection_id: Optional[str] = None
    channel_profile_id: Optional[str] = None
    external_playlist_id: str
    title: str
    description: Optional[str] = None
    privacy_status: str = "private"
    item_count: int = 0
    thumbnail_url: Optional[str] = None
    sync_status: str = "synced"
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SyncedPlaylistItemResponse(BaseModel):
    id: str
    playlist_id: str
    external_video_id: str
    external_playlist_item_id: Optional[str] = None
    content_project_id: Optional[str] = None
    publish_record_id: Optional[str] = None
    title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    position: int = 0
    synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PlaylistSyncRequest(BaseModel):
    platform_connection_id: Optional[str] = Field(
        None, description="Optional — resolve from token store if absent"
    )
    channel_profile_id: Optional[str] = None


class PlaylistSyncResult(BaseModel):
    total_fetched: int = 0
    new_playlists: int = 0
    updated_playlists: int = 0
    errors: list[str] = []


class PlaylistItemSyncResult(BaseModel):
    playlist_id: str
    total_fetched: int = 0
    new_items: int = 0
    updated_items: int = 0
    errors: list[str] = []


class PlaylistCreateRequest(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = ""
    privacy_status: str = Field("private", pattern="^(public|unlisted|private)$")
    channel_profile_id: Optional[str] = None
    platform_connection_id: Optional[str] = None


class PlaylistCreateResult(BaseModel):
    success: bool
    playlist_id: Optional[str] = None
    external_playlist_id: Optional[str] = None
    error: Optional[str] = None


class AddVideoToPlaylistRequest(BaseModel):
    playlist_id: str = Field(..., min_length=1, description="SyncedPlaylist.id (internal)")
    video_id: str = Field(..., min_length=1, description="YouTube video ID")
    content_project_id: Optional[str] = None
    publish_record_id: Optional[str] = None


class AddVideoToPlaylistResult(BaseModel):
    success: bool
    engagement_task_id: Optional[str] = None
    external_playlist_item_id: Optional[str] = None
    error: Optional[str] = None


class RemoveVideoFromPlaylistRequest(BaseModel):
    playlist_id: str = Field(..., min_length=1)
    external_playlist_item_id: str = Field(..., min_length=1)
