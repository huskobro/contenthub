"""
Comment sync & reply schemas — Faz 7.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SyncedCommentResponse(BaseModel):
    id: str
    platform: str
    platform_connection_id: Optional[str] = None
    channel_profile_id: Optional[str] = None
    content_project_id: Optional[str] = None
    external_comment_id: str
    external_video_id: str
    external_parent_id: Optional[str] = None
    author_name: Optional[str] = None
    author_channel_id: Optional[str] = None
    author_avatar_url: Optional[str] = None
    text: str
    published_at: Optional[datetime] = None
    like_count: int = 0
    reply_count: int = 0
    is_reply: bool = False
    reply_status: str = "none"
    our_reply_text: Optional[str] = None
    our_reply_at: Optional[datetime] = None
    sync_status: str = "synced"
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CommentSyncRequest(BaseModel):
    video_id: str = Field(..., min_length=1, description="YouTube video ID")
    platform_connection_id: Optional[str] = Field(
        None, description="Optional — resolve from token store if absent"
    )


class CommentSyncResult(BaseModel):
    video_id: str
    total_fetched: int = 0
    new_comments: int = 0
    updated_comments: int = 0
    errors: list[str] = []


class CommentReplyRequest(BaseModel):
    comment_id: str = Field(..., min_length=1, description="SyncedComment.id (our internal ID)")
    reply_text: str = Field(..., min_length=1)


class CommentReplyResult(BaseModel):
    success: bool
    engagement_task_id: Optional[str] = None
    external_reply_id: Optional[str] = None
    error: Optional[str] = None


class SyncStatusItem(BaseModel):
    external_video_id: str
    comment_count: int = 0
    last_synced_at: Optional[datetime] = None
