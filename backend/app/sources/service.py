from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import NewsSource
from .schemas import SourceCreate, SourceUpdate


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
