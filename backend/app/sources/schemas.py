from typing import Optional
from pydantic import BaseModel, field_validator, model_validator
from datetime import datetime


class SourceCreate(BaseModel):
    name: str
    source_type: str
    status: Optional[str] = "active"
    base_url: Optional[str] = None
    feed_url: Optional[str] = None
    api_endpoint: Optional[str] = None
    trust_level: Optional[str] = None
    scan_mode: Optional[str] = None
    language: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v

    @field_validator("source_type")
    @classmethod
    def source_type_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("source_type must not be blank")
        return v

    @model_validator(mode="after")
    def check_url_field_for_type(self) -> "SourceCreate":
        stype = self.source_type.lower() if self.source_type else ""
        if stype == "rss" and not self.feed_url:
            raise ValueError("feed_url is required for source_type 'rss'")
        if stype == "manual_url" and not self.base_url:
            raise ValueError("base_url is required for source_type 'manual_url'")
        if stype == "api" and not self.api_endpoint:
            raise ValueError("api_endpoint is required for source_type 'api'")
        return self


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    source_type: Optional[str] = None
    status: Optional[str] = None
    base_url: Optional[str] = None
    feed_url: Optional[str] = None
    api_endpoint: Optional[str] = None
    trust_level: Optional[str] = None
    scan_mode: Optional[str] = None
    language: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("name must not be blank")
        return v


class SourceResponse(BaseModel):
    id: str
    name: str
    source_type: str
    status: str
    base_url: Optional[str]
    feed_url: Optional[str]
    api_endpoint: Optional[str]
    trust_level: Optional[str]
    scan_mode: Optional[str]
    language: Optional[str]
    category: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    scan_count: int = 0
    last_scan_status: Optional[str] = None
    last_scan_finished_at: Optional[datetime] = None
    linked_news_count: int = 0
    reviewed_news_count: int = 0
    used_news_count_from_source: int = 0

    model_config = {"from_attributes": True}
