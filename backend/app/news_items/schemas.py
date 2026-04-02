from typing import Optional
from pydantic import BaseModel, field_validator
from datetime import datetime


class NewsItemCreate(BaseModel):
    title: str
    url: str
    status: str = "new"
    source_id: Optional[str] = None
    source_scan_id: Optional[str] = None
    summary: Optional[str] = None
    published_at: Optional[datetime] = None
    language: Optional[str] = None
    category: Optional[str] = None
    dedupe_key: Optional[str] = None
    raw_payload_json: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("title must not be blank")
        return v

    @field_validator("url")
    @classmethod
    def url_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("url must not be blank")
        return v

    @field_validator("status")
    @classmethod
    def status_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("status must not be blank")
        return v


class NewsItemUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    status: Optional[str] = None
    source_id: Optional[str] = None
    source_scan_id: Optional[str] = None
    summary: Optional[str] = None
    published_at: Optional[datetime] = None
    language: Optional[str] = None
    category: Optional[str] = None
    dedupe_key: Optional[str] = None
    raw_payload_json: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("title must not be blank")
        return v

    @field_validator("url")
    @classmethod
    def url_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("url must not be blank")
        return v

    @field_validator("status")
    @classmethod
    def status_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("status must not be blank")
        return v


class NewsItemResponse(BaseModel):
    id: str
    title: str
    url: str
    status: str
    source_id: Optional[str]
    source_scan_id: Optional[str]
    summary: Optional[str]
    published_at: Optional[datetime]
    language: Optional[str]
    category: Optional[str]
    dedupe_key: Optional[str]
    raw_payload_json: Optional[str]
    created_at: datetime
    updated_at: datetime
    usage_count: int = 0
    last_usage_type: Optional[str] = None
    last_target_module: Optional[str] = None
    source_name: Optional[str] = None
    source_status: Optional[str] = None

    model_config = {"from_attributes": True}
