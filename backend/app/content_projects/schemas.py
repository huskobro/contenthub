"""
Content Project schemas — Faz 2 + PHASE AG (modul-ustu konteyner).

PHASE AG: ContentProject artik tek bir modul ile sinirli degil. `module_type`
opsiyonel oldu; belirtilmezse default "mixed" olarak kaydedilir. Eski kayitlar
(legacy module_type = "standard_video" / "news_bulletin" / ...) korunur ve
frontend'de "Ana modul: X (legacy)" olarak etiketlenir.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# PHASE AG: karma (modul-ustu) projelerde kullanilan sentinel deger.
MIXED_PROJECT_MODULE_TYPE = "mixed"


class ContentProjectCreate(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=36)
    channel_profile_id: str = Field(..., min_length=1, max_length=36)
    # PHASE AG: module_type artik opsiyonel. Belirtilmezse service katmani
    # "mixed" degerini yazar. Eski client'lar legacy modul gonderirse
    # (ornek: "standard_video") o deger aynen korunur.
    module_type: Optional[str] = Field(None, max_length=100)
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    current_stage: Optional[str] = Field(None, max_length=100)
    content_status: str = Field("draft", max_length=50)
    review_status: str = Field("not_required", max_length=50)
    publish_status: str = Field("unpublished", max_length=50)
    primary_platform: Optional[str] = Field(None, max_length=50)
    origin_type: str = Field("original", max_length=50)
    priority: str = Field("normal", max_length=50)
    deadline_at: Optional[datetime] = None
    active_job_id: Optional[str] = Field(None, max_length=36)
    latest_output_ref: Optional[str] = None


class ContentProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    current_stage: Optional[str] = Field(None, max_length=100)
    content_status: Optional[str] = Field(None, max_length=50)
    review_status: Optional[str] = Field(None, max_length=50)
    publish_status: Optional[str] = Field(None, max_length=50)
    primary_platform: Optional[str] = Field(None, max_length=50)
    origin_type: Optional[str] = Field(None, max_length=50)
    priority: Optional[str] = Field(None, max_length=50)
    deadline_at: Optional[datetime] = None
    active_job_id: Optional[str] = Field(None, max_length=36)
    latest_output_ref: Optional[str] = None


class ContentProjectResponse(BaseModel):
    id: str
    user_id: str
    channel_profile_id: str
    # PHASE AG: Optional — mixed project (yeni) veya legacy ("standard_video")
    # deger alabilir. Frontend legacy'leri "(legacy)" etiketi ile gosterir.
    module_type: Optional[str] = None
    title: str
    description: Optional[str] = None
    current_stage: Optional[str] = None
    content_status: str
    review_status: str
    publish_status: str
    primary_platform: Optional[str] = None
    origin_type: str
    priority: str
    deadline_at: Optional[datetime] = None
    active_job_id: Optional[str] = None
    latest_output_ref: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
