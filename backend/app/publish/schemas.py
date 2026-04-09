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
    # V2 fields — Faz 11
    content_project_id: Optional[str] = None
    platform_connection_id: Optional[str] = None
    publish_intent_json: Optional[str] = None


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
    # V2 fields — Faz 11
    content_project_id: Optional[str] = None
    platform_connection_id: Optional[str] = None
    publish_intent_json: Optional[str] = None
    publish_result_json: Optional[str] = None
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
    # V2 fields — Faz 11
    content_project_id: Optional[str] = None
    platform_connection_id: Optional[str] = None
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
    # V2 fields — Faz 11
    content_project_id: Optional[str] = None
    platform_connection_id: Optional[str] = None


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


# ---------------------------------------------------------------------------
# V2 — Faz 11: Connection matching for publish
# ---------------------------------------------------------------------------

class ConnectionForPublish(BaseModel):
    """Publish için uygun platform bağlantısı özeti."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    channel_profile_id: str
    platform: str
    external_account_name: Optional[str] = None
    external_account_id: Optional[str] = None
    connection_status: str
    auth_state: str
    token_state: str
    scope_status: str
    is_primary: bool
    can_publish: bool  # computed: connection_status == "connected" and token_state == "valid"


class PublishIntentData(BaseModel):
    """Publish intent yapısı — planlanan publish bilgileri."""
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    privacy_status: Optional[str] = None  # public / unlisted / private
    scheduled_at: Optional[str] = None
    category_id: Optional[str] = None
    playlist_ids: Optional[list[str]] = None
    thumbnail_path: Optional[str] = None
    notify_subscribers: Optional[bool] = None
