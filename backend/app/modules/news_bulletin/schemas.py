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
