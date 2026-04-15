"""
News source API schemas.

Gate Sources Closure:
  - ``source_type`` is now hard-locked to ``"rss"`` on create/update. The
    historical ``manual_url`` / ``api`` shells never had a working scan path
    and are removed. Existing rows with those types are migrated to ``rss``
    in the gate_sources_001 migration.
  - ``scan_mode`` accepts only ``manual`` / ``auto``. ``curated`` was never
    wired to a pipeline and is removed.
  - ``trust_level`` is constrained to ``low`` / ``medium`` / ``high``.
  - Response shape no longer exposes ``reviewed_news_count`` — the
    ``reviewed`` item status was orphan (never written by any pipeline) and
    has been removed from the product surface entirely.
"""
from typing import Optional, Literal, List
from pydantic import BaseModel, field_validator, model_validator
from datetime import datetime


# M43: valid source categories — 1:1 with visual style mapping
VALID_SOURCE_CATEGORIES = [
    "breaking", "tech", "corporate", "sport", "finance",
    "weather", "science", "entertainment", "dark",
]

VALID_SOURCE_TYPES = ["rss"]
VALID_SCAN_MODES = ["manual", "auto"]
VALID_TRUST_LEVELS = ["low", "medium", "high"]
VALID_STATUSES = ["active", "paused", "archived"]


SourceTypeLiteral = Literal["rss"]
ScanModeLiteral = Literal["manual", "auto"]
TrustLevelLiteral = Literal["low", "medium", "high"]
StatusLiteral = Literal["active", "paused", "archived"]


class SourceCreate(BaseModel):
    name: str
    source_type: SourceTypeLiteral = "rss"
    status: Optional[StatusLiteral] = "active"
    base_url: Optional[str] = None
    feed_url: Optional[str] = None
    api_endpoint: Optional[str] = None  # deprecated; accepted but ignored
    trust_level: Optional[TrustLevelLiteral] = None
    scan_mode: Optional[ScanModeLiteral] = None
    language: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v

    @field_validator("category")
    @classmethod
    def category_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            if v.strip().lower() not in VALID_SOURCE_CATEGORIES:
                raise ValueError(
                    f"Gecersiz kategori: '{v}'. Gecerli degerler: {', '.join(VALID_SOURCE_CATEGORIES)}"
                )
            return v.strip().lower()
        return v

    @model_validator(mode="after")
    def rss_requires_feed_url(self) -> "SourceCreate":
        if not self.feed_url or not self.feed_url.strip():
            raise ValueError("feed_url is required for source_type 'rss'")
        return self


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    source_type: Optional[SourceTypeLiteral] = None
    status: Optional[StatusLiteral] = None
    base_url: Optional[str] = None
    feed_url: Optional[str] = None
    api_endpoint: Optional[str] = None
    trust_level: Optional[TrustLevelLiteral] = None
    scan_mode: Optional[ScanModeLiteral] = None
    language: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("name must not be blank")
        return v

    @field_validator("category")
    @classmethod
    def category_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            if v.strip().lower() not in VALID_SOURCE_CATEGORIES:
                raise ValueError(
                    f"Gecersiz kategori: '{v}'. Gecerli degerler: {', '.join(VALID_SOURCE_CATEGORIES)}"
                )
            return v.strip().lower()
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
    last_scan_error: Optional[str] = None  # Gate Sources Closure — source health surface
    failed_scan_count: int = 0             # Gate Sources Closure — consecutive recent failures
    linked_news_count: int = 0
    used_news_count_from_source: int = 0

    model_config = {"from_attributes": True}


class SourceListResponse(BaseModel):
    items: List[SourceResponse]
    total: int
    offset: int
    limit: int
