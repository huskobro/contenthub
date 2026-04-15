"""
News item service layer.

Gate Sources Closure:
  - Batched aggregates replace the previous 4×N per-item N+1 pattern.
  - Pagination support.
  - ``status='reviewed'`` is no longer a legal value. Legacy callers that
    pass it get normalized to ``'new'`` defensively (migration already
    normalized persisted rows).
"""
from typing import List, Optional, Tuple
from sqlalchemy import select, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import NewsItem, UsedNewsRegistry, NewsSource, SourceScan
from .schemas import (
    NewsItemCreate,
    NewsItemUpdate,
    NewsItemResponse,
    VALID_NEWS_ITEM_STATUSES,
)


def _news_items_base_query(
    status: Optional[str] = None,
    source_id: Optional[str] = None,
    language: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    include_test_data: bool = False,
):
    q = select(NewsItem)
    if not include_test_data:
        q = q.where(NewsItem.is_test_data == False)  # noqa: E712
    if status is not None:
        # Defensive normalization: reject reviewed entirely at query level.
        if status == "reviewed":
            # Return an impossible predicate so callers see an empty list
            # without us silently querying the legacy value.
            q = q.where(NewsItem.id == "__gate_sources_reviewed_removed__")
        else:
            q = q.where(NewsItem.status == status)
    if source_id is not None:
        q = q.where(NewsItem.source_id == source_id)
    if language is not None:
        q = q.where(NewsItem.language == language)
    if category is not None:
        q = q.where(NewsItem.category == category)
    if search:
        pattern = f"%{search}%"
        q = q.where(NewsItem.title.ilike(pattern))
    return q


async def list_news_items(
    db: AsyncSession,
    status: Optional[str] = None,
    source_id: Optional[str] = None,
    language: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    include_test_data: bool = False,
    limit: Optional[int] = None,
    offset: int = 0,
) -> List[NewsItem]:
    q = _news_items_base_query(
        status=status,
        source_id=source_id,
        language=language,
        category=category,
        search=search,
        include_test_data=include_test_data,
    ).order_by(NewsItem.created_at.desc())
    if offset:
        q = q.offset(offset)
    if limit is not None:
        q = q.limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def count_news_items(
    db: AsyncSession,
    status: Optional[str] = None,
    source_id: Optional[str] = None,
    language: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    include_test_data: bool = False,
) -> int:
    q = _news_items_base_query(
        status=status,
        source_id=source_id,
        language=language,
        category=category,
        search=search,
        include_test_data=include_test_data,
    )
    count_stmt = select(sqlfunc.count()).select_from(q.subquery())
    result = await db.execute(count_stmt)
    return int(result.scalar() or 0)


async def list_news_items_with_usage_summary(
    db: AsyncSession,
    status: Optional[str] = None,
    source_id: Optional[str] = None,
    language: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    include_test_data: bool = False,
    limit: Optional[int] = None,
    offset: int = 0,
) -> Tuple[List[NewsItemResponse], int]:
    """Return (items, total). Aggregates are computed in batch.

    Query strategy (O(1) queries instead of 4×N):
      1. Page of items + total count.
      2. One GROUP BY on used_news_registry → usage_count + last usage row.
      3. One IN() on news_sources → source_name + source_status.
      4. One IN() on source_scans → source_scan_status.
      5. Same published set query as before, scoped to page.
    """
    items = await list_news_items(
        db,
        status=status,
        source_id=source_id,
        language=language,
        category=category,
        search=search,
        include_test_data=include_test_data,
        limit=limit,
        offset=offset,
    )
    total = await count_news_items(
        db,
        status=status,
        source_id=source_id,
        language=language,
        category=category,
        search=search,
        include_test_data=include_test_data,
    )
    if not items:
        return [], total

    item_ids = [i.id for i in items]
    source_ids = list({i.source_id for i in items if i.source_id})
    scan_ids = list({i.source_scan_id for i in items if i.source_scan_id})

    # 2a. usage_count per item
    usage_count_rows = await db.execute(
        select(UsedNewsRegistry.news_item_id, sqlfunc.count().label("n"))
        .where(UsedNewsRegistry.news_item_id.in_(item_ids))
        .group_by(UsedNewsRegistry.news_item_id)
    )
    usage_count_map = {row.news_item_id: int(row.n) for row in usage_count_rows}

    # 2b. last usage per item (row_number over partition)
    last_usage_subq = (
        select(
            UsedNewsRegistry.news_item_id,
            UsedNewsRegistry.usage_type,
            UsedNewsRegistry.target_module,
            sqlfunc.row_number()
            .over(
                partition_by=UsedNewsRegistry.news_item_id,
                order_by=UsedNewsRegistry.created_at.desc(),
            )
            .label("rn"),
        )
        .where(UsedNewsRegistry.news_item_id.in_(item_ids))
        .subquery()
    )
    last_usage_rows = await db.execute(
        select(
            last_usage_subq.c.news_item_id,
            last_usage_subq.c.usage_type,
            last_usage_subq.c.target_module,
        ).where(last_usage_subq.c.rn == 1)
    )
    last_usage_map = {
        row.news_item_id: {
            "usage_type": row.usage_type,
            "target_module": row.target_module,
        }
        for row in last_usage_rows
    }

    # 2c. published/scheduled link set
    pub_rows = await db.execute(
        select(UsedNewsRegistry.news_item_id)
        .where(
            UsedNewsRegistry.news_item_id.in_(item_ids),
            UsedNewsRegistry.usage_type.ilike("%published%")
            | UsedNewsRegistry.usage_type.ilike("%scheduled%"),
        )
        .distinct()
    )
    published_link_set = set(pub_rows.scalars().all())

    # 3. source name/status lookup
    source_map: dict[str, dict[str, Optional[str]]] = {}
    if source_ids:
        src_rows = await db.execute(
            select(NewsSource.id, NewsSource.name, NewsSource.status)
            .where(NewsSource.id.in_(source_ids))
        )
        for row in src_rows:
            source_map[row.id] = {"name": row.name, "status": row.status}

    # 4. source_scan status lookup
    scan_status_map: dict[str, Optional[str]] = {}
    if scan_ids:
        scan_rows = await db.execute(
            select(SourceScan.id, SourceScan.status)
            .where(SourceScan.id.in_(scan_ids))
        )
        for row in scan_rows:
            scan_status_map[row.id] = row.status

    results: List[NewsItemResponse] = []
    for item in items:
        last = last_usage_map.get(item.id) or {}
        src = source_map.get(item.source_id) if item.source_id else None
        scan_status = (
            scan_status_map.get(item.source_scan_id, "not_found")
            if item.source_scan_id
            else None
        )
        results.append(
            NewsItemResponse.from_model(
                item,
                usage_count=usage_count_map.get(item.id, 0),
                last_usage_type=last.get("usage_type"),
                last_target_module=last.get("target_module"),
                source_name=src.get("name") if src else None,
                source_status=src.get("status") if src else None,
                source_scan_status=scan_status,
                has_published_used_news_link=item.id in published_link_set,
            )
        )

    return results, total


async def get_news_item(db: AsyncSession, item_id: str) -> Optional[NewsItem]:
    result = await db.execute(
        select(NewsItem).where(NewsItem.id == item_id)
    )
    return result.scalar_one_or_none()


def _normalize_status(status: Optional[str]) -> Optional[str]:
    """Defensive: legacy 'reviewed' → 'new'. Unknown stays as-is so the
    schema literal rejects it."""
    if status is None:
        return None
    if status == "reviewed":
        return "new"
    return status


async def create_news_item(db: AsyncSession, payload: NewsItemCreate) -> NewsItem:
    status = payload.status or "new"
    if status not in VALID_NEWS_ITEM_STATUSES:
        # Schema literal should already have caught this; defensive fallback.
        status = "new"
    item = NewsItem(
        title=payload.title,
        url=payload.url,
        status=status,
        source_id=payload.source_id,
        source_scan_id=payload.source_scan_id,
        summary=payload.summary,
        published_at=payload.published_at,
        language=payload.language,
        category=payload.category,
        dedupe_key=payload.dedupe_key,
        raw_payload_json=payload.raw_payload_json,
        image_url=payload.image_url,
        image_urls_json=payload.image_urls_json,
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
    if "status" in data:
        data["status"] = _normalize_status(data["status"])
        if data["status"] not in VALID_NEWS_ITEM_STATUSES:
            data["status"] = "new"
    # image_urls is a computed field — store via image_urls_json.
    data.pop("image_urls", None)
    for field, value in data.items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item
