"""
News source service layer.

Gate Sources Closure highlights:
  - ``list_sources_with_scan_summary`` uses batched aggregate queries instead
    of the previous 5×N per-source N+1 pattern.
  - Pagination support (``offset`` / ``limit``) added.
  - Exposes ``last_scan_error`` and ``failed_scan_count`` on the response for
    the new Source Health surface.
  - Duplicate ``feed_url`` is rejected at creation / update time (matches
    the unique index added in the gate_sources_001 migration).
"""
from typing import List, Optional, Tuple
from sqlalchemy import select, delete, func as sqlfunc, and_, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.db.models import NewsSource, SourceScan, NewsItem
from .schemas import SourceCreate, SourceUpdate, SourceResponse


def _source_base_query(
    source_type: Optional[str] = None,
    status: Optional[str] = None,
    scan_mode: Optional[str] = None,
    search: Optional[str] = None,
    include_test_data: bool = False,
):
    q = select(NewsSource)
    if not include_test_data:
        q = q.where(NewsSource.is_test_data == False)  # noqa: E712
    if source_type is not None:
        q = q.where(NewsSource.source_type == source_type)
    if status is not None:
        q = q.where(NewsSource.status == status)
    if scan_mode is not None:
        q = q.where(NewsSource.scan_mode == scan_mode)
    if search:
        pattern = f"%{search}%"
        q = q.where(NewsSource.name.ilike(pattern))
    return q


async def list_sources(
    db: AsyncSession,
    source_type: Optional[str] = None,
    status: Optional[str] = None,
    scan_mode: Optional[str] = None,
    search: Optional[str] = None,
    include_test_data: bool = False,
    limit: Optional[int] = None,
    offset: int = 0,
) -> List[NewsSource]:
    q = _source_base_query(
        source_type=source_type,
        status=status,
        scan_mode=scan_mode,
        search=search,
        include_test_data=include_test_data,
    ).order_by(NewsSource.created_at.desc())
    if offset:
        q = q.offset(offset)
    if limit is not None:
        q = q.limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def count_sources(
    db: AsyncSession,
    source_type: Optional[str] = None,
    status: Optional[str] = None,
    scan_mode: Optional[str] = None,
    search: Optional[str] = None,
    include_test_data: bool = False,
) -> int:
    q = _source_base_query(
        source_type=source_type,
        status=status,
        scan_mode=scan_mode,
        search=search,
        include_test_data=include_test_data,
    )
    count_stmt = select(sqlfunc.count()).select_from(q.subquery())
    result = await db.execute(count_stmt)
    return int(result.scalar() or 0)


async def list_sources_with_scan_summary(
    db: AsyncSession,
    source_type: Optional[str] = None,
    status: Optional[str] = None,
    scan_mode: Optional[str] = None,
    search: Optional[str] = None,
    include_test_data: bool = False,
    limit: Optional[int] = None,
    offset: int = 0,
) -> Tuple[List[SourceResponse], int]:
    """Return (items, total). Aggregates are computed in batch.

    Query strategy (O(1) queries instead of 5×N):
      1. Page of sources.
      2. Total count over the same filter (no pagination).
      3. One GROUP BY on source_scans → scan_count + (max finished_at).
      4. One GROUP BY on source_scans filtered by status='failed' and
         finished_at within the last 7 days → failed_scan_count.
      5. Last scan record per source (via rank/correlated subquery) for
         last_scan_status + last_scan_error.
      6. Two GROUP BYs on news_items → linked_news_count + used count.
    """
    sources = await list_sources(
        db,
        source_type=source_type,
        status=status,
        scan_mode=scan_mode,
        search=search,
        include_test_data=include_test_data,
        limit=limit,
        offset=offset,
    )
    total = await count_sources(
        db,
        source_type=source_type,
        status=status,
        scan_mode=scan_mode,
        search=search,
        include_test_data=include_test_data,
    )
    if not sources:
        return [], total

    ids = [s.id for s in sources]

    # 3. scan_count by source_id
    scan_count_rows = await db.execute(
        select(SourceScan.source_id, sqlfunc.count().label("n"))
        .where(SourceScan.source_id.in_(ids))
        .group_by(SourceScan.source_id)
    )
    scan_count_map = {row.source_id: int(row.n) for row in scan_count_rows}

    # 4. failed_scan_count (recent failures — rolling 7 day window)
    from datetime import datetime, timezone, timedelta
    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    failed_rows = await db.execute(
        select(SourceScan.source_id, sqlfunc.count().label("n"))
        .where(
            SourceScan.source_id.in_(ids),
            SourceScan.status == "failed",
            SourceScan.created_at >= recent_cutoff,
        )
        .group_by(SourceScan.source_id)
    )
    failed_map = {row.source_id: int(row.n) for row in failed_rows}

    # 5. Last scan per source — correlated subquery.
    # Rank scans by created_at desc within each source; take row 1.
    last_scan_subq = (
        select(
            SourceScan.source_id,
            SourceScan.status,
            SourceScan.finished_at,
            SourceScan.error_summary,
            sqlfunc.row_number()
            .over(
                partition_by=SourceScan.source_id,
                order_by=SourceScan.created_at.desc(),
            )
            .label("rn"),
        )
        .where(SourceScan.source_id.in_(ids))
        .subquery()
    )
    last_scan_rows = await db.execute(
        select(
            last_scan_subq.c.source_id,
            last_scan_subq.c.status,
            last_scan_subq.c.finished_at,
            last_scan_subq.c.error_summary,
        ).where(last_scan_subq.c.rn == 1)
    )
    last_scan_map = {
        row.source_id: {
            "status": row.status,
            "finished_at": row.finished_at,
            "error_summary": row.error_summary,
        }
        for row in last_scan_rows
    }

    # 6a. linked_news_count — total news items per source
    news_count_rows = await db.execute(
        select(NewsItem.source_id, sqlfunc.count().label("n"))
        .where(NewsItem.source_id.in_(ids))
        .group_by(NewsItem.source_id)
    )
    news_count_map = {row.source_id: int(row.n) for row in news_count_rows}

    # 6b. used_news_count per source
    used_rows = await db.execute(
        select(NewsItem.source_id, sqlfunc.count().label("n"))
        .where(
            NewsItem.source_id.in_(ids),
            NewsItem.status == "used",
        )
        .group_by(NewsItem.source_id)
    )
    used_map = {row.source_id: int(row.n) for row in used_rows}

    items: List[SourceResponse] = []
    for s in sources:
        last = last_scan_map.get(s.id) or {}
        items.append(
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
                scan_count=scan_count_map.get(s.id, 0),
                last_scan_status=last.get("status"),
                last_scan_finished_at=last.get("finished_at"),
                last_scan_error=last.get("error_summary"),
                failed_scan_count=failed_map.get(s.id, 0),
                linked_news_count=news_count_map.get(s.id, 0),
                used_news_count_from_source=used_map.get(s.id, 0),
            )
        )

    return items, total


async def get_source(db: AsyncSession, source_id: str) -> Optional[NewsSource]:
    result = await db.execute(
        select(NewsSource).where(NewsSource.id == source_id)
    )
    return result.scalar_one_or_none()


async def _feed_url_exists(
    db: AsyncSession, feed_url: str, exclude_id: Optional[str] = None
) -> bool:
    if not feed_url or not feed_url.strip():
        return False
    q = select(NewsSource.id).where(NewsSource.feed_url == feed_url.strip())
    if exclude_id is not None:
        q = q.where(NewsSource.id != exclude_id)
    q = q.limit(1)
    result = await db.execute(q)
    return result.scalar_one_or_none() is not None


async def create_source(db: AsyncSession, payload: SourceCreate) -> NewsSource:
    # Early duplicate check — fail fast with 409 before IntegrityError.
    if payload.feed_url and await _feed_url_exists(db, payload.feed_url):
        raise HTTPException(
            status_code=409,
            detail=f"A source with feed_url='{payload.feed_url}' already exists.",
        )
    source = NewsSource(
        name=payload.name,
        source_type="rss",  # Gate Sources Closure — only 'rss' is legal now
        status=payload.status or "active",
        base_url=payload.base_url,
        feed_url=payload.feed_url.strip() if payload.feed_url else None,
        api_endpoint=None,  # legacy shell — do not persist
        trust_level=payload.trust_level,
        scan_mode=payload.scan_mode,
        language=payload.language,
        category=payload.category,
        notes=payload.notes,
    )
    db.add(source)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Duplicate feed_url or other integrity violation.",
        ) from exc
    await db.refresh(source)
    return source


async def delete_source(db: AsyncSession, source_id: str) -> bool:
    """Delete a source and all related records (scans, news items)."""
    source = await get_source(db, source_id)
    if source is None:
        return False
    await db.execute(delete(NewsItem).where(NewsItem.source_id == source_id))
    await db.execute(delete(SourceScan).where(SourceScan.source_id == source_id))
    await db.delete(source)
    await db.commit()
    return True


async def update_source(
    db: AsyncSession, source_id: str, payload: SourceUpdate
) -> Optional[NewsSource]:
    source = await get_source(db, source_id)
    if source is None:
        return None
    data = payload.model_dump(exclude_unset=True)

    # Duplicate feed_url guard (exclude self)
    new_feed = data.get("feed_url")
    if new_feed and await _feed_url_exists(db, new_feed, exclude_id=source_id):
        raise HTTPException(
            status_code=409,
            detail=f"A source with feed_url='{new_feed}' already exists.",
        )

    # Never allow the legacy shells to be re-introduced via update.
    if "source_type" in data and data["source_type"] != "rss":
        raise HTTPException(
            status_code=422,
            detail="source_type must be 'rss' (legacy shells removed).",
        )

    for field, value in data.items():
        setattr(source, field, value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Duplicate feed_url or other integrity violation.",
        ) from exc
    await db.refresh(source)
    return source
