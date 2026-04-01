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
    StandardVideoScriptCreate,
    StandardVideoScriptUpdate,
    StandardVideoScriptResponse,
    StandardVideoMetadataCreate,
    StandardVideoMetadataUpdate,
    StandardVideoMetadataResponse,
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


# ---------------------------------------------------------------------------
# Script endpoints
# ---------------------------------------------------------------------------

async def _require_video(item_id: str, db: AsyncSession) -> None:
    item = await service.get_standard_video(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Standard video not found")


@router.get("/{item_id}/script", response_model=StandardVideoScriptResponse)
async def get_script(
    item_id: str,
    db: AsyncSession = Depends(get_db),
) -> StandardVideoScriptResponse:
    await _require_video(item_id, db)
    script = await service.get_script_for_video(db, item_id)
    if script is None:
        raise HTTPException(status_code=404, detail="Script not found for this video")
    return script


@router.post("/{item_id}/script", response_model=StandardVideoScriptResponse, status_code=201)
async def create_script(
    item_id: str,
    payload: StandardVideoScriptCreate,
    db: AsyncSession = Depends(get_db),
) -> StandardVideoScriptResponse:
    await _require_video(item_id, db)
    return await service.create_script_for_video(db, item_id, payload)


@router.patch("/{item_id}/script", response_model=StandardVideoScriptResponse)
async def update_script(
    item_id: str,
    payload: StandardVideoScriptUpdate,
    db: AsyncSession = Depends(get_db),
) -> StandardVideoScriptResponse:
    await _require_video(item_id, db)
    script = await service.update_script_for_video(db, item_id, payload)
    if script is None:
        raise HTTPException(status_code=404, detail="Script not found for this video")
    return script


# ---------------------------------------------------------------------------
# Metadata endpoints
# ---------------------------------------------------------------------------

@router.get("/{item_id}/metadata", response_model=StandardVideoMetadataResponse)
async def get_metadata(
    item_id: str,
    db: AsyncSession = Depends(get_db),
) -> StandardVideoMetadataResponse:
    await _require_video(item_id, db)
    meta = await service.get_metadata_for_video(db, item_id)
    if meta is None:
        raise HTTPException(status_code=404, detail="Metadata not found for this video")
    return meta


@router.post("/{item_id}/metadata", response_model=StandardVideoMetadataResponse, status_code=201)
async def create_metadata(
    item_id: str,
    payload: StandardVideoMetadataCreate,
    db: AsyncSession = Depends(get_db),
) -> StandardVideoMetadataResponse:
    await _require_video(item_id, db)
    return await service.create_metadata_for_video(db, item_id, payload)


@router.patch("/{item_id}/metadata", response_model=StandardVideoMetadataResponse)
async def update_metadata(
    item_id: str,
    payload: StandardVideoMetadataUpdate,
    db: AsyncSession = Depends(get_db),
) -> StandardVideoMetadataResponse:
    await _require_video(item_id, db)
    meta = await service.update_metadata_for_video(db, item_id, payload)
    if meta is None:
        raise HTTPException(status_code=404, detail="Metadata not found for this video")
    return meta
