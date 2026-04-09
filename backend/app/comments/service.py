"""
Comment sync & reply service — Faz 7.

YouTube yorum cekim (sync) ve yanit gonderme islemleri.
YouTube Data API v3 uzerinden httpx ile calisir.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import SyncedComment, EngagementTask
from app.publish.youtube.token_store import YouTubeTokenStore
from app.publish.youtube.errors import YouTubeAuthError

logger = logging.getLogger(__name__)

# YouTube API base
YT_COMMENT_THREADS_URL = "https://www.googleapis.com/youtube/v3/commentThreads"
YT_COMMENTS_INSERT_URL = "https://www.googleapis.com/youtube/v3/comments"

# Quota korumasi — tek sync isleminde max yorum sayisi
MAX_COMMENTS_PER_SYNC = 500


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_yt_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    """YouTube API datetime string -> Python datetime."""
    if not dt_str:
        return None
    try:
        # YouTube format: 2024-01-15T10:30:00Z or 2024-01-15T10:30:00.000Z
        cleaned = dt_str.replace("Z", "+00:00")
        return datetime.fromisoformat(cleaned)
    except (ValueError, TypeError):
        logger.warning("YouTube datetime parse hatasi: %s", dt_str)
        return None


async def _get_access_token(token_store: Optional[YouTubeTokenStore] = None) -> str:
    """Token store uzerinden access token al."""
    store = token_store or YouTubeTokenStore()
    return await store.get_access_token()


def _extract_comment_data(
    snippet: dict,
    video_id: str,
    is_reply: bool = False,
    parent_id: Optional[str] = None,
    reply_count: int = 0,
) -> dict:
    """YouTube API snippet'inden SyncedComment field'larini cikar."""
    return {
        "external_comment_id": snippet.get("id", "") if not is_reply else snippet.get("id", ""),
        "external_video_id": video_id,
        "external_parent_id": parent_id,
        "author_name": snippet.get("authorDisplayName"),
        "author_channel_id": snippet.get("authorChannelId", {}).get("value") if isinstance(snippet.get("authorChannelId"), dict) else snippet.get("authorChannelId"),
        "author_avatar_url": snippet.get("authorProfileImageUrl"),
        "text": snippet.get("textDisplay", "") or snippet.get("textOriginal", ""),
        "published_at": _parse_yt_datetime(snippet.get("publishedAt")),
        "like_count": int(snippet.get("likeCount", 0)),
        "reply_count": reply_count,
        "is_reply": is_reply,
    }


async def _upsert_comment(
    db: AsyncSession,
    data: dict,
    platform: str = "youtube",
    platform_connection_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
) -> tuple[bool, bool]:
    """
    Upsert a comment. Returns (is_new, is_updated).
    """
    ext_id = data["external_comment_id"]
    stmt = select(SyncedComment).where(SyncedComment.external_comment_id == ext_id)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    now = _now()

    if existing:
        # Update mutable fields
        changed = False
        for field in ("text", "like_count", "reply_count", "author_name", "author_avatar_url"):
            new_val = data.get(field)
            if new_val is not None and getattr(existing, field) != new_val:
                setattr(existing, field, new_val)
                changed = True
        existing.last_synced_at = now
        existing.sync_status = "synced"
        existing.updated_at = now
        return (False, changed)
    else:
        comment = SyncedComment(
            platform=platform,
            platform_connection_id=platform_connection_id,
            channel_profile_id=channel_profile_id,
            external_comment_id=ext_id,
            external_video_id=data["external_video_id"],
            external_parent_id=data.get("external_parent_id"),
            author_name=data.get("author_name"),
            author_channel_id=data.get("author_channel_id"),
            author_avatar_url=data.get("author_avatar_url"),
            text=data.get("text", ""),
            published_at=data.get("published_at"),
            like_count=data.get("like_count", 0),
            reply_count=data.get("reply_count", 0),
            is_reply=data.get("is_reply", False),
            reply_status="none",
            sync_status="synced",
            last_synced_at=now,
        )
        db.add(comment)
        return (True, False)


async def sync_video_comments(
    db: AsyncSession,
    video_id: str,
    token_store: Optional[YouTubeTokenStore] = None,
    platform_connection_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
) -> dict:
    """
    YouTube commentThreads API uzerinden video yorumlarini ceker ve DB'ye upsert eder.

    Returns:
        dict with video_id, total_fetched, new_comments, updated_comments, errors
    """
    errors: list[str] = []
    total_fetched = 0
    new_comments = 0
    updated_comments = 0

    try:
        access_token = await _get_access_token(token_store)
    except YouTubeAuthError as exc:
        return {
            "video_id": video_id,
            "total_fetched": 0,
            "new_comments": 0,
            "updated_comments": 0,
            "errors": [f"Auth hatasi: {exc}"],
        }

    headers = {"Authorization": f"Bearer {access_token}"}
    next_page_token: Optional[str] = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        while total_fetched < MAX_COMMENTS_PER_SYNC:
            params: dict = {
                "part": "snippet,replies",
                "videoId": video_id,
                "maxResults": 100,
                "order": "time",
            }
            if next_page_token:
                params["pageToken"] = next_page_token

            try:
                resp = await client.get(YT_COMMENT_THREADS_URL, headers=headers, params=params)
            except httpx.HTTPError as exc:
                errors.append(f"HTTP hatasi: {exc}")
                break

            if resp.status_code == 403:
                errors.append("YouTube API 403 — Erisim reddedildi veya kota asimi.")
                break
            if resp.status_code == 404:
                errors.append(f"Video bulunamadi: {video_id}")
                break
            if resp.status_code != 200:
                errors.append(f"YouTube API hatasi: HTTP {resp.status_code} — {resp.text[:200]}")
                break

            data = resp.json()
            items = data.get("items", [])
            if not items:
                break

            for thread in items:
                total_fetched += 1

                # Top-level comment
                top_snippet = thread.get("snippet", {})
                top_comment = top_snippet.get("topLevelComment", {})
                top_comment_snippet = top_comment.get("snippet", {})
                thread_reply_count = top_snippet.get("totalReplyCount", 0)

                comment_data = _extract_comment_data(
                    snippet=top_comment_snippet,
                    video_id=video_id,
                    is_reply=False,
                    parent_id=None,
                    reply_count=thread_reply_count,
                )
                # Use thread top-level comment ID
                comment_data["external_comment_id"] = top_comment.get("id", "")

                is_new, is_updated = await _upsert_comment(
                    db, comment_data,
                    platform_connection_id=platform_connection_id,
                    channel_profile_id=channel_profile_id,
                )
                if is_new:
                    new_comments += 1
                elif is_updated:
                    updated_comments += 1

                # Process inline replies (YouTube returns up to 5 per thread)
                replies_data = thread.get("replies", {})
                reply_items = replies_data.get("comments", [])
                parent_ext_id = top_comment.get("id", "")

                for reply_item in reply_items:
                    total_fetched += 1
                    reply_snippet = reply_item.get("snippet", {})
                    reply_data = _extract_comment_data(
                        snippet=reply_snippet,
                        video_id=video_id,
                        is_reply=True,
                        parent_id=parent_ext_id,
                        reply_count=0,
                    )
                    reply_data["external_comment_id"] = reply_item.get("id", "")

                    r_new, r_updated = await _upsert_comment(
                        db, reply_data,
                        platform_connection_id=platform_connection_id,
                        channel_profile_id=channel_profile_id,
                    )
                    if r_new:
                        new_comments += 1
                    elif r_updated:
                        updated_comments += 1

            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break

    # Commit all upserts
    try:
        await db.commit()
    except Exception as exc:
        errors.append(f"DB commit hatasi: {exc}")
        await db.rollback()

    return {
        "video_id": video_id,
        "total_fetched": total_fetched,
        "new_comments": new_comments,
        "updated_comments": updated_comments,
        "errors": errors,
    }


async def list_comments(
    db: AsyncSession,
    video_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
    reply_status: Optional[str] = None,
    is_reply: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
) -> list[SyncedComment]:
    """Synced yorumlari filtreli listele."""
    q = select(SyncedComment).order_by(SyncedComment.published_at.desc())

    if video_id:
        q = q.where(SyncedComment.external_video_id == video_id)
    if channel_profile_id:
        q = q.where(SyncedComment.channel_profile_id == channel_profile_id)
    if platform:
        q = q.where(SyncedComment.platform == platform)
    if reply_status:
        q = q.where(SyncedComment.reply_status == reply_status)
    if is_reply is not None:
        q = q.where(SyncedComment.is_reply == is_reply)

    q = q.offset(offset).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_comment(
    db: AsyncSession, comment_id: str
) -> Optional[SyncedComment]:
    """Tek yorum getir (bizim internal ID)."""
    return await db.get(SyncedComment, comment_id)


async def reply_to_comment(
    db: AsyncSession,
    comment_id: str,
    reply_text: str,
    user_id: str,
    token_store: Optional[YouTubeTokenStore] = None,
) -> dict:
    """
    YouTube'a yorum yaniti gonder ve EngagementTask olustur.

    Returns:
        dict with success, engagement_task_id, external_reply_id, error
    """
    comment = await db.get(SyncedComment, comment_id)
    if not comment:
        return {
            "success": False,
            "engagement_task_id": None,
            "external_reply_id": None,
            "error": f"Yorum bulunamadi: {comment_id}",
        }

    # YouTube API call
    try:
        access_token = await _get_access_token(token_store)
    except YouTubeAuthError as exc:
        return {
            "success": False,
            "engagement_task_id": None,
            "external_reply_id": None,
            "error": f"Auth hatasi: {exc}",
        }

    # parentId: eger is_reply ise parent_id kullan, degilse kendi external_comment_id
    parent_id = comment.external_parent_id if comment.is_reply else comment.external_comment_id

    body = {
        "snippet": {
            "parentId": parent_id,
            "textOriginal": reply_text,
        }
    }

    external_reply_id: Optional[str] = None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                YT_COMMENTS_INSERT_URL,
                params={"part": "snippet"},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json=body,
            )

        if resp.status_code not in (200, 201):
            error_detail = resp.text[:300] if resp.text else "Bilinmeyen hata"
            # Update comment reply status
            comment.reply_status = "failed"
            comment.updated_at = _now()
            await db.commit()
            return {
                "success": False,
                "engagement_task_id": None,
                "external_reply_id": None,
                "error": f"YouTube API hatasi: HTTP {resp.status_code} — {error_detail}",
            }

        resp_data = resp.json()
        external_reply_id = resp_data.get("id")

    except httpx.HTTPError as exc:
        comment.reply_status = "failed"
        comment.updated_at = _now()
        await db.commit()
        return {
            "success": False,
            "engagement_task_id": None,
            "external_reply_id": None,
            "error": f"HTTP hatasi: {exc}",
        }

    # Update SyncedComment
    now = _now()
    comment.reply_status = "replied"
    comment.our_reply_text = reply_text
    comment.our_reply_at = now
    comment.updated_at = now

    # Create EngagementTask
    task = EngagementTask(
        user_id=user_id,
        channel_profile_id=comment.channel_profile_id or "",
        platform_connection_id=comment.platform_connection_id or "",
        content_project_id=comment.content_project_id,
        type="comment_reply",
        target_object_type="youtube_comment",
        target_object_id=comment.external_comment_id,
        final_user_input=reply_text,
        status="executed",
        executed_at=now,
    )
    db.add(task)

    try:
        await db.commit()
        await db.refresh(task)
    except Exception as exc:
        await db.rollback()
        return {
            "success": True,
            "engagement_task_id": None,
            "external_reply_id": external_reply_id,
            "error": f"YouTube yaniti gonderildi ancak DB kaydi basarisiz: {exc}",
        }

    return {
        "success": True,
        "engagement_task_id": task.id,
        "external_reply_id": external_reply_id,
        "error": None,
    }


async def get_sync_status(db: AsyncSession) -> list[dict]:
    """
    Her video icin son sync bilgisini dondurur.
    """
    stmt = (
        select(
            SyncedComment.external_video_id,
            func.count(SyncedComment.id).label("comment_count"),
            func.max(SyncedComment.last_synced_at).label("last_synced_at"),
        )
        .group_by(SyncedComment.external_video_id)
        .order_by(func.max(SyncedComment.last_synced_at).desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "external_video_id": row.external_video_id,
            "comment_count": row.comment_count,
            "last_synced_at": row.last_synced_at,
        }
        for row in rows
    ]
