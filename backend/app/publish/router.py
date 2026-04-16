"""
Publish Center Router — M7-C1.

HTTP katmanı: iş mantığı yok, yalnızca servis çağrıları.
Hata dönüşümleri burada; iş mantığı service.py'de.

Endpoint'ler:
  POST   /publish/                          : Yeni publish kaydı oluştur
  GET    /publish/                          : Kayıtları listele (filtreli)
  GET    /publish/{record_id}               : Kayıt detayı
  GET    /publish/{record_id}/logs          : Denetim izi
  POST   /publish/{record_id}/submit        : Review'a gönder
  POST   /publish/{record_id}/review        : Operatör review kararı
  POST   /publish/{record_id}/schedule      : Zamanlama ayarla
  POST   /publish/{record_id}/trigger       : Publish başlat
  POST   /publish/{record_id}/cancel        : İptal
  POST   /publish/{record_id}/reset-to-draft: Draft'a döndür
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.db.session import AsyncSessionLocal, get_db
from app.audit.service import write_audit_log
from app.visibility.dependencies import require_visible, get_active_user_id
from app.auth.ownership import UserContext, get_current_user_context
from app.publish import bulk_service, service
from app.publish.ownership import (
    apply_publish_user_scope,
    ensure_channel_profile_ownership,
    ensure_content_project_ownership,
    ensure_job_ownership,
    ensure_platform_connection_ownership,
    ensure_publish_record_ownership,
    filter_record_ids_by_ownership,
)
from app.publish.exceptions import (
    PublishRecordNotFoundError,
    InvalidPublishTransitionError,
    PublishGateViolationError,
    PublishAlreadyTerminalError,
    ReviewGateViolationError,
)
from app.publish.scheduler import (
    SCHEDULER_STALE_THRESHOLD_SECONDS,
    snapshot_scheduler_status,
)
from app.publish.token_preflight import (
    get_connection_token_status,
    suggested_action_for_severity,
)
from app.publish.schemas import (
    BulkActionRequest,
    BulkActionResponse,
    BulkRejectRequest,
    PublishRecordCreate,
    PublishRecordRead,
    PublishRecordSummary,
    PublishLogRead,
    ReviewActionRequest,
    ScheduleRequest,
    SchedulerHealthResponse,
    TokenStatusResponse,
    PublishTriggerRequest,
    CancelRequest,
    TransitionRequest,
    RetryPublishRequest,
    ArtifactChangedRequest,
    PublishRecordPatchPayload,
    PublishFromJobRequest,
    ConnectionForPublish,
    PublishIntentData,
)

router = APIRouter(prefix="/publish", tags=["publish"], dependencies=[Depends(require_visible("panel:publish"))])


def _handle_not_found(exc: PublishRecordNotFoundError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _handle_invalid_transition(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


def _handle_gate_violation(exc: Exception) -> HTTPException:
    return HTTPException(status_code=422, detail=str(exc))


# ---------------------------------------------------------------------------
# CRUD endpoint'leri
# ---------------------------------------------------------------------------

@router.post("/", response_model=PublishRecordRead, status_code=status.HTTP_201_CREATED)
async def create_publish_record(
    body: PublishRecordCreate,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """Yeni publish kaydı oluşturur (draft durumunda başlar).

    PHASE X: non-admin icin body.job_id sahibi ctx.user_id olmali.
    """
    if body.job_id:
        await ensure_job_ownership(session, body.job_id, ctx)
    record = await service.create_publish_record(session=session, data=body)
    await write_audit_log(session, action="publish.create", entity_type="publish_record", entity_id=str(record.id))
    return record


@router.get("/", response_model=list[PublishRecordSummary])
async def list_publish_records(
    job_id: Optional[str] = Query(default=None),
    platform: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    content_ref_type: Optional[str] = Query(default=None),
    error_category: Optional[str] = Query(
        default=None,
        description="Gate 4: filter failed records by last_error_category.",
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """Filtrelenmiş publish kayıtlarını döndürür.

    PHASE X: non-admin icin Job.owner_id esitligi ile scope'lanir.
    """
    # PHASE X: non-admin ve job_id verilmisse o job'un da ayni user'a ait
    # oldugunu on-check et (erken 403 verir; aksi halde list bos doner ve
    # UX 'veri yok' gibi yanlis hisseder).
    if job_id and not ctx.is_admin:
        await ensure_job_ownership(session, job_id, ctx)
    records = await service.list_publish_records(
        session=session,
        job_id=job_id,
        platform=platform,
        status=status,
        content_ref_type=content_ref_type,
        error_category=error_category,
        limit=limit,
        offset=offset,
        user_context=ctx,
    )
    return records


@router.get("/{record_id}", response_model=PublishRecordRead)
async def get_publish_record(
    record_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """Publish kaydı detayını döndürür."""
    try:
        record = await service.get_publish_record(session=session, record_id=record_id)
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    await ensure_publish_record_ownership(session, record, ctx)
    return record


@router.get("/{record_id}/logs", response_model=list[PublishLogRead])
async def get_publish_logs(
    record_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """Publish kaydına ait denetim izi log satırlarını döndürür."""
    try:
        record = await service.get_publish_record(session=session, record_id=record_id)
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    await ensure_publish_record_ownership(session, record, ctx)
    logs = await service.get_publish_logs(
        session=session,
        publish_record_id=record_id,
        limit=limit,
        offset=offset,
    )
    return logs


# ---------------------------------------------------------------------------
# Durum geçiş endpoint'leri
# ---------------------------------------------------------------------------

@router.post("/{record_id}/submit", response_model=PublishRecordRead)
async def submit_for_review(
    record_id: str,
    body: TransitionRequest = TransitionRequest(next_status="pending_review"),
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """Draft kaydını review'a gönderir."""
    try:
        existing = await service.get_publish_record(session=session, record_id=record_id)
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    await ensure_publish_record_ownership(session, existing, ctx)
    try:
        result = await service.submit_for_review(
            session=session,
            record_id=record_id,
            actor_id=body.actor_id,
            note=body.note,
        )
        await write_audit_log(session, action="publish.submit", entity_type="publish_record", entity_id=record_id)
        return result
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    except (InvalidPublishTransitionError, PublishAlreadyTerminalError) as exc:
        raise _handle_invalid_transition(exc)


@router.post("/{record_id}/review", response_model=PublishRecordRead)
async def review_action(
    record_id: str,
    body: ReviewActionRequest,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """
    Operatör review kararı: 'approve' veya 'reject'.

    Review gate / publish gate izolasyon:
      Bu endpoint yalnızca review kararı verir.
      Yayınlama başlatmaz — bunun için /trigger kullanılır.

    Reddetme kuralı:
      action == 'reject' ise rejection_reason zorunludur.
    """
    if body.decision == "reject" and not body.rejection_reason:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Reddetme kararı için rejection_reason zorunludur.",
        )
    try:
        existing = await service.get_publish_record(session=session, record_id=record_id)
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    await ensure_publish_record_ownership(session, existing, ctx)
    # rejection_reason'ı note ile birleştir (log'a düşmesi için)
    effective_note = body.note
    if body.decision == "reject" and body.rejection_reason:
        effective_note = body.rejection_reason if not body.note else f"{body.rejection_reason} | {body.note}"
    try:
        result = await service.review_action(
            session=session,
            record_id=record_id,
            decision=body.decision,
            reviewer_id=body.reviewer_id,
            note=effective_note,
            rejection_reason=body.rejection_reason,
        )
        await write_audit_log(session, action="publish.review", entity_type="publish_record", entity_id=record_id, details={"decision": body.decision})
        return result
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    except ReviewGateViolationError as exc:
        raise _handle_gate_violation(exc)
    except (InvalidPublishTransitionError, PublishAlreadyTerminalError, ValueError) as exc:
        raise _handle_invalid_transition(exc)


@router.post("/{record_id}/schedule", response_model=PublishRecordRead)
async def schedule_publish(
    record_id: str,
    body: ScheduleRequest,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """Approved kaydı için publish zamanlaması ayarlar."""
    try:
        existing = await service.get_publish_record(session=session, record_id=record_id)
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    await ensure_publish_record_ownership(session, existing, ctx)
    try:
        result = await service.schedule_publish(
            session=session,
            record_id=record_id,
            scheduled_at=body.scheduled_at,
            note=body.note,
        )
        await write_audit_log(session, action="publish.schedule", entity_type="publish_record", entity_id=record_id)
        return result
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    except (InvalidPublishTransitionError, PublishAlreadyTerminalError) as exc:
        raise _handle_invalid_transition(exc)


@router.post("/{record_id}/trigger", response_model=PublishRecordRead)
async def trigger_publish(
    record_id: str,
    body: PublishTriggerRequest,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """
    Publish işlemini başlatır (approved/scheduled/failed → publishing).

    Publish gate kontrolü yapılır:
      draft veya pending_review durumundan bu endpoint çağrılamaz.
      422 döner.
    PHASE X: actor_id body'den gelmiyorsa kimlik dogrulanmis user'dan gelir.
    """
    try:
        existing = await service.get_publish_record(session=session, record_id=record_id)
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    await ensure_publish_record_ownership(session, existing, ctx)
    effective_actor_id = body.actor_id or ctx.user_id
    try:
        result = await service.trigger_publish(
            session=session,
            record_id=record_id,
            actor_id=effective_actor_id,
            note=body.note,
        )
        await write_audit_log(session, action="publish.trigger", entity_type="publish_record", entity_id=record_id)
        return result
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    except PublishGateViolationError as exc:
        raise _handle_gate_violation(exc)
    except (InvalidPublishTransitionError, PublishAlreadyTerminalError) as exc:
        raise _handle_invalid_transition(exc)


@router.post("/{record_id}/cancel", response_model=PublishRecordRead)
async def cancel_publish(
    record_id: str,
    body: CancelRequest,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """Publish kaydını iptal eder."""
    try:
        existing = await service.get_publish_record(session=session, record_id=record_id)
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    await ensure_publish_record_ownership(session, existing, ctx)
    try:
        result = await service.cancel_publish(
            session=session,
            record_id=record_id,
            actor_id=body.actor_id,
            note=body.note,
        )
        await write_audit_log(session, action="publish.cancel", entity_type="publish_record", entity_id=record_id)
        return result
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    except (InvalidPublishTransitionError, PublishAlreadyTerminalError) as exc:
        raise _handle_invalid_transition(exc)


@router.post("/{record_id}/reset-to-draft", response_model=PublishRecordRead)
async def reset_to_draft(
    record_id: str,
    body: TransitionRequest = TransitionRequest(next_status="draft"),
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """Review reddedilen kaydı düzeltme için draft'a döndürür."""
    try:
        existing = await service.get_publish_record(session=session, record_id=record_id)
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    await ensure_publish_record_ownership(session, existing, ctx)
    try:
        result = await service.reset_to_draft(
            session=session,
            record_id=record_id,
            actor_id=body.actor_id,
            note=body.note,
        )
        await write_audit_log(session, action="publish.reset_to_draft", entity_type="publish_record", entity_id=record_id)
        return result
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    except (InvalidPublishTransitionError, PublishAlreadyTerminalError) as exc:
        raise _handle_invalid_transition(exc)


@router.post("/{record_id}/retry", response_model=PublishRecordRead)
async def retry_publish(
    record_id: str,
    body: RetryPublishRequest,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """
    Başarısız publish kaydı için yeniden deneme başlatır (failed → publishing).

    Kısmi başarısızlık semantiği:
      platform_video_id doluysa (upload tamamlandı, activate kırıldı)
      upload tekrar çalışmaz — executor yalnızca activate adımını yürütür.
    Publish gate kuralı: yalnızca 'failed' durumundaki kayıt retry edilebilir.
    """
    try:
        existing = await service.get_publish_record(session=session, record_id=record_id)
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    await ensure_publish_record_ownership(session, existing, ctx)
    try:
        result = await service.retry_publish(
            session=session,
            record_id=record_id,
            actor_id=body.actor_id,
            note=body.note,
        )
        await write_audit_log(session, action="publish.retry", entity_type="publish_record", entity_id=record_id)
        return result
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    except PublishGateViolationError as exc:
        raise _handle_gate_violation(exc)
    except (InvalidPublishTransitionError, PublishAlreadyTerminalError) as exc:
        raise _handle_invalid_transition(exc)


@router.post("/from-job/{job_id}", response_model=PublishRecordRead, status_code=status.HTTP_201_CREATED)
async def create_publish_record_from_job(
    job_id: str,
    body: PublishFromJobRequest,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """
    Job'dan publish kaydı oluşturur.

    Job'un metadata artifact'ından title/description/tags alanlarını okumaya
    çalışır; bulunamazsa boş payload ile draft kaydı oluşturur.
    PHASE X: non-admin yalnizca kendi job'undan publish kaydi acabilir; body
    icindeki content_project_id / platform_connection_id de ownership gecer.
    """
    await ensure_job_ownership(session, job_id, ctx)
    if body.content_project_id:
        await ensure_content_project_ownership(session, body.content_project_id, ctx)
    if body.platform_connection_id:
        await ensure_platform_connection_ownership(session, body.platform_connection_id, ctx)
    try:
        record = await service.create_publish_record_from_job(
            session=session,
            job_id=job_id,
            platform=body.platform,
            content_ref_type=body.content_ref_type,
            content_ref_id=body.content_ref_id,
            content_project_id=body.content_project_id,
            platform_connection_id=body.platform_connection_id,
        )
        await write_audit_log(session, action="publish.create_from_job", entity_type="publish_record", entity_id=str(record.id), details={"job_id": job_id})
        return record
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)


@router.patch("/{record_id}", response_model=PublishRecordRead)
async def patch_publish_payload(
    record_id: str,
    body: PublishRecordPatchPayload,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """
    Draft durumundaki publish kaydının payload_json'ını günceller.

    Yalnızca draft durumunda izin verilir; diğer durumlarda 422 döner.
    """
    try:
        existing = await service.get_publish_record(session=session, record_id=record_id)
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    await ensure_publish_record_ownership(session, existing, ctx)
    try:
        result = await service.patch_publish_payload(
            session=session,
            record_id=record_id,
            payload_json=body.payload_json,
        )
        await write_audit_log(session, action="publish.patch_payload", entity_type="publish_record", entity_id=record_id)
        return result
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    except PublishGateViolationError as exc:
        raise _handle_gate_violation(exc)


# ---------------------------------------------------------------------------
# V2 — Faz 11: Connection matching + intent + project-based listing
# ---------------------------------------------------------------------------

@router.get("/connections-for-channel/{channel_profile_id}", response_model=list[ConnectionForPublish])
async def get_connections_for_channel(
    channel_profile_id: str,
    platform: Optional[str] = Query(default=None),
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """
    Bir kanal profili için publish'e uygun platform bağlantılarını döndürür.
    Her bağlantıda can_publish flag'i var.
    PHASE X: channel_profile_id sahibi ctx.user_id olmali (veya admin).
    """
    await ensure_channel_profile_ownership(session, channel_profile_id, ctx)
    return await service.get_connections_for_publish(
        session=session,
        channel_profile_id=channel_profile_id,
        platform=platform,
    )


@router.get("/by-project/{content_project_id}", response_model=list[PublishRecordSummary])
async def list_publish_records_by_project(
    content_project_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """Content project'e ait publish kayıtlarını döndürür.

    PHASE X: proje sahibi olmayan non-admin'lere 403.
    """
    await ensure_content_project_ownership(session, content_project_id, ctx)
    records = await service.list_publish_records_v2(
        session=session,
        content_project_id=content_project_id,
        limit=limit,
        offset=offset,
        user_context=ctx,
    )
    return records


@router.patch("/{record_id}/intent", response_model=PublishRecordRead)
async def update_publish_intent(
    record_id: str,
    body: PublishIntentData,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """
    Draft durumundaki publish kaydının publish_intent_json alanını günceller.
    """
    import json
    try:
        existing = await service.get_publish_record(session=session, record_id=record_id)
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    await ensure_publish_record_ownership(session, existing, ctx)
    intent_json = json.dumps(body.model_dump(exclude_none=True), ensure_ascii=False)
    try:
        result = await service.update_publish_intent(
            session=session,
            record_id=record_id,
            intent_json=intent_json,
        )
        await write_audit_log(session, action="publish.update_intent", entity_type="publish_record", entity_id=record_id)
        return result
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    except PublishGateViolationError as exc:
        raise _handle_gate_violation(exc)


@router.post("/{record_id}/reset-review", response_model=PublishRecordRead)
async def reset_review_for_artifact_change(
    record_id: str,
    body: ArtifactChangedRequest,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """
    Artifact değişikliği nedeniyle review gate'i sıfırlar.

    Approved veya scheduled durumundaki kayıtlarda herhangi bir artifact
    yeniden üretildiğinde çağrılır. Kayıt pending_review'a döner ve
    operatörün yeniden onay vermesi gerekir.
    Diğer durumlarda (draft, publishing, failed vb.) işlem yapılmaz.
    """
    try:
        existing = await service.get_publish_record(session=session, record_id=record_id)
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    await ensure_publish_record_ownership(session, existing, ctx)
    try:
        result = await service.reset_review_for_artifact_change(
            session=session,
            record_id=record_id,
            artifact_description=body.artifact_description,
            actor_id=body.actor_id,
        )
        await write_audit_log(session, action="publish.reset_review", entity_type="publish_record", entity_id=record_id)
        return result
    except PublishRecordNotFoundError as exc:
        raise _handle_not_found(exc)
    except (InvalidPublishTransitionError, PublishAlreadyTerminalError) as exc:
        raise _handle_invalid_transition(exc)


# ---------------------------------------------------------------------------
# Gate 4 (Publish Closure) — Bulk action endpoints
# ---------------------------------------------------------------------------
#
# Each endpoint accepts a small batch (1..100) of record_ids and runs the
# corresponding single-record service inside its own transaction.
# Per-record results + summary are returned. The state machine is NOT
# bypassed.
#
# bulk/reject requires `rejection_reason` (router-enforced + service-enforced).

def _validate_bulk_request(record_ids: list[str]) -> None:
    if not record_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="record_ids boş olamaz.",
        )
    if len(record_ids) > bulk_service.MAX_BULK_RECORDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"Bulk istek limiti aşıldı: {len(record_ids)} > "
                f"{bulk_service.MAX_BULK_RECORDS}."
            ),
        )


async def _resolve_bulk_record_ids(
    ctx: UserContext, record_ids: list[str]
) -> list[str]:
    """PHASE X: non-admin icin yalniz kendi sahip oldugu record_ids'leri gecir.

    Diger ID'ler bulk_service'e verilmez; bulk_service kendi response'unda
    `invalid/denied` olarak isaretler — ama bu katman zaten pre-filter
    gorevini yapiyor (fail-fast vs silently-skip tercihi: silently skip
    yerine burada 403 firlatma da olabilir; simdilik skip yaklasimi
    bulk semantigine uyumlu).
    """
    async with AsyncSessionLocal() as session:
        return await filter_record_ids_by_ownership(session, record_ids, ctx)


@router.post("/bulk/approve", response_model=BulkActionResponse)
async def bulk_approve(
    body: BulkActionRequest,
    ctx: UserContext = Depends(get_current_user_context),
):
    """Bulk approve — pending_review kayıtları toplu onaylar.

    PHASE X: non-admin icin yalniz kendi kayitlari islenir.
    """
    _validate_bulk_request(body.record_ids)
    effective_ids = await _resolve_bulk_record_ids(ctx, body.record_ids)
    if not effective_ids:
        raise HTTPException(status_code=403, detail="Bu kayitlar size ait degil")
    return await bulk_service.bulk_approve(
        session_factory=AsyncSessionLocal,
        record_ids=effective_ids,
        reviewer_id=body.actor_id or ctx.user_id,
        note=body.note,
    )


@router.post("/bulk/reject", response_model=BulkActionResponse)
async def bulk_reject(
    body: BulkRejectRequest,
    ctx: UserContext = Depends(get_current_user_context),
):
    """Bulk reject — pending_review kayıtları toplu reddeder. reason zorunlu."""
    _validate_bulk_request(body.record_ids)
    if not body.rejection_reason or not body.rejection_reason.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Bulk reddetme için rejection_reason zorunludur.",
        )
    effective_ids = await _resolve_bulk_record_ids(ctx, body.record_ids)
    if not effective_ids:
        raise HTTPException(status_code=403, detail="Bu kayitlar size ait degil")
    return await bulk_service.bulk_reject(
        session_factory=AsyncSessionLocal,
        record_ids=effective_ids,
        reviewer_id=body.actor_id or ctx.user_id,
        rejection_reason=body.rejection_reason,
        note=body.note,
    )


@router.post("/bulk/cancel", response_model=BulkActionResponse)
async def bulk_cancel(
    body: BulkActionRequest,
    ctx: UserContext = Depends(get_current_user_context),
):
    """Bulk cancel — non-terminal kayıtları toplu iptal eder."""
    _validate_bulk_request(body.record_ids)
    effective_ids = await _resolve_bulk_record_ids(ctx, body.record_ids)
    if not effective_ids:
        raise HTTPException(status_code=403, detail="Bu kayitlar size ait degil")
    return await bulk_service.bulk_cancel(
        session_factory=AsyncSessionLocal,
        record_ids=effective_ids,
        actor_id=body.actor_id or ctx.user_id,
        note=body.note,
    )


@router.post("/bulk/retry", response_model=BulkActionResponse)
async def bulk_retry(
    body: BulkActionRequest,
    ctx: UserContext = Depends(get_current_user_context),
):
    """Bulk retry — yalnızca failed kayıtlar; diğerleri publish_gate ile reddedilir."""
    _validate_bulk_request(body.record_ids)
    effective_ids = await _resolve_bulk_record_ids(ctx, body.record_ids)
    if not effective_ids:
        raise HTTPException(status_code=403, detail="Bu kayitlar size ait degil")
    return await bulk_service.bulk_retry(
        session_factory=AsyncSessionLocal,
        record_ids=effective_ids,
        actor_id=body.actor_id or ctx.user_id,
        note=body.note,
    )


# ---------------------------------------------------------------------------
# Gate 4 (Publish Closure) — Scheduler health endpoint
# ---------------------------------------------------------------------------

@router.get("/scheduler/status", response_model=SchedulerHealthResponse)
async def scheduler_status(request: Request):
    """
    Publish scheduler arka plan görevi sağlık durumu.

    state:
      'unknown' : Henüz hiç tick atılmadı (uygulama yeni başlatıldı).
      'healthy' : last_tick_at son `stale_threshold_seconds` içinde.
      'stale'   : last_tick_at threshold'u geçti — scheduler donmuş olabilir.
    """
    raw = getattr(request.app.state, "publish_scheduler_status", None)
    snapshot = snapshot_scheduler_status(raw, now=datetime.now(timezone.utc))
    return SchedulerHealthResponse(
        state=snapshot["state"],
        started_at=snapshot.get("started_at"),
        last_tick_at=snapshot.get("last_tick_at"),
        last_due_count=snapshot.get("last_due_count", 0),
        last_triggered_count=snapshot.get("last_triggered_count", 0),
        last_skipped_count=snapshot.get("last_skipped_count", 0),
        total_ticks=snapshot.get("total_ticks", 0),
        total_triggered=snapshot.get("total_triggered", 0),
        total_skipped=snapshot.get("total_skipped", 0),
        consecutive_errors=snapshot.get("consecutive_errors", 0),
        last_error=snapshot.get("last_error"),
        interval_seconds=snapshot.get("interval_seconds", 0.0),
        stale_threshold_seconds=SCHEDULER_STALE_THRESHOLD_SECONDS,
    )


# ---------------------------------------------------------------------------
# Gate 4 (Publish Closure) — Token expiry pre-flight visibility (Z-4)
# ---------------------------------------------------------------------------

@router.get(
    "/connections/{connection_id}/token-status",
    response_model=TokenStatusResponse,
)
async def connection_token_status(
    connection_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db=Depends(get_db),
):
    """
    Bir PlatformConnection için token sağlık durumu.

    NON-AGGRESSIVE: platform API'ye gitmez, sadece DB'deki token_expiry +
    requires_reauth alanlarını okur. UI badge ve scheduler aynı eşikleri
    kullanır (warn=7g, critical=24s).
    PHASE X: connection sahibi ctx.user_id olmali (veya admin).
    """
    await ensure_platform_connection_ownership(db, connection_id, ctx)
    status_obj = await get_connection_token_status(db, connection_id)
    return TokenStatusResponse(
        connection_id=connection_id,
        severity=status_obj.severity,
        seconds_remaining=status_obj.seconds_remaining,
        expires_at=status_obj.expires_at,
        requires_reauth=status_obj.requires_reauth,
        has_refresh_token=status_obj.has_refresh_token,
        is_blocking=status_obj.is_blocking,
        suggested_action=suggested_action_for_severity(status_obj.severity),
    )
