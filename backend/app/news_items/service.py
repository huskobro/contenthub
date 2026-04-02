from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import NewsItem, UsedNewsRegistry
from .schemas import NewsItemCreate, NewsItemUpdate, NewsItemResponse


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


async def list_news_items_with_usage_summary(
    db: AsyncSession,
    status: Optional[str] = None,
    source_id: Optional[str] = None,
    language: Optional[str] = None,
) -> List[NewsItemResponse]:
    """Return news item list enriched with usage_count, last_usage_type, last_target_module."""
    from sqlalchemy import func as sqlfunc
    items = await list_news_items(db, status=status, source_id=source_id, language=language)
    result = []
    for item in items:
        count_row = await db.execute(
            select(sqlfunc.count()).select_from(UsedNewsRegistry)
            .where(UsedNewsRegistry.news_item_id == item.id)
        )
        last_usage_row = await db.execute(
            select(UsedNewsRegistry)
            .where(UsedNewsRegistry.news_item_id == item.id)
            .order_by(UsedNewsRegistry.created_at.desc())
            .limit(1)
        )
        last_usage = last_usage_row.scalar_one_or_none()
        result.append(
            NewsItemResponse(
                id=item.id,
                title=item.title,
                url=item.url,
                status=item.status,
                source_id=item.source_id,
                source_scan_id=item.source_scan_id,
                summary=item.summary,
                published_at=item.published_at,
                language=item.language,
                category=item.category,
                dedupe_key=item.dedupe_key,
                raw_payload_json=item.raw_payload_json,
                created_at=item.created_at,
                updated_at=item.updated_at,
                usage_count=count_row.scalar() or 0,
                last_usage_type=last_usage.usage_type if last_usage else None,
                last_target_module=last_usage.target_module if last_usage else None,
            )
        )
    return result


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
