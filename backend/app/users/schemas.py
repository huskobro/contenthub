"""
User schemas — M40.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=255)
    role: str = Field("user", pattern="^(admin|user)$")


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = Field(None, min_length=3, max_length=255)
    role: Optional[str] = Field(None, pattern="^(admin|user)$")
    status: Optional[str] = Field(None, pattern="^(active|inactive)$")


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    slug: str
    role: str
    status: str
    override_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserOverrideResponse(BaseModel):
    """Single user setting override entry."""
    id: str
    user_id: str
    setting_key: str
    value_json: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserOverrideSetRequest(BaseModel):
    """Request body for setting a user override."""
    value: object  # arbitrary JSON value
