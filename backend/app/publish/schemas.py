"""
Publish Center Şemaları — M7-C1.

Pydantic şemaları: request/response veri doğrulaması.
DB modelleri (models.py) ile senkron tutulmalıdır; fakat ayrı tutulur.
"""

from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# PublishRecord şemaları
# ---------------------------------------------------------------------------

class PublishRecordCreate(BaseModel):
    """Yeni publish kaydı oluşturmak için gerekli alanlar."""
    job_id: str
    content_ref_type: str
    content_ref_id: str
    platform: str
    payload_json: Optional[str] = None
    notes: Optional[str] = None


class PublishRecordRead(BaseModel):
    """PublishRecord okuma şeması — API yanıtı."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    content_ref_type: str
    content_ref_id: str
    platform: str
    status: str
    review_state: str
    reviewer_id: Optional[str]
    reviewed_at: Optional[datetime]
    scheduled_at: Optional[datetime]
    published_at: Optional[datetime]
    platform_video_id: Optional[str]
    platform_url: Optional[str]
    publish_attempt_count: int
    last_error: Optional[str]
    payload_json: Optional[str]
    result_json: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class PublishRecordSummary(BaseModel):
    """Listeleme endpoint'leri için özet şema."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    content_ref_type: str
    content_ref_id: str
    platform: str
    status: str
    review_state: str
    publish_attempt_count: int
    published_at: Optional[datetime]
    platform_url: Optional[str]
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# PublishLog şemaları
# ---------------------------------------------------------------------------

class PublishLogRead(BaseModel):
    """PublishLog okuma şeması — API yanıtı."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    publish_record_id: str
    event_type: str
    actor_type: str
    actor_id: Optional[str]
    from_status: Optional[str]
    to_status: Optional[str]
    detail_json: str
    note: Optional[str]
    created_at: datetime


# ---------------------------------------------------------------------------
# Aksiyon şemaları
# ---------------------------------------------------------------------------

class ReviewActionRequest(BaseModel):
    """Operatör review kararı isteği."""
    decision: str               # 'approve' veya 'reject'
    reviewer_id: Optional[str] = None
    note: Optional[str] = None
    rejection_reason: Optional[str] = None


class PublishRecordPatchPayload(BaseModel):
    """Draft durumunda payload_json güncellemesi için."""
    payload_json: str


class PublishFromJobRequest(BaseModel):
    """Job'dan publish kaydı oluşturma isteği."""
    platform: str
    content_ref_type: str
    content_ref_id: Optional[str] = None


class ScheduleRequest(BaseModel):
    """Zamanlama isteği."""
    scheduled_at: datetime
    note: Optional[str] = None


class TransitionRequest(BaseModel):
    """Genel durum geçiş isteği (admin araçları için)."""
    next_status: str
    actor_id: Optional[str] = None
    note: Optional[str] = None


class PublishTriggerRequest(BaseModel):
    """Publish başlatma isteği."""
    actor_id: Optional[str] = None
    note: Optional[str] = None


class CancelRequest(BaseModel):
    """İptal isteği."""
    actor_id: Optional[str] = None
    note: Optional[str] = None


class RetryPublishRequest(BaseModel):
    """Retry isteği — failed → publishing."""
    actor_id: Optional[str] = None
    note: Optional[str] = None


class ArtifactChangedRequest(BaseModel):
    """Artifact değişikliği bildirimi — review gate sıfırlar."""
    artifact_description: Optional[str] = None
    actor_id: Optional[str] = None
