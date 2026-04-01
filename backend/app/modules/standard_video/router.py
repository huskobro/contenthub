"""HTTP router for the Standard Video module."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.standard_video import service
from app.modules.standard_video.schemas import (
    StandardVideoCreate,
    StandardVideoUpdate,
    StandardVideoResponse,
)

router = APIRouter(prefix="/modules/standard-video", tags=["standard-video"])


@router.get("", response_model=list[StandardVideoResponse])
async def list_standard_videos(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[StandardVideoResponse]:
    items = await service.list_standard_videos(db, status=status)
    return items


@router.get("/{item_id}", response_model=StandardVideoResponse)
async def get_standard_video(
    item_id: str,
    db: AsyncSession = Depends(get_db),
) -> StandardVideoResponse:
    item = await service.get_standard_video(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Standard video not found")
    return item


@router.post("", response_model=StandardVideoResponse, status_code=201)
async def create_standard_video(
    payload: StandardVideoCreate,
    db: AsyncSession = Depends(get_db),
) -> StandardVideoResponse:
    return await service.create_standard_video(db, payload)


@router.patch("/{item_id}", response_model=StandardVideoResponse)
async def update_standard_video(
    item_id: str,
    payload: StandardVideoUpdate,
    db: AsyncSession = Depends(get_db),
) -> StandardVideoResponse:
    item = await service.update_standard_video(db, item_id, payload)
    if item is None:
        raise HTTPException(status_code=404, detail="Standard video not found")
    return item
