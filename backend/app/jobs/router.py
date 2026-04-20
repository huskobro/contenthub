"""
Job Engine API router (M2-C6 güncelleme).

Endpointler:
  GET  /api/v1/jobs                    — iş listesi (opsiyonel filtre)
  GET  /api/v1/jobs/{job_id}           — tek iş + adımları
  POST /api/v1/jobs                    — yeni iş yarat + pipeline başlat
  GET  /api/v1/jobs/{job_id}/artifacts — workspace artifact listesi
  GET  /api/v1/jobs/{job_id}/artifacts/{file_path} — artifact dosyası serve

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
import logging
import mimetypes
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.dependencies import require_admin
from app.visibility.dependencies import require_visible, get_active_user_id
from app.auth.ownership import (
    UserContext,
    ensure_owner_or_admin,
    get_current_user_context,
)
from app.db.models import ChannelProfile, ContentProject, User
from app.jobs import service
from app.jobs.schemas import JobCreate, JobCreateRequest, JobResponse, JobStepResponse
from app.jobs.timing import enrich_job_eta
from app.jobs.step_initializer import initialize_job_steps
from app.jobs.exceptions import InvalidTransitionError, JobNotFoundError, StepNotFoundError, ModuleDisabledError
from app.modules.exceptions import ModuleNotFoundError, InputValidationError
from app.modules.input_normalizer import InputNormalizer
from app.modules.registry import module_registry
from app.jobs import workspace as ws
from app.audit.service import write_audit_log
from app.settings.settings_resolver import KNOWN_SETTINGS, resolve

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"], dependencies=[Depends(require_visible("panel:jobs"))])


async def _build_job_response(db: AsyncSession, job, steps=None) -> JobResponse:
    """Build a JobResponse from ORM objects, enriched with historical ETA."""
    if steps is None:
        steps = await service.get_job_steps(db, job.id)
    job_data = JobResponse.model_validate(job)
    job_data.steps = [JobStepResponse.model_validate(s) for s in steps]
    await enrich_job_eta(db, job_data)
    return job_data


def _enforce_job_ownership(ctx: UserContext, job) -> None:
    """PHASE X: job ownership kapisi. owner_id NULL ise sadece admin gecebilir."""
    if ctx.is_admin:
        return
    if job.owner_id is None:
        # Orphan / legacy job — non-admin erismesin
        raise HTTPException(
            status_code=403,
            detail="Bu is orphan (owner'sız); yalnizca admin erisimine acik",
        )
    if str(job.owner_id) != ctx.user_id:
        raise HTTPException(status_code=403, detail="Bu ise erisim yetkiniz yok")

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
    owner_id: Optional[str] = Query(None, description="Admin only override — başka kullanıcı için"),
    content_project_id: Optional[str] = Query(None, description="Belirli bir projeye ait job'lar"),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """İş listesini döndürür. Non-admin: daima ctx.user_id; admin: owner_id override serbest."""
    # PHASE X ownership: non-admin her zaman kendi verisi
    effective_owner_id = owner_id if ctx.is_admin else ctx.user_id
    jobs = await service.list_jobs(
        db,
        status=status,
        module_type=module_type,
        search=search,
        include_test_data=include_test_data,
        owner_id=effective_owner_id,
        content_project_id=content_project_id,
    )
    result = []
    for job in jobs:
        job_data = await _build_job_response(db, job)
        result.append(job_data)
    return result


@router.get("/{job_id}/artifacts")
async def get_job_artifacts(
    job_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
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
    _enforce_job_ownership(ctx, job)

    # M42: job.workspace_path varsa onu kullan (user-scoped olabilir), yoksa global fallback
    if getattr(job, "workspace_path", None) and str(job.workspace_path).strip():
        artifacts_dir = Path(str(job.workspace_path).strip()) / "artifacts"
    else:
        artifacts_dir = ws.get_workspace_path(job_id) / "artifacts"
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


# ---------------------------------------------------------------------------
# Artifact file serving — media type mapping
# ---------------------------------------------------------------------------
_MEDIA_TYPES: dict[str, str] = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".json": "application/json",
    ".srt": "text/plain",
    ".txt": "text/plain",
}


def _resolve_media_type(file_path: Path) -> str:
    """Return an appropriate media type for the given file path."""
    suffix = file_path.suffix.lower()
    if suffix in _MEDIA_TYPES:
        return _MEDIA_TYPES[suffix]
    guessed, _ = mimetypes.guess_type(str(file_path))
    return guessed or "application/octet-stream"


@router.get("/{job_id}/artifacts/{file_path:path}")
async def serve_job_artifact(
    job_id: str,
    file_path: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Serve a job artifact file (video, image, audio, json, etc.).

    Path resolution follows the same logic as get_job_artifacts:
    if the job has an explicit workspace_path, use it; otherwise fall
    back to the global workspace root.

    Security: the resolved absolute path must reside inside the job's
    workspace directory to prevent path-traversal attacks.
    """
    job = await service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="İş bulunamadı")
    _enforce_job_ownership(ctx, job)

    # Resolve workspace root for this job (user-scoped or global)
    if getattr(job, "workspace_path", None) and str(job.workspace_path).strip():
        workspace_dir = Path(str(job.workspace_path).strip())
    else:
        workspace_dir = ws.get_workspace_path(job_id)

    artifacts_dir = workspace_dir / "artifacts"
    target = (artifacts_dir / file_path).resolve()

    # Path-traversal guard: target must be inside the workspace directory
    try:
        target.relative_to(workspace_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")

    if not target.is_file():
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")

    return FileResponse(
        path=str(target),
        media_type=_resolve_media_type(target),
        filename=target.name,
    )


@router.get("/{job_id}/content-ref")
async def get_job_content_ref(
    job_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Bir job'a bağlı içerik kaydını (NewsBulletin veya StandardVideo) döndürür.

    Dönen yapı:
        {
            "job_id": "...",
            "module_type": "news_bulletin" | "standard_video" | null,
            "content_id": "...",       // ilgili içerik kaydının ID'si
            "content_title": "...",    // başlık (varsa)
            "content_status": "...",   // içerik durumu
            "content_url": "/admin/news-bulletins/..." // frontend linki
        }
    """
    from sqlalchemy import select as sa_select
    from app.db.models import NewsBulletin, StandardVideo

    job = await service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="İş bulunamadı")
    _enforce_job_ownership(ctx, job)

    module_type = job.module_type

    if module_type == "news_bulletin":
        result = await db.execute(
            sa_select(NewsBulletin).where(NewsBulletin.job_id == job_id).limit(1)
        )
        bulletin = result.scalar_one_or_none()
        if bulletin:
            return {
                "job_id": job_id,
                "module_type": "news_bulletin",
                "content_id": bulletin.id,
                "content_title": bulletin.title or bulletin.topic or "Haber Bülteni",
                "content_status": bulletin.status,
                "content_url": f"/admin/news-bulletins/{bulletin.id}",
            }

    elif module_type == "standard_video":
        result = await db.execute(
            sa_select(StandardVideo).where(StandardVideo.job_id == job_id).limit(1)
        )
        video = result.scalar_one_or_none()
        if video:
            return {
                "job_id": job_id,
                "module_type": "standard_video",
                "content_id": video.id,
                "content_title": getattr(video, "title", None) or getattr(video, "topic", None) or "Standart Video",
                "content_status": getattr(video, "status", None),
                "content_url": f"/admin/standard-videos/{video.id}",
            }

    return {
        "job_id": job_id,
        "module_type": module_type,
        "content_id": None,
        "content_title": None,
        "content_status": None,
        "content_url": None,
    }


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Belirtilen işi adımlarıyla birlikte döndürür."""
    job = await service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="İş bulunamadı")
    _enforce_job_ownership(ctx, job)
    return await _build_job_response(db, job)


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(
    payload: JobCreateRequest,
    request: Request,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Yeni bir iş yarat, adımları başlat ve pipeline'ı tetikle.

    İşlem sırası:
      1. PHASE X ownership: content_project_id / channel_profile_id ownership
         dogrulamasi (non-admin yalniz kendi kaynagini kullanabilir).
      2. InputNormalizer ile modül varlığını ve zorunlu alanları doğrula.
      3. Normalize edilmiş input'u JSON'a serileştir.
      4. JobCreate ile DB'ye job kaydet (owner_id = ctx.user_id).
      5. initialize_job_steps ile adımları ve workspace'i hazırla.
      6. JobDispatcher aracılığıyla pipeline'ı arka planda başlat.
      7. Job + adımlarla birlikte 201 dön.

    Hatalar:
      - 403: Belirtilen proje/kanal baska bir kullaniciya ait
      - 404: Belirtilen proje/kanal bulunamadi
      - 422: Geçersiz dil kodu (Pydantic doğrulaması)
      - 422: Modül bulunamadı veya zorunlu alan eksik
    """
    user_id = ctx.user_id  # PHASE X: owner her zaman kimlik dogrulanmis user

    # PHASE AG — orphan job guard: non-admin kullanicilar mutlaka bir
    # content_project_id ile is baslatmali. Admin/servis ici akislar
    # (ornek: retry scheduler) project-less is olusturmaya devam edebilir.
    if not ctx.is_admin and not payload.content_project_id:
        raise HTTPException(
            status_code=422,
            detail=(
                "content_project_id zorunlu: is mutlaka bir icerik projesine "
                "bagli acilmali (orphan is kabul edilmez)."
            ),
        )

    # PHASE X — project/channel ownership dogrulamasi
    if payload.content_project_id:
        project = await db.get(ContentProject, payload.content_project_id)
        if project is None:
            raise HTTPException(
                status_code=404,
                detail="Belirtilen icerik projesi bulunamadi",
            )
        ensure_owner_or_admin(
            ctx, project.user_id, resource_label="Icerik projesi"
        )
    if payload.channel_profile_id:
        channel = await db.get(ChannelProfile, payload.channel_profile_id)
        if channel is None:
            raise HTTPException(
                status_code=404,
                detail="Belirtilen kanal profili bulunamadi",
            )
        ensure_owner_or_admin(
            ctx, channel.user_id, resource_label="Kanal profili"
        )

    # Modül etkinlik kontrolü — service katmanında
    try:
        await service.check_module_enabled(db, payload.module_id)
    except ModuleDisabledError as exc:
        raise HTTPException(status_code=403, detail=str(exc))

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

    # Settings snapshot — runtime config değişiklikleri çalışan job'ları etkilemesin
    snapshot_keys = [
        k for k in KNOWN_SETTINGS
        if k.startswith(f"{payload.module_id}.")
    ]
    settings_snapshot: dict = {}
    for key in snapshot_keys:
        value = await resolve(key, db)
        if value is not None:
            settings_snapshot[key] = value
        else:
            meta = KNOWN_SETTINGS.get(key, {})
            if meta.get("builtin_default") is not None:
                settings_snapshot[key] = meta["builtin_default"]

    # M40b: system.workspace_root ve system.output_dir snapshot'a ekle
    for sys_key in ("system.workspace_root", "system.output_dir"):
        sys_val = await resolve(sys_key, db, user_id=user_id)
        if sys_val is not None:
            settings_snapshot[sys_key] = sys_val

    if settings_snapshot:
        normalized["_settings_snapshot"] = settings_snapshot

    # M42: user slug çözümle — workspace user-scoped olacak
    user_slug: Optional[str] = None
    if user_id:
        user_row = (
            await db.execute(select(User).where(User.id == user_id))
        ).scalar_one_or_none()
        user_slug = user_row.slug if user_row else None

    # Job DB kaydı oluştur — M40a: owner_id from active user
    # PHASE X: project/channel linkage JobCreate uzerinden propagate edilir
    job_create = JobCreate(
        module_type=payload.module_id,
        owner_id=user_id,
        input_data_json=json.dumps(normalized, ensure_ascii=False),
        content_project_id=payload.content_project_id,
        channel_profile_id=payload.channel_profile_id,
    )
    job = await service.create_job(db, job_create)

    # Adımları ve workspace'i başlat — M42: user-scoped workspace
    ws_path = await initialize_job_steps(db, job.id, payload.module_id, module_registry, user_slug=user_slug)

    # workspace_root ve user_slug'ı input_data'ya enjekte et — executor'lar bu path'i kullanır
    if ws_path:
        normalized["workspace_root"] = ws_path
        if user_slug:
            normalized["user_slug"] = user_slug
        from app.db.models import Job as JobModel
        await db.execute(
            sa_update(JobModel).where(JobModel.id == job.id).values(
                input_data_json=json.dumps(normalized, ensure_ascii=False),
            )
        )
        await db.commit()

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
    except Exception as exc:
        logger.warning("Audit log write failed (job.create): %s", exc)

    # Güncel adımları al ve response oluştur
    return await _build_job_response(db, job)


# ===========================================================================
# M16 — Operational Actions
# ===========================================================================


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(
    job_id: str,
    request: Request,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """
    İşi iptal et. Yalnızca terminal olmayan durumlardan (queued, running,
    waiting, retrying) iptal edilebilir.

    Dispatcher'a kayıtlı asyncio task varsa .cancel() çağrılır. Render
    executor'ları CancelledError bloklarında subprocess'lerini kill etmekle
    yükümlüdür — aksi halde child process zombie/orphan kalabilir.
    """
    # PHASE X ownership gate
    existing = await service.get_job(db, job_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="İş bulunamadı")
    _enforce_job_ownership(ctx, existing)

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

    # Çalışan asyncio task'ini iptal et — DB transition tek başına yeterli değil;
    # task kill edilmediği sürece subprocess ve heartbeat devam eder.
    dispatcher = getattr(request.app.state, "job_dispatcher", None)
    cancel_signalled = False
    if dispatcher is not None and hasattr(dispatcher, "cancel"):
        try:
            cancel_signalled = await dispatcher.cancel(job_id)
        except Exception as exc:
            logger.warning(
                "cancel_job: dispatcher.cancel failed (ignored): job=%s err=%s",
                job_id, exc,
            )

    await write_audit_log(
        db, action="job.cancel", entity_type="job", entity_id=job_id,
        actor_type="admin",
        details={
            "previous_status": job.status,
            "new_status": "cancelled",
            "cancel_signalled": cancel_signalled,
        },
    )
    await db.commit()

    return await _build_job_response(db, job)


async def _rerun_job(
    original_job,
    request: Request,
    db: AsyncSession,
    audit_action: str,
) -> JobResponse:
    """
    Ortak rerun/clone helper. Orijinal job'un input verisinden yeni job oluşturur.

    _settings_snapshot ve _template_snapshot temizlenip yeniden resolve edilir.
    _cloned_from_job_id ile orijinal job referansı korunur.
    """
    # Parse original input, strip snapshots
    raw_input: dict = {}
    if original_job.input_data_json:
        try:
            raw_input = json.loads(original_job.input_data_json)
            if not isinstance(raw_input, dict):
                raw_input = {}
        except (json.JSONDecodeError, TypeError):
            raw_input = {}

    raw_input.pop("_settings_snapshot", None)
    raw_input.pop("_template_snapshot", None)
    raw_input["_cloned_from_job_id"] = original_job.id

    # Re-resolve settings snapshot for current config
    module_id = original_job.module_type
    snapshot_keys = [k for k in KNOWN_SETTINGS if k.startswith(f"{module_id}.")]
    settings_snapshot: dict = {}
    for key in snapshot_keys:
        value = await resolve(key, db)
        if value is not None:
            settings_snapshot[key] = value
        else:
            meta = KNOWN_SETTINGS.get(key, {})
            if meta.get("builtin_default") is not None:
                settings_snapshot[key] = meta["builtin_default"]
    if settings_snapshot:
        raw_input["_settings_snapshot"] = settings_snapshot

    job_create = JobCreate(
        module_type=module_id,
        owner_id=original_job.owner_id,
        template_id=original_job.template_id,
        source_context_json=original_job.source_context_json,
        input_data_json=json.dumps(raw_input, ensure_ascii=False),
        workspace_path=None,
    )
    new_job = await service.create_job(db, job_create)

    await initialize_job_steps(db, new_job.id, module_id, module_registry)

    dispatcher = getattr(request.app.state, "job_dispatcher", None)
    if dispatcher is not None:
        await dispatcher.dispatch(new_job.id)

    await write_audit_log(
        db, action=audit_action, entity_type="job", entity_id=new_job.id,
        actor_type="admin",
        details={"original_job_id": original_job.id, "new_job_id": new_job.id},
    )
    await db.commit()

    return await _build_job_response(db, new_job)


@router.post("/{job_id}/retry", response_model=JobResponse)
async def retry_job(
    job_id: str,
    request: Request,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Başarısız bir işi yeniden dene. Yalnızca 'failed' durumundaki
    işler yeniden denenebilir. Yeni bir job kaydı oluşturulur.
    """
    job = await service.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="İş bulunamadı")
    _enforce_job_ownership(ctx, job)
    if job.status != "failed":
        raise HTTPException(
            status_code=409,
            detail=f"Yalnızca 'failed' durumundaki işler yeniden denenebilir. Mevcut durum: {job.status!r}",
        )
    return await _rerun_job(job, request, db, audit_action="job.retry")


@router.post("/{job_id}/clone", response_model=JobResponse, status_code=201)
async def clone_job(
    job_id: str,
    request: Request,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Terminal durumdaki bir işi klonla. Aynı parametrelerle yeni bir iş oluşturur.
    Settings snapshot yeniden resolve edilir — güncel ayarlar kullanılır.
    """
    job = await service.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="İş bulunamadı")
    _enforce_job_ownership(ctx, job)
    if not service.is_job_terminal(job.status):
        raise HTTPException(
            status_code=409,
            detail=f"Yalnızca terminal durumdaki işler klonlanabilir. Mevcut durum: {job.status!r}",
        )

    # Modül etkinlik kontrolü
    try:
        await service.check_module_enabled(db, job.module_type)
    except ModuleDisabledError as exc:
        raise HTTPException(status_code=403, detail=str(exc))

    return await _rerun_job(job, request, db, audit_action="job.clone")


@router.post("/{job_id}/steps/{step_key}/skip", response_model=JobResponse)
async def skip_step(
    job_id: str,
    step_key: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
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
    _enforce_job_ownership(ctx, job)

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
async def get_allowed_actions(
    job_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Mevcut duruma göre izin verilen aksiyonları döndürür.
    UI tarafında butonların enabled/disabled durumunu belirlemek için kullanılır.
    """
    job = await service.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="İş bulunamadı")
    _enforce_job_ownership(ctx, job)

    actions = {
        "can_cancel": job.status in ("queued", "running", "waiting", "retrying"),
        "can_retry": job.status == "failed",
        "can_clone": service.is_job_terminal(job.status),
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
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Verilen job ID'lerini is_test_data=True olarak işaretle.

    Bu kayıtlar silinmez — varsayılan is listesinden gizlenir.
    Admin panelinden include_test_data=true ile görüntülenebilir.
    PHASE X: admin-only — user'lar kendi job'larini bile test data olarak
    isaretleyemez, bu bulk operasyon admin otoritesindedir.
    """
    marked_count = await service.mark_jobs_as_test_data(db, payload.job_ids)
    return {"marked_count": marked_count}


@router.post("/bulk-archive-test-data")
async def bulk_archive_test_jobs(
    payload: _BulkArchiveTestDataRequest,
    _admin: User = Depends(require_admin),
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
