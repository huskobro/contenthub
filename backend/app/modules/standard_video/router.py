"""HTTP router for the Standard Video module."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import UserContext, get_current_user_context
from app.db.session import get_db
from app.publish.ownership import ensure_content_project_ownership
from app.visibility.dependencies import require_visible, get_active_user_id
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

from app.modules.standard_video.subtitle_presets import (
    SUBTITLE_PRESETS,
    DEFAULT_PRESET_ID,
    VALID_PRESET_IDS,
)

router = APIRouter(prefix="/modules/standard-video", tags=["standard-video"], dependencies=[Depends(require_visible("panel:standard-video"))])


@router.get("/subtitle-presets")
async def list_subtitle_presets() -> dict:
    """
    Kullanılabilir altyazı stil preset listesini döner.

    Her preset şu alanları içerir:
      - preset_id, label, font_size, font_weight, text_color, active_color,
        background, outline_width, outline_color, line_height
      - is_default: varsayılan preset mi?
      - timing_note: timing moduna göre highlight davranışı açıklaması.

    Bu endpoint subtitle-specific preview UI'ın veri kaynağıdır (M4-C3).
    M6 genel preview altyapısına dahil değildir.
    """
    presets = []
    for preset_id in VALID_PRESET_IDS:
        preset = SUBTITLE_PRESETS[preset_id]
        presets.append({
            "preset_id": preset.preset_id,
            "label": preset.label,
            "font_size": preset.font_size,
            "font_weight": preset.font_weight,
            "text_color": preset.text_color,
            "active_color": preset.active_color,
            "background": preset.background,
            "outline_width": preset.outline_width,
            "outline_color": preset.outline_color,
            "line_height": preset.line_height,
            "is_default": preset.preset_id == DEFAULT_PRESET_ID,
            # Timing notu: UI stil kartında gösterilir
            "timing_note": (
                "Whisper kelime-düzeyi zamanlama ile tam karaoke highlight aktif olur. "
                "Cursor (degrade) modda: yalnızca satır seviyesinde renk uygulanır."
            ),
        })
    return {
        "presets": presets,
        "default_preset_id": DEFAULT_PRESET_ID,
        # Subtitle-specific preview scope notu — M4-C3 kapsam sınırı
        "preview_scope": "subtitle_style_only",
    }


@router.get("")
async def list_standard_videos(
    status: Optional[str] = Query(None, description="Durum filtresi"),
    search: Optional[str] = Query(None, description="Baslik/konu arama (case-insensitive)"),
    limit: int = Query(100, ge=1, le=500, description="Sayfalama limiti"),
    offset: int = Query(0, ge=0, description="Sayfalama offset'i"),
    include_test_data: bool = Query(False, description="Test/demo kayıtlarını dahil et (varsayılan: False)"),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_standard_videos_with_artifact_summary(
        db, status=status, search=search, limit=limit, offset=offset, include_test_data=include_test_data,
    )


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


class StartProductionResponse(BaseModel):
    job_id: str
    video_id: str
    video_status: str
    message: str


@router.post("/{item_id}/start-production", response_model=StartProductionResponse)
async def start_production(
    item_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Depends(get_active_user_id),
    ctx: UserContext = Depends(get_current_user_context),
):
    """
    Standard Video uretim pipeline'ini baslatir.

    Preconditions:
      - Video kaydi mevcut olmali
      - Video.status 'rendering' / 'completed' / 'published' olmamali

    Ownership (PHASE AE tamamlama):
      StandardVideo kaydinda dogrudan owner alani yok; bu yuzden kayit
      bir content_project'e bagli ise (user wizard'undan geldiyse) projenin
      sahipligi zorla kontrol edilir. Projesi yok (orphan) ise admin
      disinda kimse uretim baslatamaz.

    Job olusturur, dispatcher'a gonderir, video.status = "rendering" yapar.
    Pattern: news_bulletin.router.start_production_endpoint ile ayni.
    """
    # PHASE AE tamamlama: content_project uzerinden ownership gate.
    video_row = await service.get_standard_video(db, item_id)
    if video_row is None:
        raise HTTPException(status_code=404, detail="Standard video bulunamadi")
    if video_row.content_project_id:
        await ensure_content_project_ownership(db, video_row.content_project_id, ctx)
    elif not ctx.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Bu video orphan (proje yok); yalnizca admin uretim baslatabilir",
        )

    dispatcher = getattr(request.app.state, "job_dispatcher", None)
    if dispatcher is None:
        raise HTTPException(status_code=503, detail="JobDispatcher hazir degil.")

    session_factory = getattr(request.app.state, "session_factory", None)
    if session_factory is None:
        # Fallback: get_db session factory'den kullan
        from app.db.session import AsyncSessionLocal
        session_factory = AsyncSessionLocal

    try:
        result = await service.start_production(
            db=db,
            video_id=item_id,
            dispatcher=dispatcher,
            session_factory=session_factory,
            owner_id=user_id,
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))

    return StartProductionResponse(**result)


@router.post("/{item_id}/clone", response_model=StandardVideoResponse, status_code=201)
async def clone_standard_video(
    item_id: str,
    db: AsyncSession = Depends(get_db),
) -> StandardVideoResponse:
    """Mevcut bir Standard Video kaydini klonlar. Yeni bagimsiz draft kayit olusturur."""
    clone = await service.clone_standard_video(db, item_id)
    if clone is None:
        raise HTTPException(status_code=404, detail="Source standard video not found")
    return clone


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
