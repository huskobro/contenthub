"""
Platform post service — Faz 9.

CRUD + submit akisi.

ONEMLI: YouTube community post API ucuncu taraf gelistiricilere acik degildir.
Bu servis draft/orchestration modeli olarak calisir:
- Gonderi olusturma, duzenleme, listeleme: tam calisiyor
- Gonderim (submit): EngagementTask olusturur, delivery_status="not_available" olarak isaretler
- Gercek platform delivery, API hazir oldugunda adapter ile eklenecek
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PlatformPost, EngagementTask

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# YouTube community post API durumu
# Bu dict gelecekte platform bazli adapter registry'ye donusebilir
PLATFORM_POST_CAPABILITY = {
    "youtube": {
        "community_post": False,  # API ucuncu taraflara acik degil
        "share_post": False,
        "announcement": False,
    },
}


def check_delivery_capability(platform: str, post_type: str) -> tuple[bool, str]:
    """Platform ve gonderi tipi icin delivery destegi kontrol et."""
    caps = PLATFORM_POST_CAPABILITY.get(platform, {})
    supported = caps.get(post_type, False)
    if supported:
        return (True, "")
    return (
        False,
        f"{platform} platformu '{post_type}' gonderisi icin API destegi sunmuyor. "
        f"Gonderi taslak olarak kaydedildi. Platform API hazir oldugunda gonderim yapilabilecek.",
    )


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

async def create_post(
    db: AsyncSession,
    platform: str,
    body: str,
    post_type: str = "community_post",
    title: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform_connection_id: Optional[str] = None,
    content_project_id: Optional[str] = None,
    publish_record_id: Optional[str] = None,
    scheduled_for: Optional[datetime] = None,
) -> PlatformPost:
    """Yeni gonderi taslagi olustur."""
    post = PlatformPost(
        platform=platform,
        platform_connection_id=platform_connection_id,
        channel_profile_id=channel_profile_id,
        content_project_id=content_project_id,
        publish_record_id=publish_record_id,
        post_type=post_type,
        title=title,
        body=body,
        status="draft",
        scheduled_for=scheduled_for,
        delivery_status="pending",
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


async def update_post(
    db: AsyncSession,
    post_id: str,
    title: Optional[str] = None,
    body: Optional[str] = None,
    scheduled_for: Optional[datetime] = None,
) -> Optional[PlatformPost]:
    """Taslak gonderiyi guncelle. Sadece draft durumundaki gonderiler guncellenebilir."""
    post = await db.get(PlatformPost, post_id)
    if not post:
        return None
    if post.status != "draft":
        return None  # Sadece taslaklar guncellenebilir

    now = _now()
    if title is not None:
        post.title = title
    if body is not None:
        post.body = body
    if scheduled_for is not None:
        post.scheduled_for = scheduled_for
    post.updated_at = now

    await db.commit()
    await db.refresh(post)
    return post


async def submit_post(
    db: AsyncSession,
    post_id: str,
    user_id: str,
) -> dict:
    """
    Gonderiyi gonderim icin isaretle ve EngagementTask olustur.

    Platform API destegi varsa: gercek gonderim yapilir
    Yoksa: delivery_status="not_available" olarak isaretlenir
    """
    post = await db.get(PlatformPost, post_id)
    if not post:
        return {
            "success": False,
            "delivery_status": "failed",
            "engagement_task_id": None,
            "error": f"Gonderi bulunamadi: {post_id}",
        }

    if post.status not in ("draft", "failed"):
        return {
            "success": False,
            "delivery_status": post.delivery_status,
            "engagement_task_id": None,
            "error": f"Bu gonderi zaten gonderilmis veya kuyrukta: status={post.status}",
        }

    # Check delivery capability
    can_deliver, reason = check_delivery_capability(post.platform, post.post_type)

    now = _now()

    if can_deliver:
        # Faz Final F4 TODO kapanisi:
        #   Su an `PLATFORM_POST_CAPABILITY` dict'inde hic bir platform True
        #   degil — `can_deliver=True` kolu pratikte erisilemez. Gelecekte bir
        #   platform adapter registry (ornegin `post_delivery_adapters.py`)
        #   eklendiginde, gercek API cagrisi BU noktada degil, adapter'in
        #   kendi modulunde yapilir; burasi sadece kuyruk disiplinini kurar.
        #
        #   Burada "TODO: api cagrisi" seklinde acik kapi BIRAKMIYORUZ.
        #   Kontrat: adapter hazir oldugunda once `capability` True'ya cekilir,
        #   ardindan asenkron bir background task kuyruktan okur. Bu fonksiyon
        #   hicbir zaman senkron HTTP cagrisi yapmaz (CLAUDE.md "fail fast").
        post.status = "queued"
        post.delivery_status = "pending"
        logger.info(
            "platform_post.queued",
            extra={"post_id": post.id, "platform": post.platform, "post_type": post.post_type},
        )
    else:
        # Platform API destegi yok — taslak kuyruga alinir ama delivery_status
        # "not_available" kalir; operator UI'dan gonderinin durdugunu gorur.
        post.status = "queued"
        post.delivery_status = "not_available"
        post.delivery_error = reason
        logger.info(
            "platform_post.not_available",
            extra={"post_id": post.id, "platform": post.platform, "post_type": post.post_type, "reason": reason},
        )

    post.updated_at = now

    # EngagementTask olustur
    task = EngagementTask(
        user_id=user_id,
        channel_profile_id=post.channel_profile_id or "",
        platform_connection_id=post.platform_connection_id or "",
        content_project_id=post.content_project_id,
        type="community_post",
        target_object_type="platform_post",
        target_object_id=post.id,
        final_user_input=post.body[:500],  # Ilk 500 karakter
        status="executed" if can_deliver else "pending",
        executed_at=now if can_deliver else None,
    )
    db.add(task)

    try:
        await db.commit()
        await db.refresh(task)
    except Exception as exc:
        await db.rollback()
        return {
            "success": False,
            "delivery_status": "failed",
            "engagement_task_id": None,
            "error": f"DB kayit hatasi: {exc}",
        }

    return {
        "success": True,
        "delivery_status": post.delivery_status,
        "engagement_task_id": task.id,
        "error": reason if not can_deliver else None,
    }


async def delete_post(db: AsyncSession, post_id: str) -> bool:
    """Taslak gonderiyi sil. Sadece draft durumundaki gonderiler silinebilir."""
    post = await db.get(PlatformPost, post_id)
    if not post or post.status != "draft":
        return False
    await db.delete(post)
    await db.commit()
    return True


# ---------------------------------------------------------------------------
# List / Get
# ---------------------------------------------------------------------------

async def list_posts(
    db: AsyncSession,
    channel_profile_id: Optional[str] = None,
    channel_profile_ids: Optional[list[str]] = None,
    platform: Optional[str] = None,
    status: Optional[str] = None,
    post_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> list[PlatformPost]:
    """
    Gonderileri filtreli listele.

    Phase Final F2: `channel_profile_ids` scopes results to a set of owned
    channels (non-admin caller); `None` means no ownership filter (admin).
    """
    q = select(PlatformPost).order_by(PlatformPost.updated_at.desc())
    if channel_profile_id:
        q = q.where(PlatformPost.channel_profile_id == channel_profile_id)
    if channel_profile_ids is not None:
        if not channel_profile_ids:
            return []
        q = q.where(PlatformPost.channel_profile_id.in_(channel_profile_ids))
    if platform:
        q = q.where(PlatformPost.platform == platform)
    if status:
        q = q.where(PlatformPost.status == status)
    if post_type:
        q = q.where(PlatformPost.post_type == post_type)
    q = q.offset(offset).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_post(db: AsyncSession, post_id: str) -> Optional[PlatformPost]:
    return await db.get(PlatformPost, post_id)


async def get_post_stats(
    db: AsyncSession,
    channel_profile_ids: Optional[list[str]] = None,
) -> dict:
    """
    Gonderi istatistikleri (owner-scoped if channel_profile_ids passed).
    """
    def _scope(stmt):
        if channel_profile_ids is not None:
            if not channel_profile_ids:
                return None  # signal empty scope
            return stmt.where(PlatformPost.channel_profile_id.in_(channel_profile_ids))
        return stmt

    # Empty owned-channel list for non-admin → return zeros.
    if channel_profile_ids is not None and not channel_profile_ids:
        return {"total": 0, "draft": 0, "queued": 0, "posted": 0, "failed": 0}

    total = await db.scalar(_scope(select(func.count(PlatformPost.id))))
    draft = await db.scalar(
        _scope(select(func.count(PlatformPost.id)).where(PlatformPost.status == "draft"))
    )
    queued = await db.scalar(
        _scope(select(func.count(PlatformPost.id)).where(PlatformPost.status == "queued"))
    )
    posted = await db.scalar(
        _scope(select(func.count(PlatformPost.id)).where(PlatformPost.status == "posted"))
    )
    failed = await db.scalar(
        _scope(select(func.count(PlatformPost.id)).where(PlatformPost.status == "failed"))
    )
    return {
        "total": total or 0,
        "draft": draft or 0,
        "queued": queued or 0,
        "posted": posted or 0,
        "failed": failed or 0,
    }
