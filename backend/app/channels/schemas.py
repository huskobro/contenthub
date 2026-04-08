"""
Channel Profile schemas — Faz 2.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ChannelProfileCreate(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=36)
    profile_name: str = Field(..., min_length=1, max_length=255)
    channel_slug: str = Field(..., min_length=1, max_length=100)
    profile_type: Optional[str] = Field(None, max_length=100)
    default_language: str = Field("tr", max_length=10)
    default_content_mode: Optional[str] = Field(None, max_length=100)
    brand_profile_id: Optional[str] = Field(None, max_length=36)
    automation_policy_id: Optional[str] = Field(None, max_length=36)
    notes: Optional[str] = None


class ChannelProfileUpdate(BaseModel):
    profile_name: Optional[str] = Field(None, min_length=1, max_length=255)
    profile_type: Optional[str] = Field(None, max_length=100)
    channel_slug: Optional[str] = Field(None, min_length=1, max_length=100)
    default_language: Optional[str] = Field(None, max_length=10)
    default_content_mode: Optional[str] = Field(None, max_length=100)
    brand_profile_id: Optional[str] = Field(None, max_length=36)
    automation_policy_id: Optional[str] = Field(None, max_length=36)
    status: Optional[str] = Field(None, pattern="^(active|archived)$")
    notes: Optional[str] = None


class ChannelProfileResponse(BaseModel):
    id: str
    user_id: str
    profile_name: str
    profile_type: Optional[str] = None
    channel_slug: str
    default_language: str
    default_content_mode: Optional[str] = None
    brand_profile_id: Optional[str] = None
    automation_policy_id: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
