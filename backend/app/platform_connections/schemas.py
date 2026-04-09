"""
Platform Connection schemas — Faz 2 + Faz 17 (Connection Center).
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PlatformConnectionCreate(BaseModel):
    channel_profile_id: str = Field(..., min_length=1, max_length=36)
    platform: str = Field(..., min_length=1, max_length=50)
    external_account_id: Optional[str] = Field(None, max_length=500)
    external_account_name: Optional[str] = Field(None, max_length=500)
    external_avatar_url: Optional[str] = Field(None, max_length=1000)
    auth_state: str = Field("pending", max_length=50)
    token_state: str = Field("invalid", max_length=50)
    scopes_granted: Optional[str] = None
    scopes_required: Optional[str] = None
    scope_status: str = Field("insufficient", max_length=50)
    features_available: Optional[str] = None
    connection_status: str = Field("disconnected", max_length=50)
    requires_reauth: bool = False
    is_primary: bool = False


class PlatformConnectionUpdate(BaseModel):
    platform: Optional[str] = Field(None, max_length=50)
    external_account_id: Optional[str] = Field(None, max_length=500)
    external_account_name: Optional[str] = Field(None, max_length=500)
    external_avatar_url: Optional[str] = Field(None, max_length=1000)
    auth_state: Optional[str] = Field(None, max_length=50)
    token_state: Optional[str] = Field(None, max_length=50)
    scopes_granted: Optional[str] = None
    scopes_required: Optional[str] = None
    scope_status: Optional[str] = Field(None, max_length=50)
    features_available: Optional[str] = None
    connection_status: Optional[str] = Field(None, max_length=50)
    requires_reauth: Optional[bool] = None
    sync_status: Optional[str] = Field(None, max_length=50)
    last_error: Optional[str] = None
    is_primary: Optional[bool] = None
    subscriber_count: Optional[int] = None


class PlatformConnectionResponse(BaseModel):
    id: str
    channel_profile_id: str
    platform: str
    external_account_id: Optional[str] = None
    external_account_name: Optional[str] = None
    external_avatar_url: Optional[str] = None
    auth_state: str
    token_state: str
    scopes_granted: Optional[str] = None
    scopes_required: Optional[str] = None
    scope_status: str
    features_available: Optional[str] = None
    connection_status: str
    requires_reauth: bool
    sync_status: str
    last_sync_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    last_error: Optional[str] = None
    is_primary: bool
    subscriber_count: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Faz 17 — Connection Center enriched schemas
# ---------------------------------------------------------------------------


class HealthSummary(BaseModel):
    """Derived health summary for a single connection."""
    health_level: str  # healthy | partial | disconnected | reauth_required | token_issue | unknown
    supported_count: int
    blocked_count: int
    total_applicable: int
    issues: list[str] = []
    capability_matrix: dict[str, str] = {}


class ConnectionWithHealth(PlatformConnectionResponse):
    """PlatformConnection + computed health + capability matrix."""
    health: HealthSummary
    # Enrichment: channel profile name for admin view
    channel_profile_name: Optional[str] = None
    user_id: Optional[str] = None
    user_display_name: Optional[str] = None


class ConnectionHealthKPIs(BaseModel):
    """Aggregate health KPIs for admin monitoring."""
    total: int = 0
    healthy: int = 0
    partial: int = 0
    disconnected: int = 0
    reauth_required: int = 0
    token_issue: int = 0
    # Per-capability aggregates
    can_publish_ok: int = 0
    can_read_comments_ok: int = 0
    can_reply_comments_ok: int = 0
    can_read_playlists_ok: int = 0
    can_write_playlists_ok: int = 0
    can_create_posts_ok: int = 0
    can_read_analytics_ok: int = 0
    can_sync_channel_info_ok: int = 0


class ConnectionCenterListResponse(BaseModel):
    """Paginated connection center response."""
    items: list[ConnectionWithHealth] = []
    total: int = 0
    kpis: Optional[ConnectionHealthKPIs] = None
