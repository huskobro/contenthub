from typing import List, Optional, Dict, Set
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import UsedNewsRegistry, NewsItem, NewsBulletin, StandardVideo, Job
from .schemas import UsedNewsCreate, UsedNewsUpdate, UsedNewsResponse

# Known modules and their model classes for resolution
_MODULE_MODELS = {
    "news_bulletin": NewsBulletin,
    "standard_video": StandardVideo,
    "job": Job,
}


def _enrich(
    record: UsedNewsRegistry,
    news_item: Optional[NewsItem],
    has_target_resolved: bool,
) -> UsedNewsResponse:
    has_source = bool(news_item and news_item.source_id)
    has_scan = bool(news_item and news_item.source_scan_id)
    return UsedNewsResponse(
        id=record.id,
        news_item_id=record.news_item_id,
        usage_type=record.usage_type,
        usage_context=record.usage_context,
        target_module=record.target_module,
        target_entity_id=record.target_entity_id,
        notes=record.notes,
        created_at=record.created_at,
        updated_at=record.updated_at,
        has_news_item_source=has_source,
        has_news_item_scan_reference=has_scan,
        has_target_resolved=has_target_resolved,
    )


async def _batch_resolve_targets(
    db: AsyncSession,
    records: List[UsedNewsRegistry],
) -> Dict[str, bool]:
    """Batch-check whether target entities exist. Returns map of record.id -> resolved."""
    # Group entity_ids by module
    module_entity_map: Dict[str, Set[str]] = {}
    for r in records:
        if r.target_module and r.target_entity_id:
            module_entity_map.setdefault(r.target_module, set()).add(r.target_entity_id)

    # Fetch existing IDs per module
    resolved_ids: Dict[str, Set[str]] = {}  # module -> set of existing entity_ids
    for module, entity_ids in module_entity_map.items():
        model = _MODULE_MODELS.get(module)
        if model is not None:
            rows = await db.execute(
                select(model.id).where(model.id.in_(entity_ids))
            )
            resolved_ids[module] = set(rows.scalars().all())

    # Map each record.id -> resolved bool
    result: Dict[str, bool] = {}
    for r in records:
        if not r.target_module or not r.target_entity_id:
            result[r.id] = False
        else:
            module_resolved = resolved_ids.get(r.target_module)
            if module_resolved is None:
                # Unknown module — cannot verify, treat as not resolved
                result[r.id] = False
            else:
                result[r.id] = r.target_entity_id in module_resolved
    return result


async def list_used_news(
    db: AsyncSession,
    news_item_id: Optional[str] = None,
    usage_type: Optional[str] = None,
    target_module: Optional[str] = None,
) -> List[UsedNewsResponse]:
    q = select(UsedNewsRegistry).order_by(UsedNewsRegistry.created_at.desc())
    if news_item_id is not None:
        q = q.where(UsedNewsRegistry.news_item_id == news_item_id)
    if usage_type is not None:
        q = q.where(UsedNewsRegistry.usage_type == usage_type)
    if target_module is not None:
        q = q.where(UsedNewsRegistry.target_module == target_module)
    result = await db.execute(q)
    records = list(result.scalars().all())

    # Batch-load news items to avoid N+1
    news_item_ids = list({r.news_item_id for r in records})
    ni_result = await db.execute(
        select(NewsItem).where(NewsItem.id.in_(news_item_ids))
    )
    news_items_map = {ni.id: ni for ni in ni_result.scalars().all()}

    # Batch-resolve targets
    target_resolved_map = await _batch_resolve_targets(db, records)

    return [
        _enrich(r, news_items_map.get(r.news_item_id), target_resolved_map.get(r.id, False))
        for r in records
    ]


async def get_used_news(db: AsyncSession, record_id: str) -> Optional[UsedNewsResponse]:
    result = await db.execute(
        select(UsedNewsRegistry).where(UsedNewsRegistry.id == record_id)
    )
    record = result.scalar_one_or_none()
    if record is None:
        return None
    ni_result = await db.execute(
        select(NewsItem).where(NewsItem.id == record.news_item_id)
    )
    news_item = ni_result.scalar_one_or_none()
    target_map = await _batch_resolve_targets(db, [record])
    return _enrich(record, news_item, target_map.get(record.id, False))


async def create_used_news(
    db: AsyncSession, payload: UsedNewsCreate
) -> Optional[UsedNewsResponse]:
    news_item_result = await db.execute(
        select(NewsItem).where(NewsItem.id == payload.news_item_id)
    )
    news_item = news_item_result.scalar_one_or_none()
    if news_item is None:
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
    target_map = await _batch_resolve_targets(db, [record])
    return _enrich(record, news_item, target_map.get(record.id, False))


async def update_used_news(
    db: AsyncSession, record_id: str, payload: UsedNewsUpdate
) -> Optional[UsedNewsResponse]:
    result = await db.execute(
        select(UsedNewsRegistry).where(UsedNewsRegistry.id == record_id)
    )
    record = result.scalar_one_or_none()
    if record is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(record, field, value)
    await db.commit()
    await db.refresh(record)
    ni_result = await db.execute(
        select(NewsItem).where(NewsItem.id == record.news_item_id)
    )
    news_item = ni_result.scalar_one_or_none()
    target_map = await _batch_resolve_targets(db, [record])
    return _enrich(record, news_item, target_map.get(record.id, False))
