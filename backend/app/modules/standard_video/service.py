"""Service layer for the Standard Video module."""

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


async def list_standard_videos(
    db: AsyncSession,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> list[StandardVideo]:
    stmt = select(StandardVideo).order_by(StandardVideo.created_at.desc())
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
) -> list[StandardVideoResponse]:
    videos = await list_standard_videos(db, status=status, search=search, limit=limit, offset=offset)
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
