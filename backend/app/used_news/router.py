"""Used-news registry HTTP router.

Gate Sources Closure — added actor+detail-captured audit entries on every
mutation (``used_news.create`` / ``used_news.update`` / ``used_news.delete``).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit_log
from app.db.session import get_db
from app.visibility.dependencies import require_visible
from .schemas import UsedNewsCreate, UsedNewsUpdate, UsedNewsResponse
from . import service

router = APIRouter(
    prefix="/used-news",
    tags=["used-news"],
    dependencies=[Depends(require_visible("panel:used-news"))],
)


def _actor_id(request: Request) -> Optional[str]:
    return request.headers.get("X-ContentHub-User-Id") or None


@router.get("", response_model=List[UsedNewsResponse])
async def list_used_news(
    news_item_id: Optional[str] = Query(None),
    usage_type: Optional[str] = Query(None),
    target_module: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_used_news(
        db,
        news_item_id=news_item_id,
        usage_type=usage_type,
        target_module=target_module,
    )


@router.get("/{record_id}", response_model=UsedNewsResponse)
async def get_used_news(record_id: str, db: AsyncSession = Depends(get_db)):
    record = await service.get_used_news(db, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Used news record not found")
    return record


@router.post("", response_model=UsedNewsResponse, status_code=201)
async def create_used_news(
    payload: UsedNewsCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    record = await service.create_used_news(db, payload)
    if record is None:
        raise HTTPException(status_code=404, detail="News item not found")
    await write_audit_log(
        db,
        action="used_news.create",
        entity_type="used_news",
        entity_id=record.id,
        actor_id=_actor_id(request),
        details={
            "news_item_id": payload.news_item_id,
            "usage_type": payload.usage_type,
            "target_module": payload.target_module,
        },
    )
    await db.commit()
    return record


@router.patch("/{record_id}", response_model=UsedNewsResponse)
async def update_used_news(
    record_id: str,
    payload: UsedNewsUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    record = await service.update_used_news(db, record_id, payload)
    if record is None:
        raise HTTPException(status_code=404, detail="Used news record not found")
    await write_audit_log(
        db,
        action="used_news.update",
        entity_type="used_news",
        entity_id=record_id,
        actor_id=_actor_id(request),
        details=payload.model_dump(exclude_unset=True),
    )
    await db.commit()
    return record


@router.delete("/{record_id}", status_code=204)
async def delete_used_news(
    record_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Delete a used-news registry entry. Audit-logged."""
    from app.db.models import UsedNewsRegistry
    from sqlalchemy import delete as sa_delete, select

    existing = await db.execute(
        select(UsedNewsRegistry).where(UsedNewsRegistry.id == record_id)
    )
    if existing.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Used news record not found")

    await db.execute(sa_delete(UsedNewsRegistry).where(UsedNewsRegistry.id == record_id))
    await write_audit_log(
        db,
        action="used_news.delete",
        entity_type="used_news",
        entity_id=record_id,
        actor_id=_actor_id(request),
    )
    await db.commit()
