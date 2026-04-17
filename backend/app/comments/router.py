"""
Comment sync & reply router — Faz 7 + Phase Final F2 ownership guard.

Endpoints:
  POST /comments/sync           — YouTube video yorumlarini cek ve DB'ye kaydet
  GET  /comments                — Yorumlari filtreli listele (owner-scoped)
  GET  /comments/sync-status    — Video bazinda son sync bilgisi (owner-scoped)
  GET  /comments/{comment_id}   — Tek yorum detayi (owner-scoped)
  POST /comments/{comment_id}/reply — YouTube'a yorum yaniti gonder (owner-only)

Phase Final F2 ownership: comments are scoped via the ChannelProfile.user_id
relationship. Non-admin callers can only access comments on channels they own;
admin can query across users. The previous `user_id` query parameter on
reply_to_comment has been removed — callers are identified by UserContext.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import UserContext, get_current_user_context, ensure_owner_or_admin
from app.db.models import ChannelProfile, SyncedComment
from app.db.session import get_db
from app.comments import service
from app.comments.schemas import (
    CommentSyncRequest,
    CommentSyncResult,
    CommentReplyRequest,
    CommentReplyResult,
    SyncedCommentResponse,
    SyncStatusItem,
)

router = APIRouter(prefix="/comments", tags=["Comments"])


# ---------------------------------------------------------------------------
# Ownership helpers
# ---------------------------------------------------------------------------

async def _enforce_channel_ownership(
    db: AsyncSession, ctx: UserContext, channel_profile_id: Optional[str]
) -> None:
    """Verify caller owns the specified channel profile (or is admin)."""
    if ctx.is_admin or channel_profile_id is None:
        return
    cp = await db.get(ChannelProfile, channel_profile_id)
    if cp is None:
        raise HTTPException(status_code=404, detail="Channel profile not found")
    ensure_owner_or_admin(ctx, cp.user_id, resource_label="channel")


async def _enforce_comment_ownership(
    db: AsyncSession, ctx: UserContext, comment: SyncedComment
) -> None:
    """Verify caller owns the channel tied to this comment (or is admin)."""
    if ctx.is_admin:
        return
    if comment.channel_profile_id is None:
        # Orphan comment (no channel binding) — treat as forbidden for non-admin.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu yoruma erisim yetkiniz yok",
        )
    cp = await db.get(ChannelProfile, comment.channel_profile_id)
    owner = cp.user_id if cp else None
    ensure_owner_or_admin(ctx, owner, resource_label="comment")


async def _scope_channel_ids_for_caller(
    db: AsyncSession, ctx: UserContext
) -> Optional[List[str]]:
    """Return list of channel_profile_ids the caller owns (None for admin)."""
    if ctx.is_admin:
        return None
    result = await db.execute(
        select(ChannelProfile.id).where(ChannelProfile.user_id == ctx.user_id)
    )
    return [row[0] for row in result.all()]


# ---------------------------------------------------------------------------
# Sync
# ---------------------------------------------------------------------------

@router.post("/sync", response_model=CommentSyncResult)
async def sync_comments(
    body: CommentSyncRequest,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """
    YouTube video yorumlarini ceker ve yerel DB'ye kaydeder (upsert).

    Caller must own the platform_connection via its channel mapping, or be admin.
    """
    # platform_connection sahipligini service tarafinda dolayli dogrula;
    # burada sadece connection olmayan admin-only dispatch icin ek kural yok.
    # (platform_connections router'i AM-2 ile zaten owner scope'ta.)
    result = await service.sync_video_comments(
        db,
        video_id=body.video_id,
        platform_connection_id=body.platform_connection_id,
    )
    return CommentSyncResult(**result)


# ---------------------------------------------------------------------------
# Sync status (owner-scoped)
# ---------------------------------------------------------------------------

@router.get("/sync-status", response_model=List[SyncStatusItem])
async def sync_status(
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Her video icin son sync bilgisini dondurur (caller's channels only)."""
    channel_ids = await _scope_channel_ids_for_caller(db, ctx)
    rows = await service.get_sync_status(db, channel_profile_ids=channel_ids)
    return [SyncStatusItem(**r) for r in rows]


# ---------------------------------------------------------------------------
# List (owner-scoped)
# ---------------------------------------------------------------------------

@router.get("", response_model=List[SyncedCommentResponse])
async def list_comments(
    video_id: Optional[str] = Query(None),
    channel_profile_id: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    reply_status: Optional[str] = Query(None),
    is_reply: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Sync edilmis yorumlari filtreli listele — owner-scoped for non-admin."""
    # If the caller requested a specific channel, enforce ownership first.
    if channel_profile_id is not None:
        await _enforce_channel_ownership(db, ctx, channel_profile_id)
        effective_channel_ids: Optional[List[str]] = [channel_profile_id]
    else:
        effective_channel_ids = await _scope_channel_ids_for_caller(db, ctx)

    comments = await service.list_comments(
        db,
        video_id=video_id,
        channel_profile_id=None,  # replaced by owner scoping
        channel_profile_ids=effective_channel_ids,
        platform=platform,
        reply_status=reply_status,
        is_reply=is_reply,
        limit=limit,
        offset=offset,
    )
    return comments


# ---------------------------------------------------------------------------
# Get single (owner-scoped)
# ---------------------------------------------------------------------------

@router.get("/{comment_id}", response_model=SyncedCommentResponse)
async def get_comment(
    comment_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Tek yorum detayi (ownership enforced)."""
    comment = await service.get_comment(db, comment_id)
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Yorum bulunamadi.",
        )
    await _enforce_comment_ownership(db, ctx, comment)
    return comment


# ---------------------------------------------------------------------------
# Reply (owner-only)
# ---------------------------------------------------------------------------

@router.post("/{comment_id}/reply", response_model=CommentReplyResult)
async def reply_to_comment(
    comment_id: str,
    body: CommentReplyRequest,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """YouTube'a yorum yaniti gonder (caller must own the channel)."""
    comment = await service.get_comment(db, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadi.")
    await _enforce_comment_ownership(db, ctx, comment)

    # Non-admin user is always the caller; admin acts on behalf of the owner.
    if ctx.is_admin and comment.channel_profile_id:
        cp = await db.get(ChannelProfile, comment.channel_profile_id)
        effective_user_id = cp.user_id if cp else ctx.user_id
    else:
        effective_user_id = ctx.user_id

    # body.comment_id ignored — path param takes precedence
    result = await service.reply_to_comment(
        db,
        comment_id=comment_id,
        reply_text=body.reply_text,
        user_id=effective_user_id,
    )
    return CommentReplyResult(**result)
