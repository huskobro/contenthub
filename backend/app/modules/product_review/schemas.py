"""
Product Review modulu Pydantic schema'lari (Faz A iskeleti).

Girdiler:
  - ProductCreate / ProductResponse — urun URL'si + kullanici metadata'si
  - ProductSnapshotResponse — read-only
  - ProductReviewCreate — 3 template'e gore girdi (topic + primary + secondary + ayarlar)
  - ProductReviewResponse — read-only

Faz B'de scrape + CRUD endpoint'leri bu schema'lari kullanacak.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------


class ProductCreate(BaseModel):
    """Kullanici URL girer; scrape sonrasi asagidaki alanlar doldurulur."""

    source_url: str = Field(..., min_length=7, max_length=2000)
    name: Optional[str] = Field(None, max_length=500)
    brand: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=255)
    vendor: Optional[str] = Field(None, max_length=255)
    affiliate_url: Optional[str] = Field(None, max_length=2000)
    # tests + dev: kayit test verisi mi?
    is_test_data: bool = False

    @field_validator("source_url")
    @classmethod
    def _must_be_http(cls, v: str) -> str:
        s = (v or "").strip()
        if not (s.startswith("http://") or s.startswith("https://")):
            raise ValueError("source_url http(s):// olmalidir")
        return s


class ProductResponse(BaseModel):
    id: str
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    vendor: Optional[str] = None
    source_url: str
    canonical_url: Optional[str] = None
    affiliate_url: Optional[str] = None
    current_price: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    primary_image_url: Optional[str] = None
    parser_source: Optional[str] = None
    scrape_confidence: Optional[float] = None
    robots_txt_allowed: Optional[bool] = None
    is_test_data: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# ProductSnapshot
# ---------------------------------------------------------------------------


class ProductSnapshotResponse(BaseModel):
    id: str
    product_id: str
    fetched_at: datetime
    http_status: Optional[int] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    availability: Optional[str] = None
    rating_value: Optional[float] = None
    rating_count: Optional[int] = None
    raw_html_sha1: Optional[str] = None
    parsed_json: Optional[str] = None
    parser_source: Optional[str] = None
    confidence: Optional[float] = None
    error_message: Optional[str] = None
    is_test_data: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# ProductReview
# ---------------------------------------------------------------------------


TemplateType = Literal["single", "comparison", "alternatives"]
RunMode = Literal["semi_auto", "full_auto"]
Orientation = Literal["vertical", "horizontal"]


class ProductReviewCreate(BaseModel):
    topic: str = Field(..., min_length=3, max_length=500)
    template_type: TemplateType
    primary_product_id: str = Field(..., min_length=1)
    secondary_product_ids: List[str] = Field(default_factory=list)
    language: str = "tr"
    orientation: Orientation = "vertical"
    duration_seconds: int = Field(60, ge=30, le=600)
    run_mode: RunMode = "semi_auto"
    affiliate_enabled: bool = False
    disclosure_text: Optional[str] = None
    owner_user_id: Optional[str] = None
    is_test_data: bool = False

    @field_validator("secondary_product_ids")
    @classmethod
    def _non_empty_ids(cls, v: List[str]) -> List[str]:
        return [s for s in v if s and s.strip()]


class ProductReviewResponse(BaseModel):
    id: str
    topic: str
    template_type: str
    primary_product_id: str
    secondary_product_ids_json: str
    language: str
    orientation: str
    duration_seconds: int
    run_mode: str
    affiliate_enabled: bool
    disclosure_text: Optional[str] = None
    job_id: Optional[str] = None
    owner_user_id: Optional[str] = None
    is_test_data: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
