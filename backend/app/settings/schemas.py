"""
Pydantic schemas for the Settings Registry.

Three shapes:
  - SettingCreate  : fields required/allowed when creating a new setting
  - SettingUpdate  : all fields optional for partial PATCH
  - SettingResponse: full representation returned to callers
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SettingCreate(BaseModel):
    key: str = Field(..., min_length=1, max_length=255)
    group_name: str = Field("general", max_length=100)
    type: str = Field("string", max_length=50)
    default_value_json: str = Field("null")
    admin_value_json: str = Field("null")
    user_override_allowed: bool = False
    visible_to_user: bool = False
    visible_in_wizard: bool = False
    read_only_for_user: bool = True
    module_scope: Optional[str] = Field(None, max_length=100)
    help_text: Optional[str] = None
    validation_rules_json: str = Field("{}")
    status: str = Field("active", max_length=50)


class SettingUpdate(BaseModel):
    """All fields optional — PATCH semantics."""

    group_name: Optional[str] = Field(None, max_length=100)
    type: Optional[str] = Field(None, max_length=50)
    default_value_json: Optional[str] = None
    admin_value_json: Optional[str] = None
    user_override_allowed: Optional[bool] = None
    visible_to_user: Optional[bool] = None
    visible_in_wizard: Optional[bool] = None
    read_only_for_user: Optional[bool] = None
    module_scope: Optional[str] = Field(None, max_length=100)
    help_text: Optional[str] = None
    validation_rules_json: Optional[str] = None
    status: Optional[str] = Field(None, max_length=50)


class SettingResponse(BaseModel):
    id: str
    key: str
    group_name: str
    type: str
    default_value_json: str
    admin_value_json: str
    user_override_allowed: bool
    visible_to_user: bool
    visible_in_wizard: bool
    read_only_for_user: bool
    module_scope: Optional[str]
    help_text: Optional[str]
    validation_rules_json: str
    status: str
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
