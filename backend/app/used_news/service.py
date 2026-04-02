from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import UsedNewsRegistry, NewsItem
from .schemas import UsedNewsCreate, UsedNewsUpdate


async def list_used_news(
    db: AsyncSession,
    news_item_id: Optional[str] = None,
    usage_type: Optional[str] = None,
    target_module: Optional[str] = None,
) -> List[UsedNewsRegistry]:
    q = select(UsedNewsRegistry).order_by(UsedNewsRegistry.created_at.desc())
    if news_item_id is not None:
        q = q.where(UsedNewsRegistry.news_item_id == news_item_id)
    if usage_type is not None:
        q = q.where(UsedNewsRegistry.usage_type == usage_type)
    if target_module is not None:
        q = q.where(UsedNewsRegistry.target_module == target_module)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_used_news(db: AsyncSession, record_id: str) -> Optional[UsedNewsRegistry]:
    result = await db.execute(
        select(UsedNewsRegistry).where(UsedNewsRegistry.id == record_id)
    )
    return result.scalar_one_or_none()


async def create_used_news(
    db: AsyncSession, payload: UsedNewsCreate
) -> Optional[UsedNewsRegistry]:
    news_item = await db.execute(
        select(NewsItem).where(NewsItem.id == payload.news_item_id)
    )
    if news_item.scalar_one_or_none() is None:
        return None

    record = UsedNewsRegistry(
        news_item_id=payload.news_item_id,
        usage_type=payload.usage_type,
        usage_context=payload.usage_context,
        target_module=payload.target_module,
        target_entity_id=payload.target_entity_id,
        notes=payload.notes,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def update_used_news(
    db: AsyncSession, record_id: str, payload: UsedNewsUpdate
) -> Optional[UsedNewsRegistry]:
    record = await get_used_news(db, record_id)
    if record is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(record, field, value)
    await db.commit()
    await db.refresh(record)
    return record
