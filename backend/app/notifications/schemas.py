"""
Notification Center schemas — Faz 16.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

NOTIFICATION_SCOPES = {"user", "admin", "system"}
NOTIFICATION_SEVERITIES = {"info", "warning", "error", "success"}
NOTIFICATION_STATUSES = {"unread", "read", "dismissed"}

NOTIFICATION_TYPES = {
    "publish_review",
    "publish_failure",
    "render_failure",
    "source_scan_error",
    "overdue_publish",
    "policy_review_required",
    "job_completed",
    "job_failed",
    "system_info",
}


# ---------------------------------------------------------------------------
# Request / Response
# ---------------------------------------------------------------------------

class NotificationCreate(BaseModel):
    owner_user_id: Optional[str] = None
    scope_type: str = Field("user", description="user | admin | system")
    notification_type: str
    title: str = Field(..., max_length=500)
    body: Optional[str] = None
    severity: str = Field("info", description="info | warning | error | success")
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    related_inbox_item_id: Optional[str] = None
    related_channel_profile_id: Optional[str] = None
    action_url: Optional[str] = None


class NotificationResponse(BaseModel):
    id: str
    owner_user_id: Optional[str] = None
    scope_type: str
    notification_type: str
    title: str
    body: Optional[str] = None
    severity: str
    status: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    related_inbox_item_id: Optional[str] = None
    related_channel_profile_id: Optional[str] = None
    action_url: Optional[str] = None
    created_at: datetime
    read_at: Optional[datetime] = None
    dismissed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class NotificationUpdate(BaseModel):
    status: Optional[str] = None  # read | dismissed


class NotificationCountResponse(BaseModel):
    unread: int
    total: int
