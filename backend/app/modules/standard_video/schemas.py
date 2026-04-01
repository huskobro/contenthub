"""Pydantic schemas for the Standard Video module."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator, model_validator


class StandardVideoCreate(BaseModel):
    topic: str
    title: Optional[str] = None
    brief: Optional[str] = None
    target_duration_seconds: Optional[int] = None
    tone: Optional[str] = None
    language: Optional[str] = None
    visual_direction: Optional[str] = None
    subtitle_style: Optional[str] = None
    job_id: Optional[str] = None

    @field_validator("target_duration_seconds")
    @classmethod
    def duration_not_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("target_duration_seconds must not be negative")
        return v


class StandardVideoUpdate(BaseModel):
    title: Optional[str] = None
    topic: Optional[str] = None
    brief: Optional[str] = None
    target_duration_seconds: Optional[int] = None
    tone: Optional[str] = None
    language: Optional[str] = None
    visual_direction: Optional[str] = None
    subtitle_style: Optional[str] = None
    status: Optional[str] = None
    job_id: Optional[str] = None

    @field_validator("target_duration_seconds")
    @classmethod
    def duration_not_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("target_duration_seconds must not be negative")
        return v


class StandardVideoResponse(BaseModel):
    id: str
    title: Optional[str] = None
    topic: str
    brief: Optional[str] = None
    target_duration_seconds: Optional[int] = None
    tone: Optional[str] = None
    language: Optional[str] = None
    visual_direction: Optional[str] = None
    subtitle_style: Optional[str] = None
    status: str
    job_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Script schemas
# ---------------------------------------------------------------------------

class StandardVideoScriptCreate(BaseModel):
    content: str
    source_type: Optional[str] = "manual"
    generation_status: Optional[str] = "draft"
    notes: Optional[str] = None

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("content must not be empty or whitespace")
        return v


class StandardVideoScriptUpdate(BaseModel):
    content: Optional[str] = None
    source_type: Optional[str] = None
    generation_status: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("content must not be empty or whitespace")
        return v


class StandardVideoScriptResponse(BaseModel):
    id: str
    standard_video_id: str
    content: str
    version: int
    source_type: str
    generation_status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
