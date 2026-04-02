from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from .schemas import ScanCreate, ScanUpdate, ScanResponse
from . import service

router = APIRouter(prefix="/source-scans", tags=["source-scans"])


@router.get("", response_model=List[ScanResponse])
async def list_scans(
    source_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    scan_mode: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_scans_with_source_summary(db, source_id=source_id, status=status, scan_mode=scan_mode)


@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    scan = await service.get_scan(db, scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.post("", response_model=ScanResponse, status_code=201)
async def create_scan(payload: ScanCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_scan(db, payload)


@router.patch("/{scan_id}", response_model=ScanResponse)
async def update_scan(
    scan_id: str, payload: ScanUpdate, db: AsyncSession = Depends(get_db)
):
    scan = await service.update_scan(db, scan_id, payload)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan
