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
    composition_direction: Optional[str] = None
    thumbnail_direction: Optional[str] = None
    template_id: Optional[str] = None
    style_blueprint_id: Optional[str] = None
    render_mode: Optional[str] = "combined"
    subtitle_style: Optional[str] = None
    lower_third_style: Optional[str] = None
    trust_enforcement_level: Optional[str] = "warn"

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
    composition_direction: Optional[str] = None
    thumbnail_direction: Optional[str] = None
    template_id: Optional[str] = None
    style_blueprint_id: Optional[str] = None
    render_mode: Optional[str] = None
    subtitle_style: Optional[str] = None
    lower_third_style: Optional[str] = None
    trust_enforcement_level: Optional[str] = None

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
    composition_direction: Optional[str] = None
    thumbnail_direction: Optional[str] = None
    template_id: Optional[str] = None
    style_blueprint_id: Optional[str] = None
    render_mode: Optional[str] = "combined"
    subtitle_style: Optional[str] = None
    lower_third_style: Optional[str] = None
    trust_enforcement_level: Optional[str] = "warn"
    created_at: datetime
    updated_at: datetime
    has_script: bool = False
    has_metadata: bool = False
    selected_news_count: int = 0
    has_selected_news_warning: bool = False
    selected_news_warning_count: int = 0
    selected_news_source_count: int = 0
    has_selected_news_missing_source: bool = False
    selected_news_quality_complete_count: int = 0
    selected_news_quality_partial_count: int = 0
    selected_news_quality_weak_count: int = 0

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
    edited_narration: Optional[str] = None

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
    edited_narration: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NewsBulletinSelectedItemWithEnforcementResponse(NewsBulletinSelectedItemResponse):
    news_title: Optional[str] = None
    news_category: Optional[str] = None
    used_news_count: int = 0
    used_news_warning: bool = False
    last_usage_type: Optional[str] = None
    last_target_module: Optional[str] = None


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


# ---------------------------------------------------------------------------
# Start Production (M28)
# ---------------------------------------------------------------------------


class StartProductionResponse(BaseModel):
    """Response when production pipeline is triggered for a bulletin."""
    job_id: str
    bulletin_id: str
    bulletin_status: str
    message: str
