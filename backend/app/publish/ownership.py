"""
Publish ownership helpers — PHASE X.

PublishRecord'un kendi `owner_id` kolonu yok; sahiplik `PublishRecord.job_id ->
Job.owner_id` uzerinden turetilir. Bu modul Publish router'in her kayit icin
hizli ve tutarli bir ownership kapisi acmasini saglar.

Kullanim:
  record = await service.get_publish_record(session, record_id)
  await ensure_publish_record_ownership(session, record, ctx)

Admin otomatik olarak gecer. Non-admin icin:
  - Job.owner_id == ctx.user_id gereklidir.
  - Orphan job (owner_id None) non-admin icin 403.
  - PublishRecord.job_id yoksa (teorik olarak) 403.

Neden burada degil de auth/ownership.py'de degil:
  - auth/ownership.py generic; publish domain'e ozel (Job join) mantigi
    domain icinde tutmak servis/router katman disiplini icin daha temiz.
  - Yeni publish endpoint'leri sadece bu yardimciyi cagirir; mantigi
    tekrar kopyalamak gerekmez.
"""

from __future__ import annotations

from typing import Iterable, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import UserContext, ensure_owner_or_admin
from app.db.models import (
    ChannelProfile,
    ContentProject,
    Job,
    PlatformConnection,
    PublishRecord,
)


__all__ = [
    "resolve_publish_record_owner_id",
    "ensure_publish_record_ownership",
    "ensure_job_ownership",
    "ensure_channel_profile_ownership",
    "ensure_content_project_ownership",
    "ensure_platform_connection_ownership",
    "apply_publish_user_scope",
]


# ---------------------------------------------------------------------------
# Owner resolution
# ---------------------------------------------------------------------------


async def resolve_publish_record_owner_id(
    session: AsyncSession, record: PublishRecord
) -> Optional[str]:
    """PublishRecord -> Job.owner_id cozumle. Orphan ise None doner."""
    if record is None or not record.job_id:
        return None
    job = await session.get(Job, record.job_id)
    return job.owner_id if job is not None else None


async def ensure_publish_record_ownership(
    session: AsyncSession,
    record: PublishRecord,
    ctx: UserContext,
) -> None:
    """Admin her zaman gecer; non-admin icin Job.owner_id esitligi zorunlu."""
    if ctx.is_admin:
        return
    owner_id = await resolve_publish_record_owner_id(session, record)
    if owner_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu yayin kaydi orphan (owner'sız); yalniz admin erisebilir",
        )
    ensure_owner_or_admin(ctx, owner_id, resource_label="Yayin kaydi")


# ---------------------------------------------------------------------------
# Related resources (channel / project / connection / job)
# ---------------------------------------------------------------------------


async def ensure_job_ownership(
    session: AsyncSession, job_id: str, ctx: UserContext
) -> Job:
    job = await session.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Is bulunamadi")
    if ctx.is_admin:
        return job
    if job.owner_id is None:
        raise HTTPException(status_code=403, detail="Is orphan; yalniz admin erisimi")
    ensure_owner_or_admin(ctx, job.owner_id, resource_label="Is")
    return job


async def ensure_channel_profile_ownership(
    session: AsyncSession, profile_id: str, ctx: UserContext
) -> ChannelProfile:
    profile = await session.get(ChannelProfile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Kanal profili bulunamadi")
    ensure_owner_or_admin(ctx, profile.user_id, resource_label="Kanal profili")
    return profile


async def ensure_content_project_ownership(
    session: AsyncSession, project_id: str, ctx: UserContext
) -> ContentProject:
    project = await session.get(ContentProject, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Icerik projesi bulunamadi")
    ensure_owner_or_admin(ctx, project.user_id, resource_label="Icerik projesi")
    return project


async def ensure_platform_connection_ownership(
    session: AsyncSession, connection_id: str, ctx: UserContext
) -> PlatformConnection:
    """PlatformConnection -> ChannelProfile.user_id uzerinden sahiplik."""
    conn = await session.get(PlatformConnection, connection_id)
    if conn is None:
        raise HTTPException(status_code=404, detail="Baglanti bulunamadi")
    if ctx.is_admin:
        return conn
    channel = await session.get(ChannelProfile, conn.channel_profile_id)
    if channel is None:
        # Cascade bozulmus — non-admin icin guvenli sey: kapat
        raise HTTPException(status_code=403, detail="Baglanti dangling; erisim reddedildi")
    ensure_owner_or_admin(ctx, channel.user_id, resource_label="Kanal baglantisi")
    return conn


# ---------------------------------------------------------------------------
# Query scoping for publish listing
# ---------------------------------------------------------------------------


def apply_publish_user_scope(stmt, ctx: UserContext):
    """
    Publish listeleme sorgusuna Job join'uyla user_id filtresi uygular.

    Admin icin stmt olduğu gibi geri doner. Non-admin icin:
        .join(Job, PublishRecord.job_id == Job.id)
        .where(Job.owner_id == ctx.user_id)
    """
    if ctx.is_admin:
        return stmt
    return stmt.join(Job, PublishRecord.job_id == Job.id).where(
        Job.owner_id == ctx.user_id
    )


async def filter_record_ids_by_ownership(
    session: AsyncSession,
    record_ids: Iterable[str],
    ctx: UserContext,
) -> list[str]:
    """Bulk operasyonlar icin: verilen record_id listesinden sadece ctx'nin
    sahip oldugu kayitlari dondur. Admin hepsini goruyor.

    Geri donen liste veritabaninda VAROLAN ve (non-admin ise) sahiplik kontrolu
    gecen record_id'leri icerir; bulunamayan / ownership ihlali olanlar
    sessizce atilir (caller bulk response'da missing/denied olarak raporlar).
    """
    ids = [rid for rid in record_ids if rid]
    if not ids:
        return []
    stmt = select(PublishRecord.id, Job.owner_id).join(
        Job, PublishRecord.job_id == Job.id, isouter=True
    ).where(PublishRecord.id.in_(ids))
    rows = (await session.execute(stmt)).all()
    if ctx.is_admin:
        return [r.id for r in rows]
    return [r.id for r in rows if r.owner_id == ctx.user_id]
