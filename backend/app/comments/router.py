"""
Comment sync & reply router — Faz 7.

Endpoints:
  POST /comments/sync           — YouTube video yorumlarini cek ve DB'ye kaydet
  GET  /comments                — Yorumlari filtreli listele
  GET  /comments/sync-status    — Video bazinda son sync bilgisi
  GET  /comments/{comment_id}   — Tek yorum detayi
  POST /comments/{comment_id}/reply — YouTube'a yorum yaniti gonder
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

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


@router.post("/sync", response_model=CommentSyncResult)
async def sync_comments(
    body: CommentSyncRequest,
    db: AsyncSession = Depends(get_db),
):
    """YouTube video yorumlarini ceker ve yerel DB'ye kaydeder (upsert)."""
    result = await service.sync_video_comments(
        db,
        video_id=body.video_id,
        platform_connection_id=body.platform_connection_id,
    )
    return CommentSyncResult(**result)


@router.get("/sync-status", response_model=List[SyncStatusItem])
async def sync_status(
    db: AsyncSession = Depends(get_db),
):
    """Her video icin son sync bilgisini dondurur."""
    rows = await service.get_sync_status(db)
    return [SyncStatusItem(**r) for r in rows]


@router.get("", response_model=List[SyncedCommentResponse])
async def list_comments(
    video_id: Optional[str] = Query(None),
    channel_profile_id: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    reply_status: Optional[str] = Query(None),
    is_reply: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Sync edilmis yorumlari filtreli listele."""
    comments = await service.list_comments(
        db,
        video_id=video_id,
        channel_profile_id=channel_profile_id,
        platform=platform,
        reply_status=reply_status,
        is_reply=is_reply,
        limit=limit,
        offset=offset,
    )
    return comments


@router.get("/{comment_id}", response_model=SyncedCommentResponse)
async def get_comment(
    comment_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Tek yorum detayi (bizim internal ID)."""
    comment = await service.get_comment(db, comment_id)
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Yorum bulunamadi.",
        )
    return comment


@router.post("/{comment_id}/reply", response_model=CommentReplyResult)
async def reply_to_comment(
    comment_id: str,
    body: CommentReplyRequest,
    user_id: str = Query(..., description="Yanit gonderen kullanici ID"),
    db: AsyncSession = Depends(get_db),
):
    """YouTube'a yorum yaniti gonder."""
    # body.comment_id ignored — path param takes precedence
    result = await service.reply_to_comment(
        db,
        comment_id=comment_id,
        reply_text=body.reply_text,
        user_id=user_id,
    )
    return CommentReplyResult(**result)
