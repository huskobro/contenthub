"""Service layer for the Standard Video module."""

import asyncio
import json
import logging
from typing import Optional
from sqlalchemy import select, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import StandardVideo, StandardVideoScript, StandardVideoMetadata
from app.modules.standard_video.schemas import (
    StandardVideoCreate,
    StandardVideoUpdate,
    StandardVideoScriptCreate,
    StandardVideoScriptUpdate,
    StandardVideoMetadataCreate,
    StandardVideoMetadataUpdate,
    StandardVideoResponse,
)

logger = logging.getLogger(__name__)


async def list_standard_videos(
    db: AsyncSession,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    include_test_data: bool = False,
) -> list[StandardVideo]:
    stmt = select(StandardVideo).order_by(StandardVideo.created_at.desc())
    if not include_test_data:
        stmt = stmt.where(StandardVideo.is_test_data == False)  # noqa: E712
    if status:
        stmt = stmt.where(StandardVideo.status == status)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            StandardVideo.title.ilike(pattern) | StandardVideo.topic.ilike(pattern)
        )
    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def list_standard_videos_with_artifact_summary(
    db: AsyncSession,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    include_test_data: bool = False,
) -> list[StandardVideoResponse]:
    videos = await list_standard_videos(db, status=status, search=search, limit=limit, offset=offset, include_test_data=include_test_data)
    result = []
    for v in videos:
        script_row = await db.execute(
            select(sqlfunc.count()).select_from(StandardVideoScript).where(
                StandardVideoScript.standard_video_id == v.id
            )
        )
        has_script = (script_row.scalar_one() or 0) > 0

        meta_row = await db.execute(
            select(sqlfunc.count()).select_from(StandardVideoMetadata).where(
                StandardVideoMetadata.standard_video_id == v.id
            )
        )
        has_metadata = (meta_row.scalar_one() or 0) > 0

        result.append(StandardVideoResponse(
            id=v.id,
            title=v.title,
            topic=v.topic,
            brief=v.brief,
            target_duration_seconds=v.target_duration_seconds,
            tone=v.tone,
            language=v.language,
            visual_direction=v.visual_direction,
            subtitle_style=v.subtitle_style,
            status=v.status,
            job_id=v.job_id,
            content_project_id=v.content_project_id,
            created_at=v.created_at,
            updated_at=v.updated_at,
            has_script=has_script,
            has_metadata=has_metadata,
        ))
    return result


async def get_standard_video(db: AsyncSession, item_id: str) -> Optional[StandardVideo]:
    result = await db.execute(
        select(StandardVideo).where(StandardVideo.id == item_id)
    )
    return result.scalar_one_or_none()


async def create_standard_video(
    db: AsyncSession, payload: StandardVideoCreate
) -> StandardVideo:
    item = StandardVideo(**payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def clone_standard_video(
    db: AsyncSession, item_id: str
) -> Optional[StandardVideo]:
    """
    Mevcut bir Standard Video kaydini klonlar.

    Kopyalanan alanlar: topic, title, brief, target_duration_seconds, tone,
                        language, visual_direction, subtitle_style
    Kopyalanmayan alanlar: id (yeni UUID), status (draft), job_id (None),
                           created_at/updated_at (yeni)
    Script ve metadata kopyalanmaz — klonlanan kayit bos draft olarak baslar.
    """
    source = await get_standard_video(db, item_id)
    if source is None:
        return None

    clone = StandardVideo(
        topic=source.topic,
        title=f"{source.title or source.topic} (kopya)" if source.title else f"{source.topic} (kopya)",
        brief=source.brief,
        target_duration_seconds=source.target_duration_seconds,
        tone=source.tone,
        language=source.language,
        visual_direction=source.visual_direction,
        subtitle_style=source.subtitle_style,
        status="draft",
        job_id=None,
    )
    db.add(clone)
    await db.commit()
    await db.refresh(clone)
    return clone


async def update_standard_video(
    db: AsyncSession, item_id: str, payload: StandardVideoUpdate
) -> Optional[StandardVideo]:
    item = await get_standard_video(db, item_id)
    if item is None:
        return None
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


# ---------------------------------------------------------------------------
# Script operations
# ---------------------------------------------------------------------------

async def get_script_for_video(
    db: AsyncSession, standard_video_id: str
) -> Optional[StandardVideoScript]:
    result = await db.execute(
        select(StandardVideoScript)
        .where(StandardVideoScript.standard_video_id == standard_video_id)
        .order_by(StandardVideoScript.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def create_script_for_video(
    db: AsyncSession, standard_video_id: str, payload: StandardVideoScriptCreate
) -> StandardVideoScript:
    script = StandardVideoScript(
        standard_video_id=standard_video_id,
        **payload.model_dump(),
    )
    db.add(script)
    # Update the parent video's status to reflect that a script exists
    video = await get_standard_video(db, standard_video_id)
    if video and video.status == "draft":
        video.status = "script_ready"
    await db.commit()
    await db.refresh(script)
    return script


async def update_script_for_video(
    db: AsyncSession, standard_video_id: str, payload: StandardVideoScriptUpdate
) -> Optional[StandardVideoScript]:
    script = await get_script_for_video(db, standard_video_id)
    if script is None:
        return None
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(script, field, value)
    await db.commit()
    await db.refresh(script)
    return script


# ---------------------------------------------------------------------------
# Metadata operations
# ---------------------------------------------------------------------------

async def get_metadata_for_video(
    db: AsyncSession, standard_video_id: str
) -> Optional[StandardVideoMetadata]:
    result = await db.execute(
        select(StandardVideoMetadata)
        .where(StandardVideoMetadata.standard_video_id == standard_video_id)
        .order_by(StandardVideoMetadata.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def create_metadata_for_video(
    db: AsyncSession, standard_video_id: str, payload: StandardVideoMetadataCreate
) -> StandardVideoMetadata:
    meta = StandardVideoMetadata(
        standard_video_id=standard_video_id,
        **payload.model_dump(),
    )
    db.add(meta)
    # Advance video status when metadata is added
    video = await get_standard_video(db, standard_video_id)
    if video and video.status in ("draft", "script_ready"):
        video.status = "metadata_ready"
    await db.commit()
    await db.refresh(meta)
    return meta


async def update_metadata_for_video(
    db: AsyncSession, standard_video_id: str, payload: StandardVideoMetadataUpdate
) -> Optional[StandardVideoMetadata]:
    meta = await get_metadata_for_video(db, standard_video_id)
    if meta is None:
        return None
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(meta, field, value)
    await db.commit()
    await db.refresh(meta)
    return meta


# ---------------------------------------------------------------------------
# Production pipeline
# ---------------------------------------------------------------------------

async def start_production(
    db: AsyncSession,
    video_id: str,
    dispatcher,
    session_factory,
    owner_id: Optional[str] = None,
) -> dict:
    """
    Standard Video uretim pipeline'ini baslatir.

    Akis:
      1. Video kaydini dogrula (var mi, zaten rendering degil mi)
      2. Effective settings snapshot al (standard_video.* + system.*)
      3. Job olustur (module_type="standard_video")
      4. video.job_id = job.id, video.status = "rendering"
      5. ContentProject.active_job_id guncelle (varsa)
      6. initialize_job_steps + workspace enjeksiyonu
      7. dispatcher.dispatch(job.id)
      8. _watch_video_job async task baslatma
      9. Audit log yaz

    Returns:
        dict: job_id, video_id, video_status, message

    Raises:
        ValueError: Precondition ihlali
    """
    from sqlalchemy import select as sa_select, update as sa_update
    from app.jobs.schemas import JobCreate
    from app.jobs.service import create_job
    from app.jobs.step_initializer import initialize_job_steps
    from app.modules.registry import module_registry
    from app.settings.settings_resolver import resolve, KNOWN_SETTINGS
    from app.audit.service import write_audit_log
    from app.db.models import User, Job

    video = await get_standard_video(db, video_id)
    if video is None:
        raise ValueError(f"Standard video bulunamadi: {video_id}")

    if video.status == "rendering":
        raise ValueError("Bu video zaten rendering durumunda.")

    if video.status in ("completed", "published"):
        raise ValueError(
            f"Bu video zaten tamamlandi ({video.status}). "
            "Yeniden uretmek icin klonlayin."
        )

    # Settings snapshot — standard_video.* + system.*
    snapshot_keys = [k for k in KNOWN_SETTINGS if k.startswith("standard_video.")]
    settings_snapshot: dict = {}
    for key in snapshot_keys:
        value = await resolve(key, db)
        if value is not None:
            settings_snapshot[key] = value
        else:
            meta = KNOWN_SETTINGS.get(key, {})
            if meta.get("builtin_default") is not None:
                settings_snapshot[key] = meta["builtin_default"]

    for sys_key in ("system.workspace_root", "system.output_dir"):
        sys_val = await resolve(sys_key, db, user_id=owner_id)
        if sys_val is not None:
            settings_snapshot[sys_key] = sys_val

    # Job input data — tum video config alanlari + settings snapshot
    input_data: dict = {
        "video_id": video_id,
        "topic": video.topic,
        "title": video.title or video.topic,
        "brief": video.brief or "",
        "language": video.language or settings_snapshot.get("standard_video.config.default_language", "tr"),
        "tone": video.tone or settings_snapshot.get("standard_video.config.default_tone", "neutral"),
        "target_duration_seconds": video.target_duration_seconds or settings_snapshot.get("standard_video.config.default_duration_seconds", 120),
        "visual_direction": video.visual_direction or "",
        "composition_direction": getattr(video, "composition_direction", None) or "",
        "thumbnail_direction": getattr(video, "thumbnail_direction", None) or "",
        "subtitle_style": video.subtitle_style or "",
        "lower_third_style": getattr(video, "lower_third_style", None) or "",
        "motion_level": getattr(video, "motion_level", None) or "",
        "render_format": getattr(video, "render_format", None) or "landscape",
        "karaoke_enabled": getattr(video, "karaoke_enabled", False) or False,
        "template_id": video.template_id if hasattr(video, "template_id") else None,
        "style_blueprint_id": video.style_blueprint_id if hasattr(video, "style_blueprint_id") else None,
        "_settings_snapshot": settings_snapshot,
    }

    # User slug coz
    user_slug: Optional[str] = None
    if owner_id:
        user_row = (await db.execute(sa_select(User).where(User.id == owner_id))).scalar_one_or_none()
        user_slug = user_row.slug if user_row else None

    # Job olustur
    job_payload = JobCreate(
        module_type="standard_video",
        owner_id=owner_id,
        input_data_json=json.dumps(input_data, ensure_ascii=False),
        channel_profile_id=getattr(video, "channel_profile_id", None),
        content_project_id=getattr(video, "content_project_id", None),
    )
    job = await create_job(db, job_payload)

    # Video guncelle
    video.job_id = job.id
    video.status = "rendering"

    # ContentProject active_job_id guncelle
    _project_id = getattr(video, "content_project_id", None)
    if _project_id:
        from app.db.models import ContentProject
        _proj = (await db.execute(sa_select(ContentProject).where(ContentProject.id == _project_id))).scalar_one_or_none()
        if _proj:
            _proj.active_job_id = job.id
            _proj.current_stage = "rendering"

    await db.commit()

    # Audit log
    await write_audit_log(
        db,
        action="standard_video.production.started",
        entity_type="standard_video",
        entity_id=video_id,
        details={"job_id": job.id, "topic": video.topic},
    )
    await db.commit()

    # Adimlari ve workspace'i baslatla
    ws_path = await initialize_job_steps(db, job.id, "standard_video", module_registry, user_slug=user_slug)

    if ws_path:
        input_data["workspace_root"] = ws_path
        if user_slug:
            input_data["user_slug"] = user_slug
        await db.execute(
            sa_update(Job).where(Job.id == job.id).values(
                input_data_json=json.dumps(input_data, ensure_ascii=False),
            )
        )
        await db.commit()

    # Pipeline'i dispatch et
    await dispatcher.dispatch(job.id)

    # Watcher task — job tamamlandiginda video status'u guncelle
    asyncio.create_task(
        _watch_video_job(
            session_factory=session_factory,
            video_id=video_id,
            job_id=job.id,
        )
    )

    logger.info(
        "start_production: video=%s job=%s dispatched",
        video_id, job.id,
    )

    return {
        "job_id": job.id,
        "video_id": video_id,
        "video_status": "rendering",
        "message": f"Uretim baslatildi. job_id={job.id}",
    }


async def _watch_video_job(
    session_factory,
    video_id: str,
    job_id: str,
    poll_interval: float = 10.0,
    timeout: float = 3600.0,
) -> None:
    """
    Job tamamlandiginda StandardVideo.status'u gunceller.

    start_production tarafindan asyncio.create_task ile baslatilir.
    """
    from app.db.models import Job as JobModel

    elapsed = 0.0
    while elapsed < timeout:
        await asyncio.sleep(poll_interval)
        elapsed += poll_interval
        try:
            async with session_factory() as session:
                job = (await session.execute(
                    select(JobModel).where(JobModel.id == job_id)
                )).scalar_one_or_none()
                if job is None:
                    logger.warning("_watch_video_job: job bulunamadi. job_id=%s video_id=%s", job_id, video_id)
                    return

                if job.status == "completed":
                    video = (await session.execute(
                        select(StandardVideo).where(StandardVideo.id == video_id)
                    )).scalar_one_or_none()
                    if video:
                        video.status = "completed"
                        await session.commit()
                    logger.info("_watch_video_job: video tamamlandi. video=%s job=%s", video_id, job_id)
                    return

                if job.status in ("failed", "cancelled"):
                    video = (await session.execute(
                        select(StandardVideo).where(StandardVideo.id == video_id)
                    )).scalar_one_or_none()
                    if video:
                        video.status = "failed"
                        await session.commit()
                    logger.warning("_watch_video_job: video basarisiz. video=%s job=%s status=%s", video_id, job_id, job.status)
                    return

        except Exception as exc:
            logger.warning("_watch_video_job hata (non-fatal): %s", exc)

    logger.warning(
        "_watch_video_job: timeout (%.0fs). video=%s job=%s — video may be stuck in 'rendering'.",
        timeout, video_id, job_id,
    )
