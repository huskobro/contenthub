"""
Platform Connection schemas — Faz 2.
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
