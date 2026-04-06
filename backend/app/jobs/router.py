"""
Job Engine API router (M2-C6 güncelleme).

Endpointler:
  GET  /api/v1/jobs                    — iş listesi (opsiyonel filtre)
  GET  /api/v1/jobs/{job_id}           — tek iş + adımları
  POST /api/v1/jobs                    — yeni iş yarat + pipeline başlat
  GET  /api/v1/jobs/{job_id}/artifacts — workspace artifact listesi

Sorumlulukları:
  - HTTP request/response yönetimi
  - Request payload'ı doğrulama (Pydantic)
  - service ve dispatcher çağrısı

Bu dosyada YOKTUR:
  - İş mantığı (service.py)
  - Pipeline orchestration (dispatcher.py)
  - Adım başlatma (step_initializer.py)
"""

import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.visibility.dependencies import require_visible
from app.jobs import service
from app.jobs.schemas import JobCreate, JobCreateRequest, JobResponse, JobStepResponse
from app.jobs.timing import enrich_job_eta
from app.jobs.step_initializer import initialize_job_steps
from app.jobs.exceptions import InvalidTransitionError, JobNotFoundError, StepNotFoundError
from app.modules.exceptions import ModuleNotFoundError, InputValidationError
from app.modules.input_normalizer import InputNormalizer
from app.modules.registry import module_registry
from app.jobs import workspace as ws
from app.audit.service import write_audit_log
from app.settings.settings_resolver import resolve as resolve_setting

router = APIRouter(prefix="/jobs", tags=["jobs"], dependencies=[Depends(require_visible("panel:jobs"))])


async def _build_job_response(db: AsyncSession, job, steps=None) -> JobResponse:
    """Build a JobResponse from ORM objects, enriched with historical ETA."""
    if steps is None:
        steps = await service.get_job_steps(db, job.id)
    job_data = JobResponse.model_validate(job)
    job_data.steps = [JobStepResponse.model_validate(s) for s in steps]
    await enrich_job_eta(db, job_data)
    return job_data

# ---------------------------------------------------------------------------
# Skip'e izin verilen step key'leri.
# Sadece pipeline bütünlüğünü bozmayacak step'ler burada listelenir.
# Downstream guard: composition/render gibi step'ler skip edildiğinde
# sonraki step'ler çalışmaz çünkü job zaten pipeline'da değildir.
# ---------------------------------------------------------------------------
_SKIPPABLE_STEPS = frozenset({
    "metadata",      # Metadata opsiyonel — script varsa video üretilebilir
    "thumbnail",     # Thumbnail olmadan da video yayınlanabilir
    "subtitles",     # Altyazı opsiyonel
})


@router.get("", response_model=list[JobResponse])
async def list_jobs(
    status: Optional[str] = Query(None),
    module_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="module_type veya id üzerinde arama (case-insensitive)"),
    include_test_data: bool = Query(False, description="Test/demo kayıtlarını dahil et (varsayılan: False)"),
    db: AsyncSession = Depends(get_db),
):
    """İş listesini döndürür. status, module_type, search ve include_test_data ile filtrelenebilir."""
    jobs = await service.list_jobs(db, status=status, module_type=module_type, search=search, include_test_data=include_test_data)
    result = []
    for job in jobs:
        job_data = await _build_job_response(db, job)
        result.append(job_data)
    return result


@router.get("/{job_id}/artifacts")
async def get_job_artifacts(job_id: str, db: AsyncSession = Depends(get_db)):
    """
    Belirtilen iş için workspace/artifacts/ dizinindeki dosyaları listeler.

    Dönen yapı:
        {
            "job_id": "...",
            "artifacts": [
                {"name": "script.json", "path": "artifacts/script.json", "type": "json"},
                ...
            ]
        }
    """
    job = await service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="İş bulunamadı")

    artifacts_dir: Path = ws.get_workspace_path(job_id) / "artifacts"
    artifacts = []

    if artifacts_dir.exists():
        for file_path in sorted(artifacts_dir.iterdir()):
            if file_path.is_file():
                suffix = file_path.suffix.lstrip(".") or "bin"
                artifacts.append({
                    "name": file_path.name,
                    "path": f"artifacts/{file_path.name}",
                    "type": suffix,
                })

    return {"job_id": job_id, "artifacts": artifacts}


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Belirtilen işi adımlarıyla birlikte döndürür."""
    job = await service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="İş bulunamadı")
    return await _build_job_response(db, job)


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(
    payload: JobCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Yeni bir iş yarat, adımları başlat ve pipeline'ı tetikle.

    İşlem sırası:
      1. InputNormalizer ile modül varlığını ve zorunlu alanları doğrula.
      2. Normalize edilmiş input'u JSON'a serileştir.
      3. JobCreate ile DB'ye job kaydet.
      4. initialize_job_steps ile adımları ve workspace'i hazırla.
      5. JobDispatcher aracılığıyla pipeline'ı arka planda başlat.
      6. Job + adımlarla birlikte 201 dön.

    Hatalar:
      - 422: Geçersiz dil kodu (Pydantic doğrulaması)
      - 422: Modül bulunamadı veya zorunlu alan eksik
    """
    # Modül etkinlik kontrolü — devre dışı modüller için yeni iş başlatılamaz
    enabled_key = f"module.{payload.module_id}.enabled"
    module_enabled = await resolve_setting(enabled_key, db)
    if module_enabled is False:
        raise HTTPException(
            status_code=403,
            detail=f"Modül devre dışı: {payload.module_id!r}. Yeni üretim başlatılamaz.",
        )

    # Modül varlığı ve zorunlu alan doğrulaması
    normalizer = InputNormalizer(module_registry)
    raw_input = {"topic": payload.topic, "language": payload.language, "duration_seconds": payload.duration_seconds}

    try:
        normalized = normalizer.normalize(payload.module_id, raw_input)
    except ModuleNotFoundError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Modül bulunamadı: {exc.module_id!r}",
        )
    except InputValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Girdi doğrulama hatası [{exc.field!r}]: {exc.reason}",
        )

    # Job DB kaydı oluştur
    job_create = JobCreate(
        module_type=payload.module_id,
        input_data_json=json.dumps(normalized),
    )
    job = await service.create_job(db, job_create)

    # Adımları ve workspace'i başlat
    await initialize_job_steps(db, job.id, payload.module_id, module_registry)

    # Pipeline'ı dispatcher üzerinden arka planda başlat
    dispatcher = getattr(request.app.state, "job_dispatcher", None)
    if dispatcher is not None:
        await dispatcher.dispatch(job.id)
    else:
        # Dispatcher app.state'e bağlanmamışsa (örn. test ortamı) sessizce geç
        import logging
        logging.getLogger(__name__).warning(
            "JobDispatcher app.state'de bulunamadı, pipeline başlatılmadı. job_id=%s", job.id
        )

    # Audit: job creation
    try:
        steps = await service.get_job_steps(db, job.id)
        await write_audit_log(
            db,
            action="job.create",
            entity_type="job",
            entity_id=job.id,
            details={
                "module_type": job.module_type,
                "template_id": getattr(job, "template_id", None),
                "step_count": len(steps) if steps else 0,
            },
        )
    except Exception:
        pass  # Audit must not break job creation

    # Güncel adımları al ve response oluştur
    return await _build_job_response(db, job)


# ===========================================================================
# M16 — Operational Actions
# ===========================================================================


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """
    İşi iptal et. Yalnızca terminal olmayan durumlardan (queued, running,
    waiting, retrying) iptal edilebilir.
    """
    try:
        job = await service.transition_job_status(db, job_id, "cancelled")
    except JobNotFoundError:
        raise HTTPException(status_code=404, detail="İş bulunamadı")
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    # Çalışan step'leri de iptal et (failed olarak işaretle)
    steps = await service.get_job_steps(db, job_id)
    for step in steps:
        if step.status == "running":
            try:
                await service.transition_step_status(
                    db, job_id, step.step_key, "failed",
                    last_error="Job cancelled by user",
                )
            except InvalidTransitionError:
                pass  # step zaten terminal olmuş olabilir

    await write_audit_log(
        db, action="job.cancel", entity_type="job", entity_id=job_id,
        actor_type="admin",
        details={"previous_status": job.status, "new_status": "cancelled"},
    )
    await db.commit()

    return await _build_job_response(db, job)


@router.post("/{job_id}/retry", response_model=JobResponse)
async def retry_job(
    job_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Başarısız bir işi yeniden dene. Yalnızca 'failed' durumundaki
    işler yeniden denenebilir.

    İşlem:
      1. Job'u failed → retrying'e geçir
      2. Başarısız step'leri pending'e sıfırla (geçici olarak doğrudan)
      3. Job'u retrying → running'e geçir
      4. Pipeline'ı yeniden başlat
    """
    job = await service.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="İş bulunamadı")
    if job.status != "failed":
        raise HTTPException(
            status_code=409,
            detail=f"Yalnızca 'failed' durumundaki işler yeniden denenebilir. Mevcut durum: {job.status!r}",
        )

    # State machine'de failed → retrying geçişi yok!
    # Retry stratejisi: yeni bir job oluşturmak yerine, mevcut job'u
    # doğrudan running'e almak da mümkün değil (failed terminal).
    #
    # Çözüm: "Rerun" pattern — aynı input ile yeni job oluştur.
    # Bu CLAUDE.md'deki "Rerun/clone of a completed/failed job creates a
    # NEW Job record rather than recycling the terminal state" kuralıyla uyumlu.

    # Orijinal job'un input bilgilerini al
    job_create = JobCreate(
        module_type=job.module_type,
        owner_id=job.owner_id,
        template_id=job.template_id,
        source_context_json=job.source_context_json,
        input_data_json=job.input_data_json,
        workspace_path=None,  # Yeni workspace oluşturulacak
    )
    new_job = await service.create_job(db, job_create)

    # Adımları başlat
    await initialize_job_steps(db, new_job.id, new_job.module_type, module_registry)

    # Pipeline'ı başlat
    dispatcher = getattr(request.app.state, "job_dispatcher", None)
    if dispatcher is not None:
        await dispatcher.dispatch(new_job.id)

    await write_audit_log(
        db, action="job.retry", entity_type="job", entity_id=new_job.id,
        actor_type="admin",
        details={"original_job_id": job_id, "new_job_id": new_job.id},
    )
    await db.commit()

    return await _build_job_response(db, new_job)


@router.post("/{job_id}/steps/{step_key}/skip", response_model=JobResponse)
async def skip_step(
    job_id: str, step_key: str, db: AsyncSession = Depends(get_db),
):
    """
    Belirtilen step'i atla. Yalnızca 'pending' durumundaki ve
    _SKIPPABLE_STEPS listesindeki step'ler atlanabilir.

    Skip edilen step'in downstream akışı bozmadığından emin olunur:
    - Sadece güvenli step'lere izin verilir
    - Pipeline bütünlüğü korunur
    """
    if step_key not in _SKIPPABLE_STEPS:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Step '{step_key}' atlanamaz. "
                f"Atlanabilir step'ler: {sorted(_SKIPPABLE_STEPS)}"
            ),
        )

    job = await service.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="İş bulunamadı")

    try:
        await service.transition_step_status(db, job_id, step_key, "skipped")
    except StepNotFoundError:
        raise HTTPException(status_code=404, detail=f"Step bulunamadı: {step_key}")
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    await write_audit_log(
        db, action="job.step_skip", entity_type="job_step", entity_id=f"{job_id}/{step_key}",
        actor_type="admin",
        details={"job_id": job_id, "step_key": step_key},
    )
    await db.commit()

    job = await service.get_job(db, job_id)
    return await _build_job_response(db, job)


@router.get("/{job_id}/allowed-actions")
async def get_allowed_actions(job_id: str, db: AsyncSession = Depends(get_db)):
    """
    Mevcut duruma göre izin verilen aksiyonları döndürür.
    UI tarafında butonların enabled/disabled durumunu belirlemek için kullanılır.
    """
    job = await service.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="İş bulunamadı")

    actions = {
        "can_cancel": job.status in ("queued", "running", "waiting", "retrying"),
        "can_retry": job.status == "failed",
        "skippable_steps": [],
    }

    if job.status in ("queued", "running", "waiting"):
        steps = await service.get_job_steps(db, job_id)
        actions["skippable_steps"] = [
            s.step_key for s in steps
            if s.status == "pending" and s.step_key in _SKIPPABLE_STEPS
        ]

    return actions


# ===========================================================================
# M31 — Test data management endpoints
# ===========================================================================


class _MarkTestDataRequest(BaseModel):
    job_ids: list[str]


class _BulkArchiveTestDataRequest(BaseModel):
    older_than_days: int = 7
    module_type: Optional[str] = None


@router.post("/mark-test-data")
async def mark_jobs_as_test_data(
    payload: _MarkTestDataRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verilen job ID'lerini is_test_data=True olarak işaretle.

    Bu kayıtlar silinmez — varsayılan is listesinden gizlenir.
    Admin panelinden include_test_data=true ile görüntülenebilir.
    """
    marked_count = await service.mark_jobs_as_test_data(db, payload.job_ids)
    return {"marked_count": marked_count}


@router.post("/bulk-archive-test-data")
async def bulk_archive_test_jobs(
    payload: _BulkArchiveTestDataRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Test/demo niteliğindeki eski job kayıtlarını toplu olarak arşivle.

    Arşivleme kriteri (hepsi aynı anda sağlanmalı):
      - status: completed / failed / cancelled
      - created_at: older_than_days gün öncesinden eski
      - workspace_path: boş veya None (kalıcı artifact yok)
      - is_test_data: henüz False (tekrar işaretleme engeli)
      - module_type eşleşmesi (opsiyonel)

    Hiçbir kayıt silinmez; yalnızca is_test_data=True yapılır.
    """
    archived_count = await service.bulk_archive_test_jobs(
        db,
        older_than_days=payload.older_than_days,
        module_type=payload.module_type,
    )
    return {"archived_count": archived_count}
