"""
News items HTTP router.

Gate Sources Closure:
  - ``GET /news-items`` returns a pagination envelope.
  - Added ``POST /{id}/ignore`` and ``POST /{id}/use`` convenience endpoints
    so the UI doesn't have to negotiate the status literal. Both write an
    audit entry.
  - ``GET /{id}`` is now audit-silent (read-only) but write paths carry
    actor + filter details.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit_log
from app.db.session import get_db
from app.visibility.dependencies import require_visible
from .schemas import (
    NewsItemCreate,
    NewsItemUpdate,
    NewsItemResponse,
    NewsItemListResponse,
)
from . import service

router = APIRouter(
    prefix="/news-items",
    tags=["news-items"],
    dependencies=[Depends(require_visible("panel:news-items"))],
)


def _actor_id(request: Request) -> Optional[str]:
    return request.headers.get("X-ContentHub-User-Id") or None


@router.get("", response_model=NewsItemListResponse)
async def list_news_items(
    status: Optional[str] = Query(None),
    source_id: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    category: Optional[str] = Query(None, description="Kategori filtresi"),
    search: Optional[str] = Query(None, description="Haber basliginda arama"),
    include_test_data: bool = Query(
        False, description="Test/demo kayitlarini dahil et"
    ),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    items, total = await service.list_news_items_with_usage_summary(
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
    return NewsItemListResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{item_id}", response_model=NewsItemResponse)
async def get_news_item(item_id: str, db: AsyncSession = Depends(get_db)):
    item = await service.get_news_item(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="News item not found")
    return NewsItemResponse.from_model(item)


@router.post("", response_model=NewsItemResponse, status_code=201)
async def create_news_item(
    payload: NewsItemCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    item = await service.create_news_item(db, payload)
    await write_audit_log(
        db,
        action="news_item.create",
        entity_type="news_item",
        entity_id=item.id,
        actor_id=_actor_id(request),
        details={"title": item.title, "source_id": item.source_id},
    )
    await db.commit()
    return NewsItemResponse.from_model(item)


@router.patch("/{item_id}", response_model=NewsItemResponse)
async def update_news_item(
    item_id: str,
    payload: NewsItemUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    item = await service.update_news_item(db, item_id, payload)
    if item is None:
        raise HTTPException(status_code=404, detail="News item not found")
    await write_audit_log(
        db,
        action="news_item.update",
        entity_type="news_item",
        entity_id=item_id,
        actor_id=_actor_id(request),
        details=payload.model_dump(exclude_unset=True),
    )
    await db.commit()
    return NewsItemResponse.from_model(item)


@router.post("/{item_id}/ignore", response_model=NewsItemResponse)
async def ignore_news_item(
    item_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Mark a news item as ignored. Audit-logged."""
    item = await service.update_news_item(
        db, item_id, NewsItemUpdate(status="ignored")
    )
    if item is None:
        raise HTTPException(status_code=404, detail="News item not found")
    await write_audit_log(
        db,
        action="news_item.ignore",
        entity_type="news_item",
        entity_id=item_id,
        actor_id=_actor_id(request),
    )
    await db.commit()
    return NewsItemResponse.from_model(item)


@router.post("/{item_id}/use", response_model=NewsItemResponse)
async def use_news_item(
    item_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Mark a news item as used. Audit-logged.

    Note: real 'used' state transitions typically happen through the
    bulletin pipeline, which writes a UsedNewsRegistry entry. This
    endpoint exists for out-of-band operator use (e.g. manually pinning
    an item as used to suppress dedupe hits).
    """
    item = await service.update_news_item(
        db, item_id, NewsItemUpdate(status="used")
    )
    if item is None:
        raise HTTPException(status_code=404, detail="News item not found")
    await write_audit_log(
        db,
        action="news_item.use",
        entity_type="news_item",
        entity_id=item_id,
        actor_id=_actor_id(request),
    )
    await db.commit()
    return NewsItemResponse.from_model(item)
