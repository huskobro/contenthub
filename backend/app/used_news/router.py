from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.visibility.dependencies import require_visible
from .schemas import UsedNewsCreate, UsedNewsUpdate, UsedNewsResponse
from . import service

router = APIRouter(prefix="/used-news", tags=["used-news"], dependencies=[Depends(require_visible("panel:used-news"))])


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
async def create_used_news(payload: UsedNewsCreate, db: AsyncSession = Depends(get_db)):
    record = await service.create_used_news(db, payload)
    if record is None:
        raise HTTPException(status_code=404, detail="News item not found")
    return record


@router.patch("/{record_id}", response_model=UsedNewsResponse)
async def update_used_news(
    record_id: str, payload: UsedNewsUpdate, db: AsyncSession = Depends(get_db)
):
    record = await service.update_used_news(db, record_id, payload)
    if record is None:
        raise HTTPException(status_code=404, detail="Used news record not found")
    return record
