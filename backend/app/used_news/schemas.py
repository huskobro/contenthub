from typing import Optional
from pydantic import BaseModel, field_validator
from datetime import datetime


class UsedNewsCreate(BaseModel):
    news_item_id: str
    usage_type: str
    target_module: str
    usage_context: Optional[str] = None
    target_entity_id: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("news_item_id")
    @classmethod
    def news_item_id_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("news_item_id must not be blank")
        return v

    @field_validator("usage_type")
    @classmethod
    def usage_type_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("usage_type must not be blank")
        return v

    @field_validator("target_module")
    @classmethod
    def target_module_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("target_module must not be blank")
        return v


class UsedNewsUpdate(BaseModel):
    usage_type: Optional[str] = None
    usage_context: Optional[str] = None
    target_module: Optional[str] = None
    target_entity_id: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("usage_type")
    @classmethod
    def usage_type_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("usage_type must not be blank")
        return v

    @field_validator("target_module")
    @classmethod
    def target_module_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("target_module must not be blank")
        return v


class UsedNewsResponse(BaseModel):
    id: str
    news_item_id: str
    usage_type: str
    usage_context: Optional[str]
    target_module: str
    target_entity_id: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
