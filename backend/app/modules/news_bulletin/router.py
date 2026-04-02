from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from .schemas import (
    NewsBulletinCreate, NewsBulletinUpdate, NewsBulletinResponse,
    NewsBulletinScriptCreate, NewsBulletinScriptUpdate, NewsBulletinScriptResponse,
    NewsBulletinMetadataCreate, NewsBulletinMetadataUpdate, NewsBulletinMetadataResponse,
    NewsBulletinSelectedItemCreate, NewsBulletinSelectedItemUpdate, NewsBulletinSelectedItemResponse,
    NewsBulletinSelectedItemWithEnforcementResponse,
)
from . import service

router = APIRouter(prefix="/modules/news-bulletin", tags=["news-bulletin"])


@router.get("", response_model=List[NewsBulletinResponse])
async def list_news_bulletins(db: AsyncSession = Depends(get_db)):
    return await service.list_news_bulletins_with_artifacts(db)


@router.get("/{item_id}", response_model=NewsBulletinResponse)
async def get_news_bulletin(item_id: str, db: AsyncSession = Depends(get_db)):
    item = await service.get_news_bulletin(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    return item


@router.post("", response_model=NewsBulletinResponse, status_code=201)
async def create_news_bulletin(
    payload: NewsBulletinCreate, db: AsyncSession = Depends(get_db)
):
    return await service.create_news_bulletin(db, payload)


@router.patch("/{item_id}", response_model=NewsBulletinResponse)
async def update_news_bulletin(
    item_id: str, payload: NewsBulletinUpdate, db: AsyncSession = Depends(get_db)
):
    item = await service.update_news_bulletin(db, item_id, payload)
    if item is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    return item


@router.get("/{item_id}/script", response_model=NewsBulletinScriptResponse)
async def get_bulletin_script(item_id: str, db: AsyncSession = Depends(get_db)):
    script = await service.get_bulletin_script(db, item_id)
    if script is None:
        raise HTTPException(status_code=404, detail="Script not found")
    return script


@router.post("/{item_id}/script", response_model=NewsBulletinScriptResponse, status_code=201)
async def create_bulletin_script(
    item_id: str, payload: NewsBulletinScriptCreate, db: AsyncSession = Depends(get_db)
):
    script = await service.create_bulletin_script(db, item_id, payload)
    if script is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    return script


@router.patch("/{item_id}/script", response_model=NewsBulletinScriptResponse)
async def update_bulletin_script(
    item_id: str, payload: NewsBulletinScriptUpdate, db: AsyncSession = Depends(get_db)
):
    script = await service.update_bulletin_script(db, item_id, payload)
    if script is None:
        raise HTTPException(status_code=404, detail="Script not found")
    return script


@router.get("/{item_id}/metadata", response_model=NewsBulletinMetadataResponse)
async def get_bulletin_metadata(item_id: str, db: AsyncSession = Depends(get_db)):
    meta = await service.get_bulletin_metadata(db, item_id)
    if meta is None:
        raise HTTPException(status_code=404, detail="Metadata not found")
    return meta


@router.post("/{item_id}/metadata", response_model=NewsBulletinMetadataResponse, status_code=201)
async def create_bulletin_metadata(
    item_id: str, payload: NewsBulletinMetadataCreate, db: AsyncSession = Depends(get_db)
):
    meta = await service.create_bulletin_metadata(db, item_id, payload)
    if meta is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    return meta


@router.patch("/{item_id}/metadata", response_model=NewsBulletinMetadataResponse)
async def update_bulletin_metadata(
    item_id: str, payload: NewsBulletinMetadataUpdate, db: AsyncSession = Depends(get_db)
):
    meta = await service.update_bulletin_metadata(db, item_id, payload)
    if meta is None:
        raise HTTPException(status_code=404, detail="Metadata not found")
    return meta

@router.get("/{item_id}/selected-news", response_model=List[NewsBulletinSelectedItemWithEnforcementResponse])
async def list_bulletin_selected_items(item_id: str, db: AsyncSession = Depends(get_db)):
    bulletin = await service.get_news_bulletin(db, item_id)
    if bulletin is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    return await service.list_bulletin_selected_items_with_enforcement(db, item_id)


@router.post("/{item_id}/selected-news", response_model=NewsBulletinSelectedItemWithEnforcementResponse, status_code=201)
async def create_bulletin_selected_item(
    item_id: str, payload: NewsBulletinSelectedItemCreate, db: AsyncSession = Depends(get_db)
):
    try:
        result = await service.create_bulletin_selected_item_with_enforcement(db, item_id, payload)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="News item already selected for this bulletin")
    if result is None:
        raise HTTPException(status_code=404, detail="News bulletin or news item not found")
    return result


@router.patch("/{item_id}/selected-news/{selection_id}", response_model=NewsBulletinSelectedItemResponse)
async def update_bulletin_selected_item(
    item_id: str, selection_id: str, payload: NewsBulletinSelectedItemUpdate, db: AsyncSession = Depends(get_db)
):
    bulletin = await service.get_news_bulletin(db, item_id)
    if bulletin is None:
        raise HTTPException(status_code=404, detail="News bulletin not found")
    result = await service.update_bulletin_selected_item(db, selection_id, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="Selected item not found")
    return result
