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

import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PublishRecord, PublishLog, Job, PlatformConnection, ChannelProfile
from app.publish.enums import PublishStatus, PublishLogEvent
from app.publish.exceptions import (
    PublishRecordNotFoundError,
    InvalidPublishTransitionError,
    PublishGateViolationError,
    PublishAlreadyTerminalError,
    ReviewGateViolationError,
)
from app.publish.schemas import PublishRecordCreate
from app.audit.service import write_audit_log
from app.publish.state_machine import PublishStateMachine
from app.publish.error_classifier import categorize_publish_error
from app.automation.event_hooks import emit_operation_event, evaluate_and_emit

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
        record.last_error_category = None
    elif next_status == PublishStatus.PUBLISHING.value:
        record.publish_attempt_count = (record.publish_attempt_count or 0) + 1
        record.last_error = None
        # Gate 4: a fresh attempt clears the previous category until the
        # next failure (if any) re-classifies it.
        record.last_error_category = None
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
    await write_audit_log(
        session, action="publish.status_transition",
        entity_type="publish_record", entity_id=record.id,
        details={"from_status": from_status, "to_status": validated_next},
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
        # V2 fields — Faz 11
        content_project_id=getattr(data, "content_project_id", None),
        platform_connection_id=getattr(data, "platform_connection_id", None),
        publish_intent_json=getattr(data, "publish_intent_json", None),
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
    content_ref_type: Optional[str] = None,
    error_category: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user_context: Optional[object] = None,
) -> list[PublishRecord]:
    """
    Filtrelenmiş publish kayıtlarını döndürür.

    job_id, platform, status, content_ref_type veya error_category ile
    filtrelenebilir. error_category Gate 4 closure paketinde eklendi —
    failed kayıtları kategori bazlı triage etmek için kullanılır.

    PHASE X: `user_context` geldi ise non-admin'ler icin
    PublishRecord -> Job.owner_id = ctx.user_id sartiyla scope'lanir.
    Admin icin filtre yoktur.
    """
    query = select(PublishRecord)
    # PHASE X: ownership scope
    if user_context is not None and not getattr(user_context, "is_admin", False):
        query = query.join(Job, PublishRecord.job_id == Job.id).where(
            Job.owner_id == user_context.user_id
        )
    if job_id:
        query = query.where(PublishRecord.job_id == job_id)
    if platform:
        query = query.where(PublishRecord.platform == platform)
    if status:
        query = query.where(PublishRecord.status == status)
    if content_ref_type:
        query = query.where(PublishRecord.content_ref_type == content_ref_type)
    if error_category:
        query = query.where(PublishRecord.last_error_category == error_category)
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
# Public log yardımcısı (executor tarafından çağrılır)
# ---------------------------------------------------------------------------

async def append_platform_event(
    session: AsyncSession,
    publish_record_id: str,
    event: str,
    detail: Optional[dict] = None,
    actor_id: Optional[str] = "publish_executor",
) -> None:
    """
    Platform event'i PublishLog'a yazar.

    Executor bu fonksiyonu çağırır — doğrudan ORM yazmak yerine.
    Bu garantiye uyulursa audit trail tamamen servis katmanından geçer.

    commit() çağırmaz; çağıran commit sorumluluğunu taşır.
    Yazma hatası kritik değil — uyarı loglanır ama exception fırlatılmaz.
    """
    try:
        await _append_log(
            session=session,
            publish_record_id=publish_record_id,
            event_type=PublishLogEvent.PLATFORM_EVENT,
            actor_type="system",
            actor_id=actor_id,
            detail={"event": event, **(detail or {})},
        )
        await session.flush()
    except Exception as exc:
        logger.warning(
            "append_platform_event: log yazılamadı (event=%s, record=%s): %s",
            event, publish_record_id, exc,
        )


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
    # Faz 15: emit publish_review inbox item
    await emit_operation_event(
        session,
        item_type="publish_review",
        title=f"Yayin onay bekliyor: {record.content_ref_type}",
        reason=f"PublishRecord {record.id[:8]} review'a gonderildi.",
        priority="high",
        related_entity_type="publish_record",
        related_entity_id=record.id,
        related_project_id=getattr(record, "content_project_id", None),
        action_url=f"/admin/publish/{record.id}",
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
    rejection_reason: Optional[str] = None,
) -> PublishRecord:
    """
    Operatör review kararı: 'approve' veya 'reject'.

    approve → approved durumuna geçirir.
    reject  → review_rejected durumuna geçirir.

    Review gate / publish gate izolasyon kuralı:
      Bu fonksiyon yalnızca review kararı verir.
      Yayınlama girişimini başlatmaz. trigger_publish() ayrı çağrılır.

    Reddetme kuralı:
      rejection_reason varsa log'a detail_json içinde kaydedilir.
    """
    record = await _get_record_or_404(session, record_id)

    # Review gate kuralı: yalnızca pending_review durumundaki kayıta review kararı verilir.
    # draft, approved veya başka bir durumdan review_action çağrısı yasaktır.
    if record.status != PublishStatus.PENDING_REVIEW.value:
        raise ReviewGateViolationError(
            f"PublishRecord {record.id} review gate'i geçemiyor. "
            f"Mevcut durum: '{record.status}'. "
            f"Review kararı yalnızca pending_review durumundaki kayıtlara verilebilir."
        )

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

    detail: dict = {"decision": decision}
    if rejection_reason:
        detail["rejection_reason"] = rejection_reason

    await _transition_status(
        session=session,
        record=record,
        next_status=next_status,
        actor_type="admin",
        actor_id=reviewer_id,
        note=note,
        detail=detail,
    )
    await _append_log(
        session=session,
        publish_record_id=record.id,
        event_type=PublishLogEvent.REVIEW_ACTION,
        actor_type="admin",
        actor_id=reviewer_id,
        detail={"decision": decision, "review_state": review_state, **({"rejection_reason": rejection_reason} if rejection_reason else {})},
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

    Timezone normalizasyonu:
      scheduled_at her zaman UTC'ye normalize edilerek saklanır.
      Timezone-naive datetime gelirse UTC olarak yorumlanır ve
      UTC-aware datetime'a dönüştürülür. Bu davranış servis katmanında
      zorlanır; test veya çağıran kod workaround yapmamalıdır.
    """
    # UTC normalizasyonu — naive datetime'ı UTC-aware'e dönüştür
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    else:
        scheduled_at = scheduled_at.astimezone(timezone.utc)

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

    # M23-E: Duplicate publish koruması — publishing durumundaki kayıt tekrar tetiklenemez
    if record.status == PublishStatus.PUBLISHING.value:
        raise PublishGateViolationError(
            f"PublishRecord {record.id} zaten 'publishing' durumunda. "
            f"Duplicate trigger engellendi. Tamamlanmasını veya failed durumunu bekleyin."
        )

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

    # V2 — Faz 11: populate publish_result_json with structured result
    publish_result = {
        "platform_video_id": platform_video_id,
        "platform_url": platform_url,
        "published_at": _now().isoformat(),
        "attempt_count": record.publish_attempt_count,
    }
    record.publish_result_json = json.dumps(publish_result, ensure_ascii=False)

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
    # Gate 4: classify the failure so the UI/operator can act on it.
    status_code: Optional[int] = None
    if error_code is not None:
        try:
            status_code = int(error_code)
        except (TypeError, ValueError):
            status_code = None
    category = categorize_publish_error(error_message, status_code=status_code)
    record.last_error_category = category.value
    detail: dict = {"error_message": error_message, "error_category": category.value}
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
    # Faz 15: emit publish_failure inbox item
    await emit_operation_event(
        session,
        item_type="publish_failure",
        title=f"Yayin basarisiz: {record.content_ref_type}",
        reason=error_message[:200] if error_message else "Bilinmeyen hata",
        priority="urgent",
        related_entity_type="publish_record",
        related_entity_id=record.id,
        related_project_id=getattr(record, "content_project_id", None),
        action_url=f"/admin/publish/{record.id}",
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

    # M23-E: Zaten iptal veya yayınlanmış kayıt tekrar iptal edilemez
    if record.status == PublishStatus.CANCELLED.value:
        raise PublishAlreadyTerminalError(
            f"PublishRecord {record.id} zaten iptal edilmiş. Duplicate cancel engellendi."
        )

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


async def retry_publish(
    session: AsyncSession,
    record_id: str,
    actor_id: Optional[str] = None,
    note: Optional[str] = None,
) -> PublishRecord:
    """
    failed → publishing geçişi (retry).

    Kısmi başarısızlık semantiği:
      platform_video_id dolu ise (upload başarılı, activate başarısız)
      bu bilgi korunur — upload tekrar çalışmaz.
      Executor upload skip mantığını platform_video_id varlığına göre uygular.

    Publish gate kuralı burada da uygulanır:
      Yalnızca failed durumundaki kayıt retry edilebilir.
      (failed, can_publish() == True durumlarından biridir)
    """
    record = await _get_record_or_404(session, record_id)

    if not PublishStateMachine.can_publish(record.status):
        raise PublishGateViolationError(
            f"PublishRecord {record.id} retry edilemiyor. "
            f"Mevcut durum: '{record.status}'. "
            f"Retry yalnızca 'failed' durumundan başlatılabilir."
        )

    await _transition_status(
        session=session,
        record=record,
        next_status=PublishStatus.PUBLISHING.value,
        actor_type="user",
        actor_id=actor_id,
        note=note or "Retry başlatıldı.",
    )
    await _append_log(
        session=session,
        publish_record_id=record.id,
        event_type=PublishLogEvent.RETRY,
        actor_type="user",
        actor_id=actor_id,
        detail={"attempt_count": record.publish_attempt_count},
        note=note,
    )
    await session.commit()
    await session.refresh(record)
    logger.info(
        "PublishRecord %s retry başlatıldı (deneme=%d, platform_video_id=%s)",
        record.id, record.publish_attempt_count, record.platform_video_id,
    )
    return record


async def create_publish_record_from_job(
    session: AsyncSession,
    job_id: str,
    platform: str,
    content_ref_type: str,
    content_ref_id: Optional[str] = None,
    actor_id: Optional[str] = None,
    content_project_id: Optional[str] = None,
    platform_connection_id: Optional[str] = None,
) -> PublishRecord:
    """
    Job'dan publish kaydı oluşturur.

    Job'un workspace_path içindeki metadata.json artifact'ını okumaya çalışır
    ve title/description/tags bilgilerini payload_json'a ekler.
    Artifact bulunamazsa boş payload ile devam edilir.

    Job bulunamazsa PublishRecordNotFoundError fırlatır.
    """
    result = await session.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise PublishRecordNotFoundError(f"Job bulunamadı: id={job_id}")

    # content_ref_id verilmemişse job_id'yi kullan
    effective_content_ref_id = content_ref_id or job_id

    # Workspace'ten metadata.json okumayı dene.
    # Publish Core Hardening Pack — Gate 2: tek otorite okuma.
    # Modüller (standard_video + news_bulletin) artifact'ı
    # `{workspace}/artifacts/metadata.json` altına yazıyor. Eski job'lar için
    # `{workspace}/metadata.json` legacy fallback olarak korunuyor.
    payload_data: dict = {}
    if job.workspace_path:
        candidate_paths = [
            os.path.join(job.workspace_path, "artifacts", "metadata.json"),  # primary
            os.path.join(job.workspace_path, "metadata.json"),               # legacy
        ]
        meta_source: Optional[str] = None
        for metadata_path in candidate_paths:
            if os.path.isfile(metadata_path):
                try:
                    with open(metadata_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    for key in ("title", "description", "tags"):
                        if key in meta:
                            payload_data[key] = meta[key]
                    # Preserve common auxiliary fields if present (category/language)
                    for key in ("category", "language"):
                        if key in meta and key not in payload_data:
                            payload_data[key] = meta[key]
                    meta_source = metadata_path
                    break
                except Exception as exc:
                    logger.warning(
                        "create_publish_record_from_job: metadata.json okunamadı "
                        "(job=%s, path=%s): %s", job_id, metadata_path, exc,
                    )
        if meta_source is not None:
            logger.info(
                "create_publish_record_from_job: metadata source (job=%s): %s",
                job_id, meta_source,
            )

    # input_data_json'dan da başlık almayı dene (fallback)
    if not payload_data.get("title") and job.input_data_json:
        try:
            input_data = json.loads(job.input_data_json)
            if "topic" in input_data:
                payload_data.setdefault("title", input_data["topic"])
        except Exception as exc:
            logger.warning("Failed to parse input_data for publish record title: %s", exc)

    # V2 — Faz 11: build publish_intent_json from payload_data
    publish_intent = {}
    if payload_data.get("title"):
        publish_intent["title"] = payload_data["title"]
    if payload_data.get("description"):
        publish_intent["description"] = payload_data["description"]
    if payload_data.get("tags"):
        publish_intent["tags"] = payload_data["tags"]

    from app.publish.schemas import PublishRecordCreate
    create_data = PublishRecordCreate(
        job_id=job_id,
        content_ref_type=content_ref_type,
        content_ref_id=effective_content_ref_id,
        platform=platform,
        payload_json=json.dumps(payload_data, ensure_ascii=False) if payload_data else None,
        notes=f"Job'dan otomatik oluşturuldu: {job_id}",
        content_project_id=content_project_id,
        platform_connection_id=platform_connection_id,
        publish_intent_json=json.dumps(publish_intent, ensure_ascii=False) if publish_intent else None,
    )
    return await create_publish_record(session=session, data=create_data, actor_id=actor_id)


async def patch_publish_payload(
    session: AsyncSession,
    record_id: str,
    payload_json: str,
    actor_id: Optional[str] = None,
) -> PublishRecord:
    """
    Draft durumundaki publish kaydının payload_json'ını günceller.

    Yalnızca draft durumunda izin verilir.
    PublishGateViolationError: draft olmayan durumda çağrılırsa.
    """
    record = await _get_record_or_404(session, record_id)

    if record.status != PublishStatus.DRAFT.value:
        raise PublishGateViolationError(
            f"PublishRecord {record.id} payload güncellenemez. "
            f"Mevcut durum: '{record.status}'. "
            f"Payload yalnızca draft durumunda güncellenebilir."
        )

    record.payload_json = payload_json
    await _append_log(
        session=session,
        publish_record_id=record.id,
        event_type=PublishLogEvent.NOTE,
        actor_type="user",
        actor_id=actor_id,
        detail={"action": "payload_updated"},
        note="Payload güncellendi (draft)",
    )
    await session.commit()
    await session.refresh(record)
    logger.info("PublishRecord %s: payload güncellendi (draft).", record.id)
    return record


async def reset_review_for_artifact_change(
    session: AsyncSession,
    record_id: str,
    artifact_description: Optional[str] = None,
    actor_id: Optional[str] = None,
) -> PublishRecord:
    """
    Onaylanmış kayıtta artifact değiştiğinde review gate'i sıfırlar.

    Kural (master plan Review reset test):
      Operatör bir job'u review gate'ten geçirdikten sonra herhangi bir
      artifact yeniden üretilirse (script, metadata, render çıktısı vb.),
      review gate otomatik olarak pending_review'a sıfırlanmalı; operatör
      publish işlemine devam etmeden önce yeniden onay vermelidir.

    Tetiklenebilecek durumlar: approved, scheduled.
    draft, pending_review, publishing, published, failed, cancelled: bu
    fonksiyon bu durumlarda işlem yapmaz (sıfırlanacak onay yoktur).

    Yanıt: güncellenen PublishRecord.
    """
    record = await _get_record_or_404(session, record_id)

    _RESETTABLE_STATES = {
        PublishStatus.APPROVED.value,
        PublishStatus.SCHEDULED.value,
    }
    if record.status not in _RESETTABLE_STATES:
        # Sıfırlanacak bir onay yok — sessizce geçerli kaydı döndür
        logger.debug(
            "reset_review_for_artifact_change: %s durumu '%s' — sıfırlama atlandı.",
            record.id, record.status,
        )
        return record

    detail: dict = {"trigger": "artifact_changed"}
    if artifact_description:
        detail["artifact"] = artifact_description

    # approved/scheduled → pending_review
    await _transition_status(
        session=session,
        record=record,
        next_status=PublishStatus.PENDING_REVIEW.value,
        actor_type="system",
        actor_id=actor_id or "system",
        note="Artifact değiştiği için review gate sıfırlandı. Yeniden onay gerekli.",
        detail=detail,
    )
    # Review alanlarını temizle
    record.reviewer_id = None
    record.reviewed_at = None
    record.review_state = "pending"

    await _append_log(
        session=session,
        publish_record_id=record.id,
        event_type=PublishLogEvent.NOTE,
        actor_type="system",
        actor_id=actor_id or "system",
        detail=detail,
        note="Artifact değişikliği nedeniyle review gate yeniden açıldı.",
    )
    await session.commit()
    await session.refresh(record)
    logger.info(
        "PublishRecord %s: artifact değişikliği nedeniyle review gate sıfırlandı (artifact=%s).",
        record.id, artifact_description,
    )
    return record


# ---------------------------------------------------------------------------
# V2 — Faz 11: Connection matching for publish
# ---------------------------------------------------------------------------

async def get_connections_for_publish(
    session: AsyncSession,
    channel_profile_id: str,
    platform: Optional[str] = None,
) -> list[dict]:
    """
    Bir kanal profili için publish'e uygun platform bağlantılarını döndürür.

    Her bağlantı için can_publish flag'i hesaplanır:
      connection_status == "connected" AND token_state == "valid"

    Platform filtresi opsiyonel — belirtilirse yalnızca o platforma ait bağlantılar döner.
    """
    query = (
        select(PlatformConnection)
        .where(PlatformConnection.channel_profile_id == channel_profile_id)
    )
    if platform:
        query = query.where(PlatformConnection.platform == platform)
    query = query.order_by(PlatformConnection.is_primary.desc(), PlatformConnection.created_at.desc())

    result = await session.execute(query)
    connections = list(result.scalars().all())

    items = []
    for conn in connections:
        can_publish = (
            conn.connection_status == "connected"
            and conn.token_state == "valid"
        )
        items.append({
            "id": conn.id,
            "channel_profile_id": conn.channel_profile_id,
            "platform": conn.platform,
            "external_account_name": conn.external_account_name,
            "external_account_id": conn.external_account_id,
            "connection_status": conn.connection_status,
            "auth_state": conn.auth_state,
            "token_state": conn.token_state,
            "scope_status": conn.scope_status,
            "is_primary": conn.is_primary,
            "can_publish": can_publish,
        })
    return items


async def list_publish_records_v2(
    session: AsyncSession,
    content_project_id: Optional[str] = None,
    platform_connection_id: Optional[str] = None,
    job_id: Optional[str] = None,
    platform: Optional[str] = None,
    status: Optional[str] = None,
    content_ref_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user_context: Optional[object] = None,
) -> list[PublishRecord]:
    """
    V2 listeleme — content_project_id ve platform_connection_id filtresi ekler.

    PHASE X: user_context verildiğinde non-admin icin Job join + ownership
    filtresi uygulanir.
    """
    query = select(PublishRecord)
    if user_context is not None and not getattr(user_context, "is_admin", False):
        query = query.join(Job, PublishRecord.job_id == Job.id).where(
            Job.owner_id == user_context.user_id
        )
    if content_project_id:
        query = query.where(PublishRecord.content_project_id == content_project_id)
    if platform_connection_id:
        query = query.where(PublishRecord.platform_connection_id == platform_connection_id)
    if job_id:
        query = query.where(PublishRecord.job_id == job_id)
    if platform:
        query = query.where(PublishRecord.platform == platform)
    if status:
        query = query.where(PublishRecord.status == status)
    if content_ref_type:
        query = query.where(PublishRecord.content_ref_type == content_ref_type)
    query = query.order_by(PublishRecord.created_at.desc()).limit(limit).offset(offset)
    result = await session.execute(query)
    return list(result.scalars().all())


async def update_publish_intent(
    session: AsyncSession,
    record_id: str,
    intent_json: str,
    actor_id: Optional[str] = None,
) -> PublishRecord:
    """
    Draft durumundaki publish kaydının publish_intent_json alanını günceller.

    Yalnızca draft durumunda izin verilir.
    """
    record = await _get_record_or_404(session, record_id)

    if record.status != PublishStatus.DRAFT.value:
        raise PublishGateViolationError(
            f"PublishRecord {record.id} intent güncellenemez. "
            f"Mevcut durum: '{record.status}'. "
            f"Intent yalnızca draft durumunda güncellenebilir."
        )

    record.publish_intent_json = intent_json
    await _append_log(
        session=session,
        publish_record_id=record.id,
        event_type=PublishLogEvent.NOTE,
        actor_type="user",
        actor_id=actor_id,
        detail={"action": "intent_updated"},
        note="Publish intent güncellendi (draft)",
    )
    await session.commit()
    await session.refresh(record)
    logger.info("PublishRecord %s: publish_intent güncellendi (draft).", record.id)
    return record
