"""
Publish Center Servis Katmanı — M7-C1.

Tüm iş mantığı burada; router yalnızca HTTP katmanı.
DB güncellemeleri için servis fonksiyonları kullanılmalıdır.

Kural: PublishRecord.status doğrudan ORM atamasıyla değiştirilemez.
Tüm durum geçişleri _transition_status() üzerinden geçer.

Denetim izi kuralı:
  Her durum geçişi, her review kararı ve her anlamlı olay için
  _append_log() çağrılır. Sessiz güncelleme yasaktır.

Content/editorial izolasyon kuralı (M7):
  Bu servis StandardVideo veya NewsBulletin tablolarını değiştirmez.
  Publish sonucu yalnızca publish_records ve publish_logs tablolarına yazılır.

Publish gate kuralı:
  trigger_publish() yalnızca PublishStateMachine.can_publish() == True
  olan kayıtlar için çağrılabilir. Gate bu fonksiyon içinde zorlanır.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PublishRecord, PublishLog
from app.publish.enums import PublishStatus, PublishLogEvent
from app.publish.exceptions import (
    PublishRecordNotFoundError,
    InvalidPublishTransitionError,
    PublishGateViolationError,
    PublishAlreadyTerminalError,
)
from app.publish.schemas import PublishRecordCreate
from app.publish.state_machine import PublishStateMachine

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

async def _get_record_or_404(
    session: AsyncSession, record_id: str
) -> PublishRecord:
    """ID'ye göre PublishRecord getirir; bulunamazsa PublishRecordNotFoundError."""
    result = await session.execute(
        select(PublishRecord).where(PublishRecord.id == record_id)
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise PublishRecordNotFoundError(
            f"PublishRecord bulunamadı: id={record_id}"
        )
    return record


async def _append_log(
    session: AsyncSession,
    publish_record_id: str,
    event_type: PublishLogEvent,
    actor_type: str,
    actor_id: Optional[str] = None,
    from_status: Optional[str] = None,
    to_status: Optional[str] = None,
    detail: Optional[dict] = None,
    note: Optional[str] = None,
) -> PublishLog:
    """
    Publish log satırı oluştur ve session'a ekle (commit çağırmaz).

    Her anlamlı publish olayı için çağrılmalıdır — sessiz güncelleme yasaktır.
    """
    log_entry = PublishLog(
        publish_record_id=publish_record_id,
        event_type=event_type.value,
        actor_type=actor_type,
        actor_id=actor_id,
        from_status=from_status,
        to_status=to_status,
        detail_json=json.dumps(detail or {}, ensure_ascii=False),
        note=note,
    )
    session.add(log_entry)
    return log_entry


async def _transition_status(
    session: AsyncSession,
    record: PublishRecord,
    next_status: str,
    actor_type: str = "system",
    actor_id: Optional[str] = None,
    note: Optional[str] = None,
    detail: Optional[dict] = None,
) -> PublishRecord:
    """
    Durum geçişini doğrula, uygula ve log yaz.

    Geçiş yasadışıysa InvalidPublishTransitionError fırlatır.
    Terminal durumda ise PublishAlreadyTerminalError fırlatır.
    """
    if PublishStateMachine.is_terminal(record.status):
        raise PublishAlreadyTerminalError(
            f"PublishRecord {record.id} terminal durumda ({record.status}). "
            f"Geçiş yapılamaz."
        )

    from_status = record.status
    try:
        validated_next = PublishStateMachine.transition(record.status, next_status)
    except ValueError as exc:
        raise InvalidPublishTransitionError(str(exc)) from exc

    # Yan etkiler
    record.status = validated_next
    if next_status == PublishStatus.PUBLISHED.value:
        record.published_at = _now()
        record.last_error = None
    elif next_status == PublishStatus.PUBLISHING.value:
        record.publish_attempt_count = (record.publish_attempt_count or 0) + 1
        record.last_error = None
    elif next_status in (PublishStatus.FAILED.value,):
        record.last_error = note or (detail or {}).get("error")

    await _append_log(
        session=session,
        publish_record_id=record.id,
        event_type=PublishLogEvent.STATE_TRANSITION,
        actor_type=actor_type,
        actor_id=actor_id,
        from_status=from_status,
        to_status=validated_next,
        detail=detail,
        note=note,
    )
    logger.info(
        "PublishRecord %s: %s → %s (actor=%s/%s)",
        record.id, from_status, validated_next, actor_type, actor_id
    )
    return record


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

async def create_publish_record(
    session: AsyncSession,
    data: PublishRecordCreate,
    actor_id: Optional[str] = None,
) -> PublishRecord:
    """
    Yeni publish kaydı oluşturur, draft durumunda başlar.

    İçerik/editorial state'i değiştirmez.
    Oluşturma olayını PublishLog'a yazar.
    """
    record = PublishRecord(
        job_id=data.job_id,
        content_ref_type=data.content_ref_type,
        content_ref_id=data.content_ref_id,
        platform=data.platform,
        status=PublishStatus.DRAFT.value,
        review_state="pending",
        payload_json=data.payload_json,
        notes=data.notes,
    )
    session.add(record)
    await session.flush()  # ID'yi al

    await _append_log(
        session=session,
        publish_record_id=record.id,
        event_type=PublishLogEvent.STATE_TRANSITION,
        actor_type="user",
        actor_id=actor_id,
        from_status=None,
        to_status=PublishStatus.DRAFT.value,
        note="Publish kaydı oluşturuldu.",
    )
    await session.commit()
    await session.refresh(record)
    logger.info("PublishRecord oluşturuldu: id=%s job_id=%s", record.id, record.job_id)
    return record


async def get_publish_record(
    session: AsyncSession, record_id: str
) -> PublishRecord:
    """ID'ye göre PublishRecord getirir."""
    return await _get_record_or_404(session, record_id)


async def list_publish_records(
    session: AsyncSession,
    job_id: Optional[str] = None,
    platform: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[PublishRecord]:
    """
    Filtrelenmiş publish kayıtlarını döndürür.

    job_id, platform veya status ile filtrelenebilir.
    """
    query = select(PublishRecord)
    if job_id:
        query = query.where(PublishRecord.job_id == job_id)
    if platform:
        query = query.where(PublishRecord.platform == platform)
    if status:
        query = query.where(PublishRecord.status == status)
    query = query.order_by(PublishRecord.created_at.desc()).limit(limit).offset(offset)
    result = await session.execute(query)
    return list(result.scalars().all())


async def get_publish_logs(
    session: AsyncSession,
    publish_record_id: str,
    limit: int = 100,
    offset: int = 0,
) -> list[PublishLog]:
    """
    Belirli bir publish kaydına ait log satırlarını döndürür (kronolojik sıra).
    """
    result = await session.execute(
        select(PublishLog)
        .where(PublishLog.publish_record_id == publish_record_id)
        .order_by(PublishLog.created_at.asc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Durum geçiş aksiyonları
# ---------------------------------------------------------------------------

async def submit_for_review(
    session: AsyncSession,
    record_id: str,
    actor_id: Optional[str] = None,
    note: Optional[str] = None,
) -> PublishRecord:
    """
    draft → pending_review geçişi.

    Review gate'i açar. Bu noktadan sonra yayınlama için operatör onayı gerekir.
    """
    record = await _get_record_or_404(session, record_id)
    await _transition_status(
        session=session,
        record=record,
        next_status=PublishStatus.PENDING_REVIEW.value,
        actor_type="user",
        actor_id=actor_id,
        note=note or "Review'a gönderildi.",
    )
    await session.commit()
    await session.refresh(record)
    return record


async def review_action(
    session: AsyncSession,
    record_id: str,
    decision: str,
    reviewer_id: Optional[str] = None,
    note: Optional[str] = None,
) -> PublishRecord:
    """
    Operatör review kararı: 'approve' veya 'reject'.

    approve → approved durumuna geçirir.
    reject  → review_rejected durumuna geçirir.

    Review gate / publish gate izolasyon kuralı:
      Bu fonksiyon yalnızca review kararı verir.
      Yayınlama girişimini başlatmaz. trigger_publish() ayrı çağrılır.
    """
    record = await _get_record_or_404(session, record_id)

    if decision == "approve":
        next_status = PublishStatus.APPROVED.value
        review_state = "approved"
    elif decision == "reject":
        next_status = PublishStatus.REVIEW_REJECTED.value
        review_state = "rejected"
    else:
        raise ValueError(f"Geçersiz review kararı: '{decision}'. Beklenen: 'approve' veya 'reject'")

    record.review_state = review_state
    record.reviewer_id = reviewer_id
    record.reviewed_at = _now()

    await _transition_status(
        session=session,
        record=record,
        next_status=next_status,
        actor_type="admin",
        actor_id=reviewer_id,
        note=note,
        detail={"decision": decision},
    )
    await _append_log(
        session=session,
        publish_record_id=record.id,
        event_type=PublishLogEvent.REVIEW_ACTION,
        actor_type="admin",
        actor_id=reviewer_id,
        detail={"decision": decision, "review_state": review_state},
        note=note,
    )
    await session.commit()
    await session.refresh(record)
    return record


async def schedule_publish(
    session: AsyncSession,
    record_id: str,
    scheduled_at: datetime,
    actor_id: Optional[str] = None,
    note: Optional[str] = None,
) -> PublishRecord:
    """
    approved → scheduled geçişi. Publish zamanını ayarlar.
    """
    record = await _get_record_or_404(session, record_id)
    record.scheduled_at = scheduled_at
    await _transition_status(
        session=session,
        record=record,
        next_status=PublishStatus.SCHEDULED.value,
        actor_type="user",
        actor_id=actor_id,
        note=note,
        detail={"scheduled_at": scheduled_at.isoformat()},
    )
    await _append_log(
        session=session,
        publish_record_id=record.id,
        event_type=PublishLogEvent.SCHEDULE_SET,
        actor_type="user",
        actor_id=actor_id,
        detail={"scheduled_at": scheduled_at.isoformat()},
        note=note,
    )
    await session.commit()
    await session.refresh(record)
    return record


async def trigger_publish(
    session: AsyncSession,
    record_id: str,
    actor_id: Optional[str] = None,
    note: Optional[str] = None,
) -> PublishRecord:
    """
    Publish işlemini başlatır: approved/scheduled/failed → publishing.

    Publish gate kuralı zorunlu:
      can_publish() == False ise PublishGateViolationError fırlatır.
      Bu kontrol, draft veya pending_review durumundan
      doğrudan yayınlamayı engeller.
    """
    record = await _get_record_or_404(session, record_id)

    if not PublishStateMachine.can_publish(record.status):
        raise PublishGateViolationError(
            f"PublishRecord {record.id} publish gate'i geçemiyor. "
            f"Mevcut durum: '{record.status}'. "
            f"Yayınlama yalnızca approved/scheduled/failed durumundan başlatılabilir."
        )

    await _transition_status(
        session=session,
        record=record,
        next_status=PublishStatus.PUBLISHING.value,
        actor_type="system",
        actor_id=actor_id,
        note=note or "Yayınlama başlatıldı.",
    )
    await _append_log(
        session=session,
        publish_record_id=record.id,
        event_type=PublishLogEvent.PUBLISH_ATTEMPT,
        actor_type="system",
        actor_id=actor_id,
        detail={"attempt_count": record.publish_attempt_count},
        note=note,
    )
    await session.commit()
    await session.refresh(record)
    return record


async def mark_published(
    session: AsyncSession,
    record_id: str,
    platform_video_id: str,
    platform_url: str,
    result_json: Optional[str] = None,
    actor_id: Optional[str] = None,
    note: Optional[str] = None,
) -> PublishRecord:
    """
    publishing → published geçişi. Platform başarı bilgisini kaydeder.
    """
    record = await _get_record_or_404(session, record_id)
    record.platform_video_id = platform_video_id
    record.platform_url = platform_url
    if result_json:
        record.result_json = result_json

    await _transition_status(
        session=session,
        record=record,
        next_status=PublishStatus.PUBLISHED.value,
        actor_type="system",
        actor_id=actor_id,
        note=note,
        detail={"platform_video_id": platform_video_id, "platform_url": platform_url},
    )
    await _append_log(
        session=session,
        publish_record_id=record.id,
        event_type=PublishLogEvent.PLATFORM_EVENT,
        actor_type="system",
        actor_id=actor_id,
        detail={"event": "publish_success", "platform_video_id": platform_video_id},
        note=note,
    )
    await session.commit()
    await session.refresh(record)
    logger.info("PublishRecord %s başarıyla yayınlandı: %s", record.id, platform_url)
    return record


async def mark_failed(
    session: AsyncSession,
    record_id: str,
    error_message: str,
    error_code: Optional[str] = None,
    actor_id: Optional[str] = None,
) -> PublishRecord:
    """
    publishing → failed geçişi. Hata bilgisini kaydeder.

    Kısmi başarısızlık semantiği:
      platform_video_id zaten doluysa (upload başarılı, activate başarısız)
      bu bilgi korunur; servis/çalışan yeniden trigger_publish() çağırabilir.
    """
    record = await _get_record_or_404(session, record_id)
    detail: dict = {"error_message": error_message}
    if error_code:
        detail["error_code"] = error_code

    await _transition_status(
        session=session,
        record=record,
        next_status=PublishStatus.FAILED.value,
        actor_type="system",
        actor_id=actor_id,
        note=error_message,
        detail=detail,
    )
    await _append_log(
        session=session,
        publish_record_id=record.id,
        event_type=PublishLogEvent.PLATFORM_EVENT,
        actor_type="system",
        actor_id=actor_id,
        detail={"event": "publish_failed", **detail},
        note=error_message,
    )
    await session.commit()
    await session.refresh(record)
    logger.warning(
        "PublishRecord %s başarısız: %s (code=%s)", record.id, error_message, error_code
    )
    return record


async def cancel_publish(
    session: AsyncSession,
    record_id: str,
    actor_id: Optional[str] = None,
    note: Optional[str] = None,
) -> PublishRecord:
    """
    Publish kaydını iptal eder.

    publishing durumundaki iptal: platform'a bağlı işlem zaten başlamış
    olabilir; bu fonksiyon yalnızca DB kaydını günceller.
    Gerçek platform iptal işlemi adaptör katmanında ele alınır.
    """
    record = await _get_record_or_404(session, record_id)
    await _transition_status(
        session=session,
        record=record,
        next_status=PublishStatus.CANCELLED.value,
        actor_type="user",
        actor_id=actor_id,
        note=note or "İptal edildi.",
    )
    await _append_log(
        session=session,
        publish_record_id=record.id,
        event_type=PublishLogEvent.CANCEL,
        actor_type="user",
        actor_id=actor_id,
        note=note,
    )
    await session.commit()
    await session.refresh(record)
    return record


async def reset_to_draft(
    session: AsyncSession,
    record_id: str,
    actor_id: Optional[str] = None,
    note: Optional[str] = None,
) -> PublishRecord:
    """
    review_rejected → draft geçişi. Düzeltme sonrası yeniden review sürecine alınabilir.
    """
    record = await _get_record_or_404(session, record_id)
    record.review_state = "pending"
    record.reviewer_id = None
    record.reviewed_at = None
    await _transition_status(
        session=session,
        record=record,
        next_status=PublishStatus.DRAFT.value,
        actor_type="user",
        actor_id=actor_id,
        note=note or "Düzeltme için draft'a döndürüldü.",
    )
    await session.commit()
    await session.refresh(record)
    return record
