"""
Asset Router — M19-A + M20-A + M21-A + Phase Final F2.2 ownership guard.

Asset index + operasyon + upload endpoint'leri.

Endpoint'ler:
  GET    /assets                     : Asset listesi (filtre + sayfalama)
  POST   /assets/upload              : Dosya yukle  (admin-only)
  POST   /assets/refresh             : Workspace taramasini tetikle  (admin-only)
  GET    /assets/{id}                : Tekil asset detayi
  DELETE /assets/{id}                : Asset sil  (admin-only)
  POST   /assets/{id}/reveal         : Asset konum bilgisi
  GET    /assets/{id}/allowed-actions : Izin verilen aksiyonlar

Ownership:
  - Asset library diskte, workspace altinda global admin yonetimli bir
    havuzdur. Asset kayitlarinda per-user sahiplik yok.
  - Read endpoint'leri (`list`, `get`, `reveal`, `allowed-actions`) panel
    visibility + authenticated user gate'ine baglidir.
  - Write endpoint'leri (`upload`, `refresh`, `delete`) `require_admin`
    ile kilitlidir. Non-admin kullanici POST/DELETE yapamaz.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form

from app.auth.dependencies import require_admin
from app.db.session import get_db
from app.visibility.dependencies import require_visible
from app.assets import service
from app.assets.schemas import (
    AssetListResponse,
    AssetItem,
    AssetRefreshResponse,
    AssetDeleteResponse,
    AssetRevealResponse,
    AssetAllowedActionsResponse,
    AssetUploadResponse,
)
from app.audit.service import write_audit_log

router = APIRouter(
    prefix="/assets",
    tags=["assets"],
    dependencies=[Depends(require_visible("panel:assets"))],
)

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


@router.post(
    "/upload",
    response_model=AssetUploadResponse,
    status_code=201,
    dependencies=[Depends(require_admin)],
)
async def upload_asset(
    file: UploadFile = File(..., description="Yuklenecek dosya"),
    asset_type: Optional[str] = Form(None, description="Opsiyonel asset turu ipucu"),
    session=Depends(get_db),
):
    """
    Workspace'e yeni asset dosyasi yukler.

    Hedef: workspace/_uploads/artifacts/{filename}
    Guvenlik: dosya adi sanitization, yasakli uzanti, boyut siniri, conflict handling.
    Sessiz overwrite yapmaz — ayni isimde dosya varsa benzersiz isim uretir.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Dosya adi gerekli")

    if asset_type and asset_type not in _VALID_ASSET_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Gecersiz asset_type: '{asset_type}'. Gecerli degerler: {list(_VALID_ASSET_TYPES)}",
        )

    # Dosya icerigini oku
    content = await file.read()

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Bos dosya yuklenemez")

    if len(content) > service.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Dosya boyutu siniri asildi (maks {service.MAX_UPLOAD_SIZE // (1024*1024)} MB)",
        )

    result = await service.upload_asset(
        filename=file.filename,
        content=content,
        asset_type_hint=asset_type,
    )

    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Gecersiz dosya adi (yasakli karakter, uzanti veya hidden dosya)",
        )

    await write_audit_log(
        db=session,
        action="asset.upload",
        entity_type="asset",
        entity_id=result["asset_id"],
        details={
            "filename": result["name"],
            "size_bytes": result["size_bytes"],
            "asset_type": result["asset_type"],
        },
    )
    return result


@router.post(
    "/refresh",
    response_model=AssetRefreshResponse,
    dependencies=[Depends(require_admin)],
)
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


@router.delete(
    "/{asset_id:path}",
    response_model=AssetDeleteResponse,
    dependencies=[Depends(require_admin)],
)
async def delete_asset(asset_id: str, session=Depends(get_db)):
    """Workspace altindaki bir asset dosyasini siler."""
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
