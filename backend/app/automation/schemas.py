"""
Automation Policy schemas — Faz 2.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AutomationPolicyCreate(BaseModel):
    channel_profile_id: str = Field(..., min_length=1, max_length=36)
    automation_level: str = Field("manual", max_length=50)
    cp_source_scan: str = Field("disabled", max_length=50)
    cp_draft_generation: str = Field("review_required", max_length=50)
    cp_render: str = Field("disabled", max_length=50)
    cp_publish: str = Field("review_required", max_length=50)
    cp_post_publish: str = Field("disabled", max_length=50)
    publish_windows: Optional[str] = None
    max_daily_posts: int = Field(10, ge=0)
    platform_specific_rules: Optional[str] = None
    status: str = Field("paused", max_length=50)


class AutomationPolicyUpdate(BaseModel):
    automation_level: Optional[str] = Field(None, max_length=50)
    cp_source_scan: Optional[str] = Field(None, max_length=50)
    cp_draft_generation: Optional[str] = Field(None, max_length=50)
    cp_render: Optional[str] = Field(None, max_length=50)
    cp_publish: Optional[str] = Field(None, max_length=50)
    cp_post_publish: Optional[str] = Field(None, max_length=50)
    publish_windows: Optional[str] = None
    max_daily_posts: Optional[int] = Field(None, ge=0)
    platform_specific_rules: Optional[str] = None
    status: Optional[str] = Field(None, max_length=50)


class AutomationPolicyResponse(BaseModel):
    id: str
    channel_profile_id: str
    automation_level: str
    cp_source_scan: str
    cp_draft_generation: str
    cp_render: str
    cp_publish: str
    cp_post_publish: str
    publish_windows: Optional[str] = None
    max_daily_posts: int
    platform_specific_rules: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
