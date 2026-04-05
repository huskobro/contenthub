"""
Asset Router — M19-A.

Salt-okunur asset index endpoint'leri.
Veri kaynagi: workspace dizini disk taramasi.
DB'ye yazmaz, migration gerektirmez.

Endpoint'ler:
  GET /assets       : Asset listesi (filtre + sayfalama)
  GET /assets/{id}  : Tekil asset detayi
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException

from app.db.session import get_db
from app.assets import service
from app.assets.schemas import AssetListResponse, AssetItem

router = APIRouter(prefix="/assets", tags=["assets"])

_VALID_ASSET_TYPES = ("audio", "video", "image", "data", "text", "subtitle", "document", "other")


@router.get("", response_model=AssetListResponse)
async def list_assets(
    asset_type: Optional[str] = Query(None, description="Asset turu filtresi: audio, video, image, data, text, subtitle, document, other"),
    search: Optional[str] = Query(None, description="Dosya adinda arama (case-insensitive)"),
    job_id: Optional[str] = Query(None, description="Belirli bir job'a ait asset'ler"),
    limit: int = Query(100, ge=1, le=500, description="Sayfalama limiti"),
    offset: int = Query(0, ge=0, description="Sayfalama offset'i"),
    session=Depends(get_db),
):
    """
    Workspace'ten asset listesi dondurur.

    Disk taramasi ile uretilir, DB'ye yazmaz.
    """
    if asset_type and asset_type not in _VALID_ASSET_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Gecersiz asset_type: '{asset_type}'. Gecerli degerler: {list(_VALID_ASSET_TYPES)}",
        )
    return await service.list_assets(
        session=session,
        asset_type=asset_type,
        search=search,
        job_id=job_id,
        limit=limit,
        offset=offset,
    )


@router.get("/{asset_id:path}", response_model=AssetItem)
async def get_asset(
    asset_id: str,
    session=Depends(get_db),
):
    """
    Tekil asset detayi dondurur.

    asset_id formati: {job_id}/{subdir}/{filename}
    """
    result = await service.get_asset_by_id(session=session, asset_id=asset_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Asset bulunamadi")
    return result
