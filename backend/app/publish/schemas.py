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
    # Gate 4 (Publish Closure): operator-actionable error category.
    last_error_category: Optional[str] = None
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
    # Gate 4 (Publish Closure): expose category in lists for triage filters.
    last_error_category: Optional[str] = None
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


# ---------------------------------------------------------------------------
# Gate 4 (Publish Closure) — Bulk action schemas
# ---------------------------------------------------------------------------

class BulkActionRequest(BaseModel):
    """
    Bulk publish aksiyon isteği.

    record_ids   : 1..100 publish kaydı (boş liste yasak).
    actor_id     : Aksiyonu tetikleyen kullanıcı (opsiyonel; header'dan da alınır).
    note         : Opsiyonel açıklama; her log/audit kaydına yazılır.
    """
    record_ids: list[str]
    actor_id: Optional[str] = None
    note: Optional[str] = None


class BulkRejectRequest(BulkActionRequest):
    """
    Bulk reject — `rejection_reason` ZORUNLU.

    Boş / whitespace olamaz. Router katmanında 422 ile reddedilir.
    """
    rejection_reason: str


class BulkActionItemResult(BaseModel):
    """Tek bir record için bulk aksiyon sonucu."""
    record_id: str
    ok: bool
    status_after: Optional[str] = None
    error_code: Optional[str] = None  # 'not_found' | 'invalid_transition' | 'gate_violation' | 'terminal' | 'internal'
    error_message: Optional[str] = None


class BulkActionResponse(BaseModel):
    """
    Bulk aksiyon yanıtı — per-record sonuç + özet.

    Her record için ayrı transaction kullanılır; partial fail tipiktir.
    """
    action: str  # 'approve' | 'reject' | 'cancel' | 'retry'
    requested: int
    succeeded: int
    failed: int
    results: list[BulkActionItemResult]


# ---------------------------------------------------------------------------
# Gate 4 — Scheduler health schemas
# ---------------------------------------------------------------------------

class SchedulerHealthResponse(BaseModel):
    """
    Publish scheduler arka plan görevi sağlık durumu.

    state                : 'healthy' | 'stale' | 'unknown'
    started_at           : Uygulama başladığında scheduler'ın start zamanı (UTC).
    last_tick_at         : En son polling tick zamanı (UTC). None ise hiç tick atılmadı.
    last_due_count       : Son tick'te bulunan due record sayısı.
    last_triggered_count : Son tick'te tetiklenen publish sayısı.
    last_skipped_count   : Son tick'te token pre-flight nedeniyle atlanan sayısı.
    total_ticks          : Süreç boyunca toplam tick sayısı.
    total_triggered      : Süreç boyunca toplam tetikleme sayısı.
    total_skipped        : Süreç boyunca toplam pre-flight skip sayısı.
    consecutive_errors   : Üst üste başarısız tick sayısı.
    last_error           : Son tick'in hata mesajı (varsa).
    interval_seconds     : Polling aralığı (saniye).
    stale_threshold_seconds : Stale sayılma eşiği (saniye).
    """
    state: str
    started_at: Optional[datetime] = None
    last_tick_at: Optional[datetime] = None
    last_due_count: int = 0
    last_triggered_count: int = 0
    last_skipped_count: int = 0
    total_ticks: int = 0
    total_triggered: int = 0
    total_skipped: int = 0
    consecutive_errors: int = 0
    last_error: Optional[str] = None
    interval_seconds: float
    stale_threshold_seconds: float


# ---------------------------------------------------------------------------
# Gate 4 (Z-4) — Token expiry / pre-flight schemas
# ---------------------------------------------------------------------------

class TokenStatusResponse(BaseModel):
    """
    Bir PlatformConnection için token sağlık durumu — UI badge için.

    severity:
      'ok'       — eylem gerekmiyor.
      'warn'     — `warn_threshold` (varsayılan 7g) içinde sona eriyor.
      'critical' — `critical_threshold` (varsayılan 24s) içinde sona eriyor.
      'expired'  — süresi geçmiş; refresh_token varsa otomatik yenilenir.
      'reauth'   — connection.requires_reauth True; kullanıcı reauth yapmalı.
      'unknown'  — kayıt veya expiry bilgisi yok.

    seconds_remaining: pozitif (henüz geçmedi) / negatif (geçti) / None.
    is_blocking: scheduler bu kaydı atlar (yalnızca 'reauth' durumunda True).
    """
    connection_id: str
    severity: str
    seconds_remaining: Optional[int] = None
    expires_at: Optional[datetime] = None
    requires_reauth: bool = False
    has_refresh_token: bool = False
    is_blocking: bool = False
    suggested_action: Optional[str] = None
