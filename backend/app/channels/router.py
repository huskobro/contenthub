"""
Channel Profile router — Faz 2 + PHASE X (URL-only create + ownership).

Guvenlik kilidi:
  - Tum endpoint'lerde `get_current_user_context` zorunlu (zaten api router
    `require_user` dependency'si ile korunuyor; burada ek olarak context alinir).
  - Non-admin user: yalnizca kendi channel profillerini gorur / duzenler / siler.
  - Admin: her seyi gorur ve duzenleyebilir.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import (
    UserContext,
    ensure_owner_or_admin,
    get_current_user_context,
)
from app.channels import service
from app.channels.schemas import (
    ChannelImportConfirmRequest,
    ChannelImportPreview,
    ChannelImportPreviewRequest,
    ChannelProfileCreate,
    ChannelProfileCreateFromURL,
    ChannelProfileResponse,
    ChannelProfileUpdate,
)
from app.db.session import get_db

router = APIRouter(prefix="/channel-profiles", tags=["Channel Profiles"])


# ---------------------------------------------------------------------------
# LIST — user: own channels; admin: all (optional user_id filter)
# ---------------------------------------------------------------------------


@router.get("", response_model=List[ChannelProfileResponse])
async def list_channel_profiles(
    user_id: Optional[str] = Query(
        None, description="Admin only — list another user's channels"
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    # Non-admin: user_id filter override YOK — daima kendi verisi
    effective_user_id = user_id if ctx.is_admin else ctx.user_id
    return await service.list_channel_profiles(
        db, user_id=effective_user_id, skip=skip, limit=limit
    )


# ---------------------------------------------------------------------------
# CREATE (legacy — admin / dahili kullanim icin)
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=ChannelProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_channel_profile(
    payload: ChannelProfileCreate,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    # Non-admin kullanici kendinden baska user_id giremez
    if not ctx.is_admin and payload.user_id != ctx.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Baska kullanici adina kanal olusturamazsiniz",
        )
    try:
        return await service.create_channel_profile(db, payload)
    except Exception as exc:
        if "UNIQUE" in str(exc).upper():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bu user_id + channel_slug kombinasyonu zaten mevcut.",
            )
        raise


# ---------------------------------------------------------------------------
# CREATE FROM URL — PHASE X user-facing flow
# ---------------------------------------------------------------------------


@router.post(
    "/from-url",
    response_model=ChannelProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_channel_profile_from_url(
    payload: ChannelProfileCreateFromURL,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Sadece URL ile kanal ekleme.

    - Kullanici yalnizca `source_url` (+ optional language / notes) gonderir.
    - Sistem URL'i parse eder, metadata cekmeyi dener, kanali kaydeder.
    - Metadata fetch basarisiz olsa da (partial) kayit acilir; honest state tutulur.
    - Ayni user icin ayni normalized_url ikinci kez eklenemez (409).
    """
    try:
        return await service.create_channel_profile_from_url(
            db, user_id=ctx.user_id, payload=payload
        )
    except ValueError as exc:
        msg = str(exc)
        if "zaten eklenmis" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=msg)


# ---------------------------------------------------------------------------
# PREVIEW / CONFIRM — Branding Center URL onboarding (no DB row on preview)
# ---------------------------------------------------------------------------


@router.post(
    "/import-preview",
    response_model=ChannelImportPreview,
)
async def import_preview(
    payload: ChannelImportPreviewRequest,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Returns a no-DB-row preview + signed preview_token. UI decides
    whether to confirm. Preview is scoped to the current user — a
    token issued here cannot be redeemed by another user."""
    try:
        return await service.preview_channel_import(
            db, user_id=ctx.user_id, payload=payload
        )
    except ValueError as exc:
        msg = str(exc)
        if "zaten eklenmis" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=msg
        )


@router.post(
    "/import-confirm",
    response_model=ChannelProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def import_confirm(
    payload: ChannelImportConfirmRequest,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Confirms the preview and creates the ChannelProfile. Token must
    be issued for this user AND the same normalized URL — otherwise
    422. This is where the real DB row is created."""
    try:
        return await service.confirm_channel_import(
            db, user_id=ctx.user_id, payload=payload
        )
    except ValueError as exc:
        msg = str(exc)
        if "zaten eklenmis" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=msg
        )


# ---------------------------------------------------------------------------
# GET / PATCH / DELETE — ownership enforcement
# ---------------------------------------------------------------------------


@router.get("/{profile_id}", response_model=ChannelProfileResponse)
async def get_channel_profile(
    profile_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_channel_profile(db, profile_id)
    if not result:
        raise HTTPException(status_code=404, detail="Kanal profili bulunamadi.")
    ensure_owner_or_admin(
        ctx, result.user_id, resource_label="Kanal profili"
    )
    return result


@router.patch("/{profile_id}", response_model=ChannelProfileResponse)
async def update_channel_profile(
    profile_id: str,
    payload: ChannelProfileUpdate,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    existing = await service.get_channel_profile(db, profile_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Kanal profili bulunamadi.")
    ensure_owner_or_admin(
        ctx, existing.user_id, resource_label="Kanal profili"
    )
    result = await service.update_channel_profile(db, profile_id, payload)
    return result


@router.delete("/{profile_id}", response_model=ChannelProfileResponse)
async def delete_channel_profile(
    profile_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete — status='archived'."""
    existing = await service.get_channel_profile(db, profile_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Kanal profili bulunamadi.")
    ensure_owner_or_admin(
        ctx, existing.user_id, resource_label="Kanal profili"
    )
    result = await service.delete_channel_profile(db, profile_id)
    return result


# ---------------------------------------------------------------------------
# PHASE AD — Reimport (stuck-at-partial recovery)
# ---------------------------------------------------------------------------


@router.post("/{profile_id}/reimport", response_model=ChannelProfileResponse)
async def reimport_channel_profile_endpoint(
    profile_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Re-run metadata fetch for a ChannelProfile that landed in `partial`
    state (or simply to refresh a profile).

    Ownership: yalnizca profil sahibi (veya admin) reimport tetikleyebilir.
    User-edit alanlari (profile_name, notes, default_language) korunur;
    sadece fetch sonucu alanlari (title, avatar, external ids, handle,
    import_status, import_error, last_import_at) guncellenir.
    """
    existing = await service.get_channel_profile(db, profile_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Kanal profili bulunamadi.")
    ensure_owner_or_admin(
        ctx, existing.user_id, resource_label="Kanal profili"
    )
    try:
        result = await service.reimport_channel_profile(db, profile_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    if not result:
        raise HTTPException(status_code=404, detail="Kanal profili bulunamadi.")
    return result
