"""
Content Project router — Faz 2 + PHASE X (ownership + project-job hierarchy).

PHASE X ekleri:
  - Tum endpoint'ler UserContext alir; non-admin yalnizca kendi projelerini gorur.
  - Create: user_id daima ctx.user_id (admin override edebilir).
  - GET /{id}/jobs endpoint'i — project altindaki job listesini doner (hierarchy).
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
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
from app.db.models import Job
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
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Bu proje altindaki tum job'lari doner (ownership'li)."""
    project = await service.get_content_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Icerik projesi bulunamadi.")
    ensure_owner_or_admin(ctx, project.user_id, resource_label="Icerik projesi")

    stmt = (
        select(Job)
        .where(Job.content_project_id == project_id)
        .order_by(Job.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
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
