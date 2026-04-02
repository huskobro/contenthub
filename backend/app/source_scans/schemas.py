from typing import Optional
from pydantic import BaseModel, field_validator
from datetime import datetime


class ScanCreate(BaseModel):
    source_id: str
    scan_mode: str
    status: Optional[str] = "queued"
    requested_by: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    result_count: Optional[int] = None
    error_summary: Optional[str] = None
    raw_result_preview_json: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("scan_mode")
    @classmethod
    def scan_mode_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("scan_mode must not be blank")
        return v

    @field_validator("result_count")
    @classmethod
    def result_count_non_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("result_count must be non-negative")
        return v


class ScanUpdate(BaseModel):
    status: Optional[str] = None
    requested_by: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    result_count: Optional[int] = None
    error_summary: Optional[str] = None
    raw_result_preview_json: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def status_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("status must not be blank")
        return v

    @field_validator("result_count")
    @classmethod
    def result_count_non_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("result_count must be non-negative")
        return v


class ScanResponse(BaseModel):
    id: str
    source_id: str
    scan_mode: str
    status: str
    requested_by: Optional[str]
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    result_count: Optional[int]
    error_summary: Optional[str]
    raw_result_preview_json: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    source_name: Optional[str] = None
    source_status: Optional[str] = None
    linked_news_count_from_scan: int = 0
    reviewed_news_count_from_scan: int = 0
    used_news_count_from_scan: int = 0

    model_config = {"from_attributes": True}
