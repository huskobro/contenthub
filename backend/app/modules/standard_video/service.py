"""Service layer for the Standard Video module."""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import StandardVideo
from app.modules.standard_video.schemas import StandardVideoCreate, StandardVideoUpdate


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
