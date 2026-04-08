"""
Engagement Task schemas — Faz 2.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class EngagementTaskCreate(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=36)
    channel_profile_id: str = Field(..., min_length=1, max_length=36)
    platform_connection_id: str = Field(..., min_length=1, max_length=36)
    content_project_id: Optional[str] = Field(None, max_length=36)
    type: str = Field(..., min_length=1, max_length=100)
    target_object_type: Optional[str] = Field(None, max_length=100)
    target_object_id: Optional[str] = Field(None, max_length=500)
    payload: Optional[str] = None
    ai_suggestion: Optional[str] = None
    final_user_input: Optional[str] = None
    status: str = Field("pending", max_length=50)
    scheduled_for: Optional[datetime] = None


class EngagementTaskUpdate(BaseModel):
    type: Optional[str] = Field(None, max_length=100)
    target_object_type: Optional[str] = Field(None, max_length=100)
    target_object_id: Optional[str] = Field(None, max_length=500)
    payload: Optional[str] = None
    ai_suggestion: Optional[str] = None
    final_user_input: Optional[str] = None
    status: Optional[str] = Field(None, max_length=50)
    scheduled_for: Optional[datetime] = None
    error_message: Optional[str] = None


class EngagementTaskResponse(BaseModel):
    id: str
    user_id: str
    channel_profile_id: str
    content_project_id: Optional[str] = None
    platform_connection_id: str
    type: str
    target_object_type: Optional[str] = None
    target_object_id: Optional[str] = None
    payload: Optional[str] = None
    ai_suggestion: Optional[str] = None
    final_user_input: Optional[str] = None
    status: str
    scheduled_for: Optional[datetime] = None
    error_message: Optional[str] = None
    executed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
