"""
Automation Policy + Operations Inbox schemas — Faz 13.

Checkpoint modes: disabled | manual_review | automatic
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Mode enum values (validated at schema level)
# ---------------------------------------------------------------------------

CHECKPOINT_MODES = {"disabled", "manual_review", "automatic"}
INBOX_STATUSES = {"open", "acknowledged", "resolved", "dismissed"}
INBOX_PRIORITIES = {"low", "normal", "high", "urgent"}


def _validate_mode(v: str) -> str:
    if v not in CHECKPOINT_MODES:
        raise ValueError(f"Gecersiz checkpoint mode: {v}. Gecerli: {CHECKPOINT_MODES}")
    return v


# ---------------------------------------------------------------------------
# AutomationPolicy
# ---------------------------------------------------------------------------

class AutomationPolicyCreate(BaseModel):
    channel_profile_id: str = Field(..., min_length=1, max_length=36)
    owner_user_id: Optional[str] = Field(None, max_length=36)
    name: str = Field("Varsayilan Politika", max_length=255)
    is_enabled: bool = False
    source_scan_mode: str = Field("disabled", max_length=50)
    draft_generation_mode: str = Field("manual_review", max_length=50)
    render_mode: str = Field("disabled", max_length=50)
    publish_mode: str = Field("manual_review", max_length=50)
    post_publish_mode: str = Field("disabled", max_length=50)
    max_daily_posts: Optional[int] = Field(10, ge=0)
    publish_windows_json: Optional[str] = None
    platform_rules_json: Optional[str] = None


class AutomationPolicyUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    is_enabled: Optional[bool] = None
    source_scan_mode: Optional[str] = Field(None, max_length=50)
    draft_generation_mode: Optional[str] = Field(None, max_length=50)
    render_mode: Optional[str] = Field(None, max_length=50)
    publish_mode: Optional[str] = Field(None, max_length=50)
    post_publish_mode: Optional[str] = Field(None, max_length=50)
    max_daily_posts: Optional[int] = Field(None, ge=0)
    publish_windows_json: Optional[str] = None
    platform_rules_json: Optional[str] = None


class AutomationPolicyResponse(BaseModel):
    id: str
    channel_profile_id: str
    owner_user_id: Optional[str] = None
    name: str
    is_enabled: bool
    source_scan_mode: str
    draft_generation_mode: str
    render_mode: str
    publish_mode: str
    post_publish_mode: str
    max_daily_posts: Optional[int] = None
    publish_windows_json: Optional[str] = None
    platform_rules_json: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Checkpoint evaluation result (not persisted — runtime shape)
# ---------------------------------------------------------------------------

class CheckpointDecision(BaseModel):
    """Policy evaluation result for a single checkpoint."""
    checkpoint: str
    mode: str  # disabled | manual_review | automatic
    should_proceed: bool
    requires_review: bool
    reason: str


# ---------------------------------------------------------------------------
# Operations Inbox
# ---------------------------------------------------------------------------

class InboxItemCreate(BaseModel):
    item_type: str = Field(..., max_length=100)
    channel_profile_id: Optional[str] = Field(None, max_length=36)
    owner_user_id: Optional[str] = Field(None, max_length=36)
    related_project_id: Optional[str] = Field(None, max_length=36)
    related_entity_type: Optional[str] = Field(None, max_length=100)
    related_entity_id: Optional[str] = Field(None, max_length=36)
    title: str = Field(..., max_length=500)
    reason: Optional[str] = None
    priority: str = Field("normal", max_length=50)
    action_url: Optional[str] = Field(None, max_length=500)
    metadata_json: Optional[str] = None


class InboxItemUpdate(BaseModel):
    status: Optional[str] = Field(None, max_length=50)
    priority: Optional[str] = Field(None, max_length=50)


class InboxItemResponse(BaseModel):
    id: str
    item_type: str
    channel_profile_id: Optional[str] = None
    owner_user_id: Optional[str] = None
    related_project_id: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    title: str
    reason: Optional[str] = None
    status: str
    priority: str
    action_url: Optional[str] = None
    metadata_json: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
