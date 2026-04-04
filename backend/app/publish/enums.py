"""
Publish Center Sabit Değerleri — M7-C1.

Publish subsystem için tek kaynak enum tanımları.
Bu modülün dışında yeniden tanımlanmamalıdır.
"""

from enum import Enum


class PublishStatus(str, Enum):
    """
    PublishRecord yaşam döngüsü durumları.

    Geçişler PublishStateMachine tarafından zorlanır.
    String değer doğrudan publish_records.status DB sütununda saklanır.

    draft           : Oluşturuldu, review başlatılmadı.
    pending_review  : Review gate açıldı, operatör onayı bekleniyor.
    review_rejected : Operatör reddetti; düzeltme sonrası draft'a dönebilir.
    approved        : Operatör onayladı; yayınlama başlatılabilir.
    scheduled       : İlerideki bir zamana planlandı.
    publishing      : Upload/activate zinciri aktif.
    published       : Tüm adımlar başarıyla tamamlandı (terminal).
    failed          : Yayınlama girişimi başarısız (retry mümkün).
    cancelled       : İptal edildi (terminal).
    """
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    REVIEW_REJECTED = "review_rejected"
    APPROVED = "approved"
    SCHEDULED = "scheduled"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PublishPlatform(str, Enum):
    """
    Desteklenen yayın platformları.

    M7: Yalnızca YouTube. İleride platform eklenmesi bu enum'u genişletir.
    Adaptör kaydı PublishAdapter alt sınıflarına bırakılır.
    """
    YOUTUBE = "youtube"


class PublishLogEvent(str, Enum):
    """
    PublishLog'a yazılabilecek olay türleri.

    Her olay türü audit trail'de ayrı bir satır oluşturur.
    Hiçbir kritik eylem log kaydı olmadan gerçekleşmemelidir.

    state_transition   : Durum geçişi (ör. draft → pending_review).
    review_action      : Operatör review kararı (approve/reject).
    publish_attempt    : Yayınlama girişimi başlatıldı.
    platform_event     : Platform'dan gelen olay (upload tamamlandı, hata, vb.).
    retry              : Retry girişimi başlatıldı.
    cancel             : İptal işlemi.
    schedule_set       : Zamanlama ayarlandı.
    schedule_changed   : Zamanlama değiştirildi.
    note               : Operatör veya sistem notu.
    """
    STATE_TRANSITION = "state_transition"
    REVIEW_ACTION = "review_action"
    PUBLISH_ATTEMPT = "publish_attempt"
    PLATFORM_EVENT = "platform_event"
    RETRY = "retry"
    CANCEL = "cancel"
    SCHEDULE_SET = "schedule_set"
    SCHEDULE_CHANGED = "schedule_changed"
    NOTE = "note"
