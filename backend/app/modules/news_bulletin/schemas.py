from typing import Optional
from pydantic import BaseModel, field_validator
from datetime import datetime


class NewsBulletinCreate(BaseModel):
    topic: str
    title: Optional[str] = None
    brief: Optional[str] = None
    target_duration_seconds: Optional[int] = None
    language: Optional[str] = None
    tone: Optional[str] = None
    bulletin_style: Optional[str] = None
    source_mode: Optional[str] = None
    selected_news_ids_json: Optional[str] = None
    status: str = "draft"
    job_id: Optional[str] = None

    @field_validator("topic")
    @classmethod
    def topic_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("topic must not be blank")
        return v

    @field_validator("target_duration_seconds")
    @classmethod
    def duration_not_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("target_duration_seconds must not be negative")
        return v


class NewsBulletinUpdate(BaseModel):
    title: Optional[str] = None
    topic: Optional[str] = None
    brief: Optional[str] = None
    target_duration_seconds: Optional[int] = None
    language: Optional[str] = None
    tone: Optional[str] = None
    bulletin_style: Optional[str] = None
    source_mode: Optional[str] = None
    selected_news_ids_json: Optional[str] = None
    status: Optional[str] = None
    job_id: Optional[str] = None

    @field_validator("topic")
    @classmethod
    def topic_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("topic must not be blank")
        return v

    @field_validator("target_duration_seconds")
    @classmethod
    def duration_not_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("target_duration_seconds must not be negative")
        return v


class NewsBulletinResponse(BaseModel):
    id: str
    title: Optional[str]
    topic: str
    brief: Optional[str]
    target_duration_seconds: Optional[int]
    language: Optional[str]
    tone: Optional[str]
    bulletin_style: Optional[str]
    source_mode: Optional[str]
    selected_news_ids_json: Optional[str]
    status: str
    job_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NewsBulletinMetadataCreate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags_json: Optional[str] = None
    category: Optional[str] = None
    language: Optional[str] = None
    version: int = 1
    source_type: Optional[str] = None
    generation_status: str = "draft"
    notes: Optional[str] = None


class NewsBulletinMetadataUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags_json: Optional[str] = None
    category: Optional[str] = None
    language: Optional[str] = None
    source_type: Optional[str] = None
    generation_status: Optional[str] = None
    notes: Optional[str] = None


class NewsBulletinMetadataResponse(BaseModel):
    id: str
    news_bulletin_id: str
    title: Optional[str]
    description: Optional[str]
    tags_json: Optional[str]
    category: Optional[str]
    language: Optional[str]
    version: int
    source_type: Optional[str]
    generation_status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NewsBulletinSelectedItemCreate(BaseModel):
    news_item_id: str
    sort_order: int = 0
    selection_reason: Optional[str] = None

    @field_validator("news_item_id")
    @classmethod
    def news_item_id_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("news_item_id must not be blank")
        return v

    @field_validator("sort_order")
    @classmethod
    def sort_order_not_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("sort_order must not be negative")
        return v


class NewsBulletinSelectedItemUpdate(BaseModel):
    sort_order: Optional[int] = None
    selection_reason: Optional[str] = None

    @field_validator("sort_order")
    @classmethod
    def sort_order_not_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("sort_order must not be negative")
        return v


class NewsBulletinSelectedItemResponse(BaseModel):
    id: str
    news_bulletin_id: str
    news_item_id: str
    sort_order: int
    selection_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NewsBulletinScriptCreate(BaseModel):
    content: str
    version: int = 1
    source_type: Optional[str] = None
    generation_status: str = "draft"
    notes: Optional[str] = None

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("content must not be blank")
        return v


class NewsBulletinScriptUpdate(BaseModel):
    content: Optional[str] = None
    source_type: Optional[str] = None
    generation_status: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("content must not be blank")
        return v


class NewsBulletinScriptResponse(BaseModel):
    id: str
    news_bulletin_id: str
    content: str
    version: int
    source_type: Optional[str]
    generation_status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
