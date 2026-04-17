"""
Platform post router — Faz 9 + Phase Final F2 ownership guard.

Endpoints:
  POST /posts                    — Yeni gonderi taslagi olustur (owner-only)
  GET  /posts                    — Gonderileri filtreli listele (owner-scoped)
  GET  /posts/stats              — Gonderi istatistikleri (owner-scoped)
  GET  /posts/capability         — Platform delivery capability
  GET  /posts/{post_id}          — Gonderi detayi (owner or admin)
  PATCH /posts/{post_id}         — Taslak gonderiyi guncelle (owner or admin)
  POST /posts/{post_id}/submit   — Gonderiyi gonderim icin isaretle (owner or admin)
  DELETE /posts/{post_id}        — Taslak gonderiyi sil (owner or admin)

Ownership model: PlatformPost is scoped via its channel_profile_id → ChannelProfile.user_id.
The legacy `user_id` query parameter on submit is removed; the caller is
identified via UserContext.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import UserContext, get_current_user_context, ensure_owner_or_admin
from app.db.models import ChannelProfile, PlatformPost
from app.db.session import get_db
from app.posts import service
from app.posts.schemas import (
    PlatformPostResponse,
    PostCreateRequest,
    PostUpdateRequest,
    PostSubmitResult,
)

router = APIRouter(prefix="/posts", tags=["Posts"])


# ---------------------------------------------------------------------------
# Ownership helpers
# ---------------------------------------------------------------------------

async def _scope_channel_ids(db: AsyncSession, ctx: UserContext) -> Optional[List[str]]:
    if ctx.is_admin:
        return None
    result = await db.execute(
        select(ChannelProfile.id).where(ChannelProfile.user_id == ctx.user_id)
    )
    return [row[0] for row in result.all()]


async def _enforce_channel_ownership(
    db: AsyncSession, ctx: UserContext, channel_profile_id: Optional[str]
) -> None:
    if ctx.is_admin or channel_profile_id is None:
        return
    cp = await db.get(ChannelProfile, channel_profile_id)
    if cp is None:
        raise HTTPException(status_code=404, detail="Channel profile not found")
    ensure_owner_or_admin(ctx, cp.user_id, resource_label="channel")


async def _enforce_post_ownership(
    db: AsyncSession, ctx: UserContext, post: PlatformPost
) -> None:
    if ctx.is_admin:
        return
    if post.channel_profile_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu gonderiye erisim yetkiniz yok",
        )
    cp = await db.get(ChannelProfile, post.channel_profile_id)
    owner = cp.user_id if cp else None
    ensure_owner_or_admin(ctx, owner, resource_label="post")


# ---------------------------------------------------------------------------
# Create (owner-only)
# ---------------------------------------------------------------------------

@router.post("", response_model=PlatformPostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    body: PostCreateRequest,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Yeni gonderi taslagi olustur (caller must own the target channel)."""
    await _enforce_channel_ownership(db, ctx, body.channel_profile_id)

    post = await service.create_post(
        db,
        platform=body.platform,
        body=body.body,
        post_type=body.post_type,
        title=body.title,
        channel_profile_id=body.channel_profile_id,
        platform_connection_id=body.platform_connection_id,
        content_project_id=body.content_project_id,
        publish_record_id=body.publish_record_id,
        scheduled_for=body.scheduled_for,
    )
    return post


# ---------------------------------------------------------------------------
# List (owner-scoped)
# ---------------------------------------------------------------------------

@router.get("", response_model=List[PlatformPostResponse])
async def list_posts(
    channel_profile_id: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    post_status: Optional[str] = Query(None, alias="status"),
    post_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Gonderileri filtreli listele — owner-scoped for non-admin."""
    if channel_profile_id is not None:
        await _enforce_channel_ownership(db, ctx, channel_profile_id)
        channel_ids: Optional[List[str]] = [channel_profile_id]
    else:
        channel_ids = await _scope_channel_ids(db, ctx)

    return await service.list_posts(
        db,
        channel_profile_id=None,
        channel_profile_ids=channel_ids,
        platform=platform,
        status=post_status,
        post_type=post_type,
        limit=limit,
        offset=offset,
    )


@router.get("/stats")
async def post_stats(
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Gonderi istatistikleri (caller-scoped for non-admin)."""
    channel_ids = await _scope_channel_ids(db, ctx)
    return await service.get_post_stats(db, channel_profile_ids=channel_ids)


@router.get("/capability")
async def delivery_capability():
    """Platform bazinda gonderi delivery capability (public)."""
    return {
        "capabilities": service.PLATFORM_POST_CAPABILITY,
        "note": "YouTube community post API ucuncu taraf gelistiricilere acik degildir. "
                "Gonderiler taslak olarak kaydedilir, platform API hazir oldugunda gonderim yapilabilir.",
    }


# ---------------------------------------------------------------------------
# Single-resource endpoints
# ---------------------------------------------------------------------------

@router.get("/{post_id}", response_model=PlatformPostResponse)
async def get_post(
    post_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Gonderi detayi (owner or admin)."""
    post = await service.get_post(db, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gonderi bulunamadi.",
        )
    await _enforce_post_ownership(db, ctx, post)
    return post


@router.patch("/{post_id}", response_model=PlatformPostResponse)
async def update_post(
    post_id: str,
    body: PostUpdateRequest,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Taslak gonderiyi guncelle (owner or admin)."""
    existing = await service.get_post(db, post_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gonderi bulunamadi.",
        )
    await _enforce_post_ownership(db, ctx, existing)

    post = await service.update_post(
        db,
        post_id=post_id,
        title=body.title,
        body=body.body,
        scheduled_for=body.scheduled_for,
    )
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gonderi bulunamadi veya duzenlenemez (sadece taslaklar duzenlenebilir).",
        )
    return post


@router.post("/{post_id}/submit", response_model=PostSubmitResult)
async def submit_post(
    post_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Gonderiyi gonderim icin isaretle. EngagementTask olusturur (owner or admin)."""
    post = await service.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Gonderi bulunamadi.")
    await _enforce_post_ownership(db, ctx, post)

    # Caller id is the authenticated user; admin acts on behalf of the owner.
    if ctx.is_admin and post.channel_profile_id:
        cp = await db.get(ChannelProfile, post.channel_profile_id)
        effective_user_id = cp.user_id if cp else ctx.user_id
    else:
        effective_user_id = ctx.user_id

    result = await service.submit_post(db, post_id, effective_user_id)
    return PostSubmitResult(**result)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Taslak gonderiyi sil (owner or admin)."""
    existing = await service.get_post(db, post_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gonderi bulunamadi.",
        )
    await _enforce_post_ownership(db, ctx, existing)

    deleted = await service.delete_post(db, post_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gonderi bulunamadi veya silinemez (sadece taslaklar silinebilir).",
        )
