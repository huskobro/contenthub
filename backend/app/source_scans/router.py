from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from .schemas import ScanCreate, ScanUpdate, ScanResponse, ScanExecuteResponse
from . import service
from .scan_engine import execute_rss_scan


class ScanExecuteRequest(BaseModel):
    """
    POST /source-scans/{scan_id}/execute istek gövdesi.

    allow_followup: True → soft dedupe atlanır; hard dedupe korunur.
                   Önceki taramada görülmüş benzer başlıklı haberlerin
                   follow-up takibi için kullanılır.
                   Varsayılan: False (soft dedupe aktif).
    """
    allow_followup: bool = False

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


@router.post("/{scan_id}/execute", response_model=ScanExecuteResponse)
async def execute_scan(
    scan_id: str,
    payload: ScanExecuteRequest = ScanExecuteRequest(),
    db: AsyncSession = Depends(get_db),
):
    """
    Tarama kaydını gerçek zamanlı olarak çalıştırır.

    Yalnızca source_type='rss' desteklenir.
    Tarama senkron olarak tamamlanır; sonuç doğrudan döner.
    SourceScan.status: queued → running → completed | failed
    NewsItem kayıtları status='new' ile oluşturulur.

    allow_followup=True: soft dedupe atlanır (hard dedupe korunur).
    Yanıtta dedupe_details: bastırılan ve follow-up kabul edilen kararlar.
    """
    scan = await service.get_scan(db, scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")

    if scan.status not in ("queued",):
        raise HTTPException(
            status_code=409,
            detail=f"Tarama çalıştırılamaz: mevcut durum '{scan.status}'. Yalnızca 'queued' taramalar çalıştırılabilir.",
        )

    try:
        result = await execute_rss_scan(db, scan_id, allow_followup=payload.allow_followup)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return ScanExecuteResponse(**result)
