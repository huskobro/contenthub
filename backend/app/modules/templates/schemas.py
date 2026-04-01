from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class TemplateCreate(BaseModel):
    name: str
    template_type: str
    owner_scope: str
    module_scope: Optional[str] = None
    description: Optional[str] = None
    style_profile_json: Optional[str] = None
    content_rules_json: Optional[str] = None
    publish_profile_json: Optional[str] = None
    status: Optional[str] = "draft"
    version: Optional[int] = 1

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("name must not be blank")
        return v

    @field_validator("template_type")
    @classmethod
    def template_type_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("template_type must not be blank")
        return v

    @field_validator("owner_scope")
    @classmethod
    def owner_scope_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("owner_scope must not be blank")
        return v

    @field_validator("version")
    @classmethod
    def version_not_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("version must not be negative")
        return v


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    template_type: Optional[str] = None
    owner_scope: Optional[str] = None
    module_scope: Optional[str] = None
    description: Optional[str] = None
    style_profile_json: Optional[str] = None
    content_rules_json: Optional[str] = None
    publish_profile_json: Optional[str] = None
    status: Optional[str] = None
    version: Optional[int] = None

    @field_validator("version")
    @classmethod
    def version_not_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("version must not be negative")
        return v


class TemplateResponse(BaseModel):
    id: str
    name: str
    template_type: str
    owner_scope: str
    module_scope: Optional[str]
    description: Optional[str]
    style_profile_json: Optional[str]
    content_rules_json: Optional[str]
    publish_profile_json: Optional[str]
    status: str
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
