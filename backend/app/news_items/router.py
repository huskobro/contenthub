from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from .schemas import NewsItemCreate, NewsItemUpdate, NewsItemResponse
from . import service

router = APIRouter(prefix="/news-items", tags=["news-items"])


@router.get("", response_model=List[NewsItemResponse])
async def list_news_items(
    status: Optional[str] = Query(None),
    source_id: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Haber başlığında arama (case-insensitive)"),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_news_items_with_usage_summary(db, status=status, source_id=source_id, language=language, search=search)


@router.get("/{item_id}", response_model=NewsItemResponse)
async def get_news_item(item_id: str, db: AsyncSession = Depends(get_db)):
    item = await service.get_news_item(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="News item not found")
    return item


@router.post("", response_model=NewsItemResponse, status_code=201)
async def create_news_item(payload: NewsItemCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_news_item(db, payload)


@router.patch("/{item_id}", response_model=NewsItemResponse)
async def update_news_item(
    item_id: str, payload: NewsItemUpdate, db: AsyncSession = Depends(get_db)
):
    item = await service.update_news_item(db, item_id, payload)
    if item is None:
        raise HTTPException(status_code=404, detail="News item not found")
    return item
