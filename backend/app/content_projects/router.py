"""
Content Project router — Faz 2 + PHASE X + PHASE AF (project-centered workflow).

PHASE X ekleri:
  - Tum endpoint'ler UserContext alir; non-admin yalnizca kendi projelerini gorur.
  - Create: user_id daima ctx.user_id (admin override edebilir).
  - GET /{id}/jobs endpoint'i — project altindaki job listesini doner (hierarchy).

PHASE AF ekleri:
  - GET /{id}/jobs: module_type + status filtreleri
  - GET /{id}/summary: project-scope mini analytics (job counts by status,
    publish counts, last activity). UI project detail'da reuse edilir;
    ayri bir analytics sistemi acmiyor, mevcut jobs + publish_records
    tablolarini okuyor.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import (
    UserContext,
    ensure_owner_or_admin,
    get_current_user_context,
)
from app.content_projects import service
from app.content_projects.schemas import (
    ContentProjectCreate,
    ContentProjectResponse,
    ContentProjectUpdate,
)
from app.db.models import Job, PublishRecord
from app.db.session import get_db

router = APIRouter(prefix="/content-projects", tags=["Content Projects"])


@router.get("", response_model=List[ContentProjectResponse])
async def list_content_projects(
    user_id: Optional[str] = Query(
        None, description="Admin only override; non-admin her zaman kendi projeleri"
    ),
    channel_profile_id: Optional[str] = Query(None),
    module_type: Optional[str] = Query(None),
    content_status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    effective_user_id = user_id if ctx.is_admin else ctx.user_id
    return await service.list_content_projects(
        db,
        user_id=effective_user_id,
        channel_profile_id=channel_profile_id,
        module_type=module_type,
        content_status=content_status,
        skip=skip,
        limit=limit,
    )


@router.post(
    "", response_model=ContentProjectResponse, status_code=status.HTTP_201_CREATED
)
async def create_content_project(
    payload: ContentProjectCreate,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    if not ctx.is_admin and payload.user_id != ctx.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Baska kullanici adina proje olusturamazsiniz",
        )
    return await service.create_content_project(db, payload)


@router.get("/{project_id}", response_model=ContentProjectResponse)
async def get_content_project(
    project_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_content_project(db, project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Icerik projesi bulunamadi.")
    ensure_owner_or_admin(ctx, result.user_id, resource_label="Icerik projesi")
    return result


@router.patch("/{project_id}", response_model=ContentProjectResponse)
async def update_content_project(
    project_id: str,
    payload: ContentProjectUpdate,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    existing = await service.get_content_project(db, project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Icerik projesi bulunamadi.")
    ensure_owner_or_admin(ctx, existing.user_id, resource_label="Icerik projesi")
    return await service.update_content_project(db, project_id, payload)


@router.delete("/{project_id}", response_model=ContentProjectResponse)
async def delete_content_project(
    project_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete — content_status='archived'."""
    existing = await service.get_content_project(db, project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Icerik projesi bulunamadi.")
    ensure_owner_or_admin(ctx, existing.user_id, resource_label="Icerik projesi")
    return await service.delete_content_project(db, project_id)


# ---------------------------------------------------------------------------
# PHASE X: project -> jobs hierarchy
# ---------------------------------------------------------------------------


@router.get("/{project_id}/jobs")
async def list_project_jobs(
    project_id: str,
    module_type: Optional[str] = Query(
        None, description="Mod\u00fcl tipi filtresi (standard_video, news_bulletin, product_review)"
    ),
    job_status: Optional[str] = Query(
        None, alias="status", description="Job status filtresi (queued, running, completed, failed, ...)"
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Bu proje altindaki tum job'lari doner (ownership'li).

    PHASE AF: module_type + status filtreleri eklendi; project detail UI'i
    ayni projede birden fazla is tipini filtreleyebiliyor.
    """
    project = await service.get_content_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Icerik projesi bulunamadi.")
    ensure_owner_or_admin(ctx, project.user_id, resource_label="Icerik projesi")

    stmt = select(Job).where(Job.content_project_id == project_id)
    if module_type:
        stmt = stmt.where(Job.module_type == module_type)
    if job_status:
        stmt = stmt.where(Job.status == job_status)
    stmt = stmt.order_by(Job.created_at.desc()).offset(skip).limit(limit)

    rows = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": j.id,
            "module_type": j.module_type,
            "status": j.status,
            "owner_id": j.owner_id,
            "channel_profile_id": j.channel_profile_id,
            "content_project_id": j.content_project_id,
            "current_step_key": j.current_step_key,
            "created_at": j.created_at,
            "started_at": j.started_at,
            "finished_at": j.finished_at,
        }
        for j in rows
    ]


# ---------------------------------------------------------------------------
# PHASE AF: project-scope mini analytics summary
# ---------------------------------------------------------------------------


@router.get("/{project_id}/summary")
async def get_project_summary(
    project_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Project detail sayfasi icin hafif analytics summary.

    Icerik:
      - jobs: toplam + status bazli kirilim + modul bazli kirilim + son job created_at
      - publish: toplam + status bazli kirilim + son yayin tarihi

    Scope: yalnizca bu project_id'ye bagli kayitlar (ownership backend'de
    zaten kilitli). Ayri bir analytics sistemi degil; mevcut jobs +
    publish_records tablolarini agregate eder.
    """
    project = await service.get_content_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Icerik projesi bulunamadi.")
    ensure_owner_or_admin(ctx, project.user_id, resource_label="Icerik projesi")

    # Jobs by status
    status_rows = (await db.execute(
        select(Job.status, func.count(Job.id))
        .where(Job.content_project_id == project_id)
        .group_by(Job.status)
    )).all()
    jobs_by_status = {s: int(c) for s, c in status_rows if s}

    # Jobs by module_type
    module_rows = (await db.execute(
        select(Job.module_type, func.count(Job.id))
        .where(Job.content_project_id == project_id)
        .group_by(Job.module_type)
    )).all()
    jobs_by_module = {m: int(c) for m, c in module_rows if m}

    jobs_total = sum(jobs_by_status.values())

    last_job_at_row = (await db.execute(
        select(func.max(Job.created_at)).where(Job.content_project_id == project_id)
    )).scalar_one_or_none()

    # Publish records by status
    pr_rows = (await db.execute(
        select(PublishRecord.status, func.count(PublishRecord.id))
        .where(PublishRecord.content_project_id == project_id)
        .group_by(PublishRecord.status)
    )).all()
    publish_by_status = {s: int(c) for s, c in pr_rows if s}
    publish_total = sum(publish_by_status.values())

    last_publish_row = (await db.execute(
        select(func.max(PublishRecord.published_at)).where(
            PublishRecord.content_project_id == project_id
        )
    )).scalar_one_or_none()

    return {
        "project_id": project_id,
        "jobs": {
            "total": jobs_total,
            "by_status": jobs_by_status,
            "by_module": jobs_by_module,
            "last_created_at": last_job_at_row.isoformat() if last_job_at_row else None,
        },
        "publish": {
            "total": publish_total,
            "by_status": publish_by_status,
            "last_published_at": last_publish_row.isoformat() if last_publish_row else None,
        },
    }
