from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import NewsSource, SourceScan, NewsItem
from .schemas import SourceCreate, SourceUpdate, SourceResponse


async def list_sources(
    db: AsyncSession,
    source_type: Optional[str] = None,
    status: Optional[str] = None,
    scan_mode: Optional[str] = None,
) -> List[NewsSource]:
    q = select(NewsSource).order_by(NewsSource.created_at.desc())
    if source_type is not None:
        q = q.where(NewsSource.source_type == source_type)
    if status is not None:
        q = q.where(NewsSource.status == status)
    if scan_mode is not None:
        q = q.where(NewsSource.scan_mode == scan_mode)
    result = await db.execute(q)
    return list(result.scalars().all())


async def list_sources_with_scan_summary(
    db: AsyncSession,
    source_type: Optional[str] = None,
    status: Optional[str] = None,
    scan_mode: Optional[str] = None,
) -> List[SourceResponse]:
    """Return source list enriched with scan_count, last_scan_status, last_scan_finished_at."""
    from sqlalchemy import func as sqlfunc
    sources = await list_sources(db, source_type=source_type, status=status, scan_mode=scan_mode)
    result = []
    for s in sources:
        count_row = await db.execute(
            select(sqlfunc.count()).select_from(SourceScan)
            .where(SourceScan.source_id == s.id)
        )
        last_scan_row = await db.execute(
            select(SourceScan)
            .where(SourceScan.source_id == s.id)
            .order_by(SourceScan.created_at.desc())
            .limit(1)
        )
        last_scan = last_scan_row.scalar_one_or_none()
        news_count_row = await db.execute(
            select(sqlfunc.count()).select_from(NewsItem)
            .where(NewsItem.source_id == s.id)
        )
        linked_news_count = news_count_row.scalar() or 0
        reviewed_row = await db.execute(
            select(sqlfunc.count()).select_from(NewsItem)
            .where(NewsItem.source_id == s.id, NewsItem.status == "reviewed")
        )
        reviewed_news_count = reviewed_row.scalar() or 0
        used_row = await db.execute(
            select(sqlfunc.count()).select_from(NewsItem)
            .where(NewsItem.source_id == s.id, NewsItem.status == "used")
        )
        used_news_count_from_source = used_row.scalar() or 0
        result.append(
            SourceResponse(
                id=s.id,
                name=s.name,
                source_type=s.source_type,
                status=s.status,
                base_url=s.base_url,
                feed_url=s.feed_url,
                api_endpoint=s.api_endpoint,
                trust_level=s.trust_level,
                scan_mode=s.scan_mode,
                language=s.language,
                category=s.category,
                notes=s.notes,
                created_at=s.created_at,
                updated_at=s.updated_at,
                scan_count=count_row.scalar() or 0,
                last_scan_status=last_scan.status if last_scan else None,
                last_scan_finished_at=last_scan.finished_at if last_scan else None,
                linked_news_count=linked_news_count,
                reviewed_news_count=reviewed_news_count,
                used_news_count_from_source=used_news_count_from_source,
            )
        )
    return result


async def get_source(db: AsyncSession, source_id: str) -> Optional[NewsSource]:
    result = await db.execute(
        select(NewsSource).where(NewsSource.id == source_id)
    )
    return result.scalar_one_or_none()


async def create_source(db: AsyncSession, payload: SourceCreate) -> NewsSource:
    source = NewsSource(
        name=payload.name,
        source_type=payload.source_type,
        status=payload.status or "active",
        base_url=payload.base_url,
        feed_url=payload.feed_url,
        api_endpoint=payload.api_endpoint,
        trust_level=payload.trust_level,
        scan_mode=payload.scan_mode,
        language=payload.language,
        category=payload.category,
        notes=payload.notes,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source


async def update_source(
    db: AsyncSession, source_id: str, payload: SourceUpdate
) -> Optional[NewsSource]:
    source = await get_source(db, source_id)
    if source is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(source, field, value)
    await db.commit()
    await db.refresh(source)
    return source
