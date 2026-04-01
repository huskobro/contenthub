"""
Pydantic schemas for the Visibility Engine.

Three shapes:
  - VisibilityRuleCreate  : fields required/allowed when creating a new rule
  - VisibilityRuleUpdate  : all fields optional for partial PATCH
  - VisibilityRuleResponse: full representation returned to callers
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class VisibilityRuleCreate(BaseModel):
    rule_type: str = Field(..., min_length=1, max_length=50)
    target_key: str = Field(..., min_length=1, max_length=255)
    module_scope: Optional[str] = Field(None, max_length=100)
    role_scope: Optional[str] = Field(None, max_length=50)
    mode_scope: Optional[str] = Field(None, max_length=50)
    visible: bool = True
    read_only: bool = False
    wizard_visible: bool = False
    status: str = Field("active", max_length=50)
    priority: int = Field(0, ge=0)
    notes: Optional[str] = None


class VisibilityRuleUpdate(BaseModel):
    """All fields optional — PATCH semantics."""

    rule_type: Optional[str] = Field(None, min_length=1, max_length=50)
    target_key: Optional[str] = Field(None, min_length=1, max_length=255)
    module_scope: Optional[str] = Field(None, max_length=100)
    role_scope: Optional[str] = Field(None, max_length=50)
    mode_scope: Optional[str] = Field(None, max_length=50)
    visible: Optional[bool] = None
    read_only: Optional[bool] = None
    wizard_visible: Optional[bool] = None
    status: Optional[str] = Field(None, max_length=50)
    priority: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None


class VisibilityRuleResponse(BaseModel):
    id: str
    rule_type: str
    target_key: str
    module_scope: Optional[str]
    role_scope: Optional[str]
    mode_scope: Optional[str]
    visible: bool
    read_only: bool
    wizard_visible: bool
    status: str
    priority: int
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
