from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.visibility.dependencies import require_visible
from .schemas import SourceCreate, SourceUpdate, SourceResponse
from . import service

router = APIRouter(prefix="/sources", tags=["sources"], dependencies=[Depends(require_visible("panel:sources"))])


@router.get("", response_model=List[SourceResponse])
async def list_sources(
    source_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    scan_mode: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_sources_with_scan_summary(db, source_type=source_type, status=status, scan_mode=scan_mode)


@router.get("/{source_id}", response_model=SourceResponse)
async def get_source(source_id: str, db: AsyncSession = Depends(get_db)):
    source = await service.get_source(db, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


@router.post("", response_model=SourceResponse, status_code=201)
async def create_source(payload: SourceCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_source(db, payload)


@router.patch("/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: str, payload: SourceUpdate, db: AsyncSession = Depends(get_db)
):
    source = await service.update_source(db, source_id, payload)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    return source
