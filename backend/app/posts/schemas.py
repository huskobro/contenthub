"""
Platform post schemas — Faz 9.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PlatformPostResponse(BaseModel):
    id: str
    platform: str
    platform_connection_id: Optional[str] = None
    channel_profile_id: Optional[str] = None
    content_project_id: Optional[str] = None
    publish_record_id: Optional[str] = None
    external_post_id: Optional[str] = None
    post_type: str = "community_post"
    title: Optional[str] = None
    body: str = ""
    status: str = "draft"
    scheduled_for: Optional[datetime] = None
    posted_at: Optional[datetime] = None
    delivery_status: str = "pending"
    delivery_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PostCreateRequest(BaseModel):
    platform: str = Field("youtube", description="Hedef platform")
    channel_profile_id: Optional[str] = None
    platform_connection_id: Optional[str] = None
    content_project_id: Optional[str] = None
    publish_record_id: Optional[str] = None
    post_type: str = Field("community_post", description="Gonderi tipi")
    title: Optional[str] = None
    body: str = Field(..., min_length=1, description="Gonderi metni")
    scheduled_for: Optional[datetime] = None


class PostUpdateRequest(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    scheduled_for: Optional[datetime] = None


class PostSubmitRequest(BaseModel):
    """Draft gonderiyi gonderim kuyruğuna al."""
    pass  # No extra fields — uses path param post_id


class PostSubmitResult(BaseModel):
    success: bool
    delivery_status: str
    engagement_task_id: Optional[str] = None
    error: Optional[str] = None


class PostListParams(BaseModel):
    channel_profile_id: Optional[str] = None
    platform: Optional[str] = None
    status: Optional[str] = None
    post_type: Optional[str] = None
    limit: int = 100
    offset: int = 0
