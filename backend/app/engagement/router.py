"""
Engagement Task router — Faz 2.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.engagement import service
from app.engagement.schemas import (
    EngagementTaskCreate,
    EngagementTaskUpdate,
    EngagementTaskResponse,
)

router = APIRouter(prefix="/engagement-tasks", tags=["Engagement Tasks"])


@router.get("", response_model=List[EngagementTaskResponse])
async def list_engagement_tasks(
    user_id: Optional[str] = Query(None),
    channel_profile_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_engagement_tasks(
        db,
        user_id=user_id,
        channel_profile_id=channel_profile_id,
        type=type,
        status=status,
        skip=skip,
        limit=limit,
    )


@router.post(
    "", response_model=EngagementTaskResponse, status_code=status.HTTP_201_CREATED
)
async def create_engagement_task(
    payload: EngagementTaskCreate,
    db: AsyncSession = Depends(get_db),
):
    return await service.create_engagement_task(db, payload)


@router.get("/{task_id}", response_model=EngagementTaskResponse)
async def get_engagement_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_engagement_task(db, task_id)
    if not result:
        raise HTTPException(status_code=404, detail="Etkilesim gorevi bulunamadi.")
    return result


@router.patch("/{task_id}", response_model=EngagementTaskResponse)
async def update_engagement_task(
    task_id: str,
    payload: EngagementTaskUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await service.update_engagement_task(db, task_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Etkilesim gorevi bulunamadi.")
    return result
