"""
Content Project router — Faz 2.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.content_projects import service
from app.content_projects.schemas import (
    ContentProjectCreate,
    ContentProjectUpdate,
    ContentProjectResponse,
)

router = APIRouter(prefix="/content-projects", tags=["Content Projects"])


@router.get("", response_model=List[ContentProjectResponse])
async def list_content_projects(
    user_id: Optional[str] = Query(None),
    channel_profile_id: Optional[str] = Query(None),
    module_type: Optional[str] = Query(None),
    content_status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_content_projects(
        db,
        user_id=user_id,
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
    db: AsyncSession = Depends(get_db),
):
    return await service.create_content_project(db, payload)


@router.get("/{project_id}", response_model=ContentProjectResponse)
async def get_content_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_content_project(db, project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Icerik projesi bulunamadi.")
    return result


@router.patch("/{project_id}", response_model=ContentProjectResponse)
async def update_content_project(
    project_id: str,
    payload: ContentProjectUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await service.update_content_project(db, project_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Icerik projesi bulunamadi.")
    return result


@router.delete("/{project_id}", response_model=ContentProjectResponse)
async def delete_content_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Soft delete — content_status='archived'."""
    result = await service.delete_content_project(db, project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Icerik projesi bulunamadi.")
    return result
