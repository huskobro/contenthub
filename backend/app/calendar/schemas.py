"""
Calendar event schemas — Faz 14 + 14a.

Unified calendar event shape that aggregates:
- ContentProject (deadline_at)
- PublishRecord (scheduled_at, published_at)
- PlatformPost (scheduled_for, posted_at)

Faz 14a: Added policy/inbox context fields.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CalendarEvent(BaseModel):
    """Unified calendar event — aggregation of scheduling data."""
    id: str
    event_type: str
    # content_project | publish_record | platform_post
    title: str
    channel_profile_id: Optional[str] = None
    owner_user_id: Optional[str] = None
    related_project_id: Optional[str] = None
    related_publish_record_id: Optional[str] = None
    related_post_id: Optional[str] = None
    start_at: datetime
    end_at: Optional[datetime] = None
    status: str
    platform: Optional[str] = None
    module_type: Optional[str] = None
    action_url: Optional[str] = None
    meta_summary: Optional[str] = None
    is_overdue: bool = False
    # Faz 14a — policy/inbox context
    primary_platform: Optional[str] = None
    inbox_item_id: Optional[str] = None
    inbox_item_status: Optional[str] = None


class ChannelCalendarContext(BaseModel):
    """Policy + inbox summary for a channel — used by calendar UI."""
    channel_profile_id: str
    channel_name: Optional[str] = None
    policy_id: Optional[str] = None
    policy_enabled: bool = False
    publish_mode: str = "disabled"
    max_daily_posts: Optional[int] = None
    publish_windows_json: Optional[str] = None
    publish_windows_display: Optional[str] = None
    checkpoint_summary: Optional[str] = None
    open_inbox_count: int = 0
