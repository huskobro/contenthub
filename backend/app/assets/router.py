"""
Asset Router — M19-A + M20-A.

Asset index endpoint'leri + operasyon endpoint'leri.
Veri kaynagi: workspace dizini disk taramasi.
DB'ye yazmaz, migration gerektirmez.

Endpoint'ler:
  GET    /assets                    : Asset listesi (filtre + sayfalama)
  POST   /assets/refresh            : Workspace disk taramasini yeniden tetikle
  GET    /assets/{id}               : Tekil asset detayi
  DELETE /assets/{id}               : Asset sil (kontrollü, güvenli)
  POST   /assets/{id}/reveal        : Asset konum bilgisi dondur
  GET    /assets/{id}/allowed-actions: Izin verilen aksiyonlar
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException

from app.db.session import get_db
from app.assets import service
from app.assets.schemas import (
    AssetListResponse,
    AssetItem,
    AssetRefreshResponse,
    AssetDeleteResponse,
    AssetRevealResponse,
    AssetAllowedActionsResponse,
)
from app.audit.service import write_audit_log

router = APIRouter(prefix="/assets", tags=["assets"])

_VALID_ASSET_TYPES = ("audio", "video", "image", "data", "text", "subtitle", "document", "other")


@router.get("", response_model=AssetListResponse)
async def list_assets(
    asset_type: Optional[str] = Query(None, description="Asset turu filtresi"),
    search: Optional[str] = Query(None, description="Dosya adinda arama"),
    job_id: Optional[str] = Query(None, description="Belirli bir job'a ait asset'ler"),
    limit: int = Query(100, ge=1, le=500, description="Sayfalama limiti"),
    offset: int = Query(0, ge=0, description="Sayfalama offset'i"),
    session=Depends(get_db),
):
    """Workspace'ten asset listesi dondurur."""
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


@router.post("/refresh", response_model=AssetRefreshResponse)
async def refresh_assets(session=Depends(get_db)):
    """Workspace disk taramasini yeniden tetikler."""
    result = await service.refresh_assets(session=session)
    await write_audit_log(
        db=session,
        action="asset.refresh",
        entity_type="asset",
        entity_id=None,
        details={"total_scanned": result["total_scanned"]},
    )
    return result


@router.get("/{asset_id:path}/allowed-actions", response_model=AssetAllowedActionsResponse)
async def get_allowed_actions(asset_id: str):
    """Bu asset icin izin verilen aksiyonlari listeler."""
    result = service.get_allowed_actions(asset_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Asset bulunamadi veya gecersiz path")
    return result


@router.post("/{asset_id:path}/reveal", response_model=AssetRevealResponse)
async def reveal_asset(asset_id: str, session=Depends(get_db)):
    """Asset'in konum bilgisini guvenli metadata olarak dondurur."""
    result = service.reveal_asset(asset_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Asset bulunamadi veya gecersiz path")
    await write_audit_log(
        db=session,
        action="asset.reveal",
        entity_type="asset",
        entity_id=asset_id,
        details={"exists": result["exists"]},
    )
    return result


@router.delete("/{asset_id:path}", response_model=AssetDeleteResponse)
async def delete_asset(asset_id: str, session=Depends(get_db)):
    """
    Workspace altindaki bir asset dosyasini siler.
    Path traversal koruması aktif.
    """
    # Once dosya var mi kontrol et
    validated = service._validate_asset_path(asset_id)
    if validated is None:
        raise HTTPException(status_code=400, detail="Gecersiz asset path (guvenlik reddi)")

    result = await service.delete_asset(session=session, asset_id=asset_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Asset bulunamadi")

    await write_audit_log(
        db=session,
        action="asset.delete",
        entity_type="asset",
        entity_id=asset_id,
        details={"deleted_file": asset_id},
    )
    return result


@router.get("/{asset_id:path}", response_model=AssetItem)
async def get_asset(
    asset_id: str,
    session=Depends(get_db),
):
    """Tekil asset detayi dondurur."""
    result = await service.get_asset_by_id(session=session, asset_id=asset_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Asset bulunamadi")
    return result
