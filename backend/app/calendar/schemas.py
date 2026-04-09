"""
Calendar event schemas — Faz 14.

Unified calendar event shape that aggregates:
- ContentProject (deadline_at)
- PublishRecord (scheduled_at, published_at)
- PlatformPost (scheduled_for, posted_at)
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
