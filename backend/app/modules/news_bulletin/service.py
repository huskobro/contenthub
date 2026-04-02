from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import NewsBulletin
from .schemas import NewsBulletinCreate, NewsBulletinUpdate


async def list_news_bulletins(db: AsyncSession) -> List[NewsBulletin]:
    result = await db.execute(
        select(NewsBulletin).order_by(NewsBulletin.created_at.desc())
    )
    return list(result.scalars().all())


async def get_news_bulletin(db: AsyncSession, item_id: str) -> Optional[NewsBulletin]:
    result = await db.execute(
        select(NewsBulletin).where(NewsBulletin.id == item_id)
    )
    return result.scalar_one_or_none()


async def create_news_bulletin(
    db: AsyncSession, payload: NewsBulletinCreate
) -> NewsBulletin:
    item = NewsBulletin(
        title=payload.title,
        topic=payload.topic,
        brief=payload.brief,
        target_duration_seconds=payload.target_duration_seconds,
        language=payload.language,
        tone=payload.tone,
        bulletin_style=payload.bulletin_style,
        source_mode=payload.source_mode,
        selected_news_ids_json=payload.selected_news_ids_json,
        status=payload.status or "draft",
        job_id=payload.job_id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def update_news_bulletin(
    db: AsyncSession, item_id: str, payload: NewsBulletinUpdate
) -> Optional[NewsBulletin]:
    item = await get_news_bulletin(db, item_id)
    if item is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item
