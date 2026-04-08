"""
Platform Connection router — Faz 2.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.platform_connections import service
from app.platform_connections.schemas import (
    PlatformConnectionCreate,
    PlatformConnectionUpdate,
    PlatformConnectionResponse,
)

router = APIRouter(prefix="/platform-connections", tags=["Platform Connections"])


@router.get("", response_model=List[PlatformConnectionResponse])
async def list_platform_connections(
    channel_profile_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_platform_connections(
        db, channel_profile_id=channel_profile_id, skip=skip, limit=limit
    )


@router.post(
    "", response_model=PlatformConnectionResponse, status_code=status.HTTP_201_CREATED
)
async def create_platform_connection(
    payload: PlatformConnectionCreate,
    db: AsyncSession = Depends(get_db),
):
    return await service.create_platform_connection(db, payload)


@router.get("/{connection_id}", response_model=PlatformConnectionResponse)
async def get_platform_connection(
    connection_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_platform_connection(db, connection_id)
    if not result:
        raise HTTPException(status_code=404, detail="Platform baglantisi bulunamadi.")
    return result


@router.patch("/{connection_id}", response_model=PlatformConnectionResponse)
async def update_platform_connection(
    connection_id: str,
    payload: PlatformConnectionUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await service.update_platform_connection(db, connection_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Platform baglantisi bulunamadi.")
    return result


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_platform_connection(
    connection_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Hard delete."""
    deleted = await service.delete_platform_connection(db, connection_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Platform baglantisi bulunamadi.")
