"""Service layer for the Standard Video module."""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import StandardVideo, StandardVideoScript
from app.modules.standard_video.schemas import (
    StandardVideoCreate,
    StandardVideoUpdate,
    StandardVideoScriptCreate,
    StandardVideoScriptUpdate,
)


async def list_standard_videos(
    db: AsyncSession,
    status: Optional[str] = None,
) -> list[StandardVideo]:
    stmt = select(StandardVideo).order_by(StandardVideo.created_at.desc())
    if status:
        stmt = stmt.where(StandardVideo.status == status)
    result = await db.execute(stmt)
    return list(result.scalars().all())


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
