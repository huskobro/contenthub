"""
Engagement Task router — Faz 2 + Phase Final F2 ownership guard.

Endpoints:
  GET    /engagement-tasks            — Listele (owner-scoped; admin tum kayitlari gorur)
  POST   /engagement-tasks            — Olustur (caller kendi user_id'sine zorlanir)
  GET    /engagement-tasks/{task_id}  — Detay (owner or admin)
  PATCH  /engagement-tasks/{task_id}  — Guncelle (owner or admin)

Ownership modeli:
  - `EngagementTask.user_id` dogrudan FK (users.id).
  - Liste query'si `apply_user_scope` ile non-admin icin user_id filtre edilir.
  - Create'de non-admin caller kendi id'si disinda bir `user_id` set edemez (spoof
    koruma). Admin `user_id` parametresini kullanabilir.
  - `channel_profile_id` ikinci dogrulama katmani: non-admin caller sadece sahibi
    oldugu kanallara task baglayabilir.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import (
    UserContext,
    apply_user_scope,
    ensure_owner_or_admin,
    get_current_user_context,
)
from app.db.models import ChannelProfile, EngagementTask
from app.db.session import get_db
from app.engagement import service
from app.engagement.schemas import (
    EngagementTaskCreate,
    EngagementTaskResponse,
    EngagementTaskUpdate,
)

router = APIRouter(prefix="/engagement-tasks", tags=["Engagement Tasks"])


# ---------------------------------------------------------------------------
# Ownership helpers
# ---------------------------------------------------------------------------


async def _enforce_channel_ownership(
    db: AsyncSession, ctx: UserContext, channel_profile_id: Optional[str]
) -> None:
    """Non-admin caller'in `channel_profile_id` sahibi olmasini zorunlu kilar."""
    if ctx.is_admin or channel_profile_id is None:
        return
    cp = await db.get(ChannelProfile, channel_profile_id)
    if cp is None:
        raise HTTPException(status_code=404, detail="Channel profile not found")
    ensure_owner_or_admin(ctx, cp.user_id, resource_label="channel")


def _enforce_task_ownership(ctx: UserContext, task: EngagementTask) -> None:
    if ctx.is_admin:
        return
    ensure_owner_or_admin(ctx, task.user_id, resource_label="engagement task")


# ---------------------------------------------------------------------------
# List (owner-scoped)
# ---------------------------------------------------------------------------


@router.get("", response_model=List[EngagementTaskResponse])
async def list_engagement_tasks(
    user_id: Optional[str] = Query(None),
    channel_profile_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Listele — owner-scoped. Non-admin caller `user_id` parametresi gecse bile
    kendi id'si ile ovveride edilir (spoof koruma).
    """
    # Spoof koruma: non-admin asla baska bir user_id goremez.
    effective_user_id: Optional[str]
    if ctx.is_admin:
        effective_user_id = user_id  # admin istedigi kullaniciyi filtreleyebilir
    else:
        effective_user_id = ctx.user_id

    if channel_profile_id is not None:
        await _enforce_channel_ownership(db, ctx, channel_profile_id)

    return await service.list_engagement_tasks(
        db,
        caller_ctx=ctx,
        user_id=effective_user_id,
        channel_profile_id=channel_profile_id,
        type=type,
        status=status,
        skip=skip,
        limit=limit,
    )


# ---------------------------------------------------------------------------
# Create (caller coerced)
# ---------------------------------------------------------------------------


@router.post(
    "", response_model=EngagementTaskResponse, status_code=status.HTTP_201_CREATED
)
async def create_engagement_task(
    payload: EngagementTaskCreate,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Olustur — non-admin caller `user_id` alanini kendi id'si disinda
    dolduramaz. Kanal sahipligi de dogrulanir.
    """
    # Spoof koruma: non-admin icin user_id her durumda ctx.user_id.
    if not ctx.is_admin and payload.user_id != ctx.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Baska bir kullanici adina engagement task olusturamazsiniz",
        )

    await _enforce_channel_ownership(db, ctx, payload.channel_profile_id)

    return await service.create_engagement_task(db, payload)


# ---------------------------------------------------------------------------
# Single-resource (owner or admin)
# ---------------------------------------------------------------------------


@router.get("/{task_id}", response_model=EngagementTaskResponse)
async def get_engagement_task(
    task_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    task = await service.get_engagement_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Etkilesim gorevi bulunamadi.")
    _enforce_task_ownership(ctx, task)
    return task


@router.patch("/{task_id}", response_model=EngagementTaskResponse)
async def update_engagement_task(
    task_id: str,
    payload: EngagementTaskUpdate,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    task = await service.get_engagement_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Etkilesim gorevi bulunamadi.")
    _enforce_task_ownership(ctx, task)

    updated = await service.update_engagement_task(db, task_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Etkilesim gorevi bulunamadi.")
    return updated
