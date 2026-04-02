from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import NewsItem
from .schemas import NewsItemCreate, NewsItemUpdate


async def list_news_items(
    db: AsyncSession,
    status: Optional[str] = None,
    source_id: Optional[str] = None,
    language: Optional[str] = None,
) -> List[NewsItem]:
    q = select(NewsItem).order_by(NewsItem.created_at.desc())
    if status is not None:
        q = q.where(NewsItem.status == status)
    if source_id is not None:
        q = q.where(NewsItem.source_id == source_id)
    if language is not None:
        q = q.where(NewsItem.language == language)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_news_item(db: AsyncSession, item_id: str) -> Optional[NewsItem]:
    result = await db.execute(
        select(NewsItem).where(NewsItem.id == item_id)
    )
    return result.scalar_one_or_none()


async def create_news_item(db: AsyncSession, payload: NewsItemCreate) -> NewsItem:
    item = NewsItem(
        title=payload.title,
        url=payload.url,
        status=payload.status or "new",
        source_id=payload.source_id,
        source_scan_id=payload.source_scan_id,
        summary=payload.summary,
        published_at=payload.published_at,
        language=payload.language,
        category=payload.category,
        dedupe_key=payload.dedupe_key,
        raw_payload_json=payload.raw_payload_json,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def update_news_item(
    db: AsyncSession, item_id: str, payload: NewsItemUpdate
) -> Optional[NewsItem]:
    item = await get_news_item(db, item_id)
    if item is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item
