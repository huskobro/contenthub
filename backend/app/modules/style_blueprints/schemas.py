from typing import Optional
from pydantic import BaseModel, field_validator
from datetime import datetime


class StyleBlueprintCreate(BaseModel):
    name: str
    module_scope: Optional[str] = None
    status: Optional[str] = "draft"
    version: Optional[int] = 1
    visual_rules_json: Optional[str] = None
    motion_rules_json: Optional[str] = None
    layout_rules_json: Optional[str] = None
    subtitle_rules_json: Optional[str] = None
    thumbnail_rules_json: Optional[str] = None
    preview_strategy_json: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v

    @field_validator("version")
    @classmethod
    def version_non_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("version must not be negative")
        return v


class StyleBlueprintUpdate(BaseModel):
    name: Optional[str] = None
    module_scope: Optional[str] = None
    status: Optional[str] = None
    version: Optional[int] = None
    visual_rules_json: Optional[str] = None
    motion_rules_json: Optional[str] = None
    layout_rules_json: Optional[str] = None
    subtitle_rules_json: Optional[str] = None
    thumbnail_rules_json: Optional[str] = None
    preview_strategy_json: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("name must not be blank")
        return v

    @field_validator("version")
    @classmethod
    def version_non_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("version must not be negative")
        return v


class StyleBlueprintResponse(BaseModel):
    id: str
    name: str
    module_scope: Optional[str]
    status: str
    version: int
    visual_rules_json: Optional[str]
    motion_rules_json: Optional[str]
    layout_rules_json: Optional[str]
    subtitle_rules_json: Optional[str]
    thumbnail_rules_json: Optional[str]
    preview_strategy_json: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
