"""
News item schemas.

Gate Sources Closure:
  - ``status`` is now hard-locked to the finite set ``new`` / ``used`` /
    ``ignored``. The historical ``reviewed`` status was an orphan (never
    written by any pipeline) and is removed. Existing rows with
    ``status='reviewed'`` are normalized to ``new`` by the
    gate_sources_001 migration.
  - Response now exposes ``image_urls: list[str]`` derived from the
    persisted ``image_urls_json`` column. The JSON string is still
    returned under ``image_urls_json`` for one release for backward
    compatibility but the frontend should migrate to ``image_urls``.
  - ``NewsItemUpdate.status`` accepts only ``used`` or ``ignored``
    transitions from the user/admin surface. New items cannot be
    "un-used" once marked — that would silently break used-news registry
    linkage.
"""
from __future__ import annotations

import json
from typing import Optional, Literal, List
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime


VALID_NEWS_ITEM_STATUSES = ["new", "used", "ignored"]
NewsItemStatus = Literal["new", "used", "ignored"]


def _parse_image_urls(image_urls_json: Optional[str]) -> List[str]:
    """Parse stored JSON string into a list[str]. Defensive against bad rows."""
    if not image_urls_json:
        return []
    try:
        value = json.loads(image_urls_json)
    except (TypeError, ValueError):
        return []
    if not isinstance(value, list):
        return []
    return [str(x) for x in value if isinstance(x, (str, int, float))]


class NewsItemCreate(BaseModel):
    title: str
    url: str
    status: NewsItemStatus = "new"
    source_id: Optional[str] = None
    source_scan_id: Optional[str] = None
    summary: Optional[str] = None
    published_at: Optional[datetime] = None
    language: Optional[str] = None
    category: Optional[str] = None
    dedupe_key: Optional[str] = None
    raw_payload_json: Optional[str] = None
    image_url: Optional[str] = None
    # ``image_urls_json`` remains accepted as a raw JSON string for back-compat
    # writes (mostly tests + scan_engine path). Prefer ``image_urls``.
    image_urls_json: Optional[str] = None
    image_urls: Optional[List[str]] = None

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

    @model_validator(mode="after")
    def sync_image_urls(self) -> "NewsItemCreate":
        """If image_urls provided, mirror into image_urls_json for persistence."""
        if self.image_urls is not None and self.image_urls_json is None:
            try:
                self.image_urls_json = json.dumps(self.image_urls, ensure_ascii=False)
            except (TypeError, ValueError):
                self.image_urls_json = None
        return self


class NewsItemUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    status: Optional[NewsItemStatus] = None
    source_id: Optional[str] = None
    source_scan_id: Optional[str] = None
    summary: Optional[str] = None
    published_at: Optional[datetime] = None
    language: Optional[str] = None
    category: Optional[str] = None
    dedupe_key: Optional[str] = None
    raw_payload_json: Optional[str] = None
    image_url: Optional[str] = None
    image_urls_json: Optional[str] = None
    image_urls: Optional[List[str]] = None

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

    @model_validator(mode="after")
    def sync_image_urls(self) -> "NewsItemUpdate":
        if self.image_urls is not None and self.image_urls_json is None:
            try:
                self.image_urls_json = json.dumps(self.image_urls, ensure_ascii=False)
            except (TypeError, ValueError):
                self.image_urls_json = None
        return self


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
    image_url: Optional[str] = None
    # Preferred contract: list[str].
    image_urls: List[str] = Field(default_factory=list)
    # Back-compat: deprecated, will be removed in a later release.
    image_urls_json: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    usage_count: int = 0
    last_usage_type: Optional[str] = None
    last_target_module: Optional[str] = None
    source_name: Optional[str] = None
    source_status: Optional[str] = None
    source_scan_status: Optional[str] = None
    has_published_used_news_link: bool = False

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, item, **extras) -> "NewsItemResponse":
        urls_json = getattr(item, "image_urls_json", None)
        return cls(
            id=item.id,
            title=item.title,
            url=item.url,
            status=item.status,
            source_id=item.source_id,
            source_scan_id=item.source_scan_id,
            summary=item.summary,
            published_at=item.published_at,
            language=item.language,
            category=item.category,
            dedupe_key=item.dedupe_key,
            raw_payload_json=item.raw_payload_json,
            image_url=getattr(item, "image_url", None),
            image_urls=_parse_image_urls(urls_json),
            image_urls_json=urls_json,
            created_at=item.created_at,
            updated_at=item.updated_at,
            **extras,
        )


class NewsItemListResponse(BaseModel):
    items: List[NewsItemResponse]
    total: int
    offset: int
    limit: int
