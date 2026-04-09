"""
Platform post router — Faz 9.

Endpoints:
  POST /posts                    — Yeni gonderi taslagi olustur
  GET  /posts                    — Gonderileri filtreli listele
  GET  /posts/stats              — Gonderi istatistikleri
  GET  /posts/capability         — Platform delivery capability
  GET  /posts/{post_id}          — Gonderi detayi
  PATCH /posts/{post_id}         — Taslak gonderiyi guncelle
  POST /posts/{post_id}/submit   — Gonderiyi gonderim icin isaretle
  DELETE /posts/{post_id}        — Taslak gonderiyi sil
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.posts import service
from app.posts.schemas import (
    PlatformPostResponse,
    PostCreateRequest,
    PostUpdateRequest,
    PostSubmitResult,
)

router = APIRouter(prefix="/posts", tags=["Posts"])


@router.post("", response_model=PlatformPostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    body: PostCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Yeni gonderi taslagi olustur."""
    post = await service.create_post(
        db,
        platform=body.platform,
        body=body.body,
        post_type=body.post_type,
        title=body.title,
        channel_profile_id=body.channel_profile_id,
        platform_connection_id=body.platform_connection_id,
        content_project_id=body.content_project_id,
        publish_record_id=body.publish_record_id,
        scheduled_for=body.scheduled_for,
    )
    return post


@router.get("", response_model=List[PlatformPostResponse])
async def list_posts(
    channel_profile_id: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    post_status: Optional[str] = Query(None, alias="status"),
    post_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Gonderileri filtreli listele."""
    return await service.list_posts(
        db,
        channel_profile_id=channel_profile_id,
        platform=platform,
        status=post_status,
        post_type=post_type,
        limit=limit,
        offset=offset,
    )


@router.get("/stats")
async def post_stats(db: AsyncSession = Depends(get_db)):
    """Gonderi istatistikleri."""
    return await service.get_post_stats(db)


@router.get("/capability")
async def delivery_capability():
    """Platform bazinda gonderi delivery capability."""
    return {
        "capabilities": service.PLATFORM_POST_CAPABILITY,
        "note": "YouTube community post API ucuncu taraf gelistiricilere acik degildir. "
                "Gonderiler taslak olarak kaydedilir, platform API hazir oldugunda gonderim yapilabilir.",
    }


@router.get("/{post_id}", response_model=PlatformPostResponse)
async def get_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Gonderi detayi."""
    post = await service.get_post(db, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gonderi bulunamadi.",
        )
    return post


@router.patch("/{post_id}", response_model=PlatformPostResponse)
async def update_post(
    post_id: str,
    body: PostUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Taslak gonderiyi guncelle."""
    post = await service.update_post(
        db,
        post_id=post_id,
        title=body.title,
        body=body.body,
        scheduled_for=body.scheduled_for,
    )
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gonderi bulunamadi veya duzenlenemez (sadece taslaklar duzenlenebilir).",
        )
    return post


@router.post("/{post_id}/submit", response_model=PostSubmitResult)
async def submit_post(
    post_id: str,
    user_id: str = Query(..., description="Islem yapan kullanici ID"),
    db: AsyncSession = Depends(get_db),
):
    """Gonderiyi gonderim icin isaretle. EngagementTask olusturur."""
    result = await service.submit_post(db, post_id, user_id)
    return PostSubmitResult(**result)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Taslak gonderiyi sil."""
    deleted = await service.delete_post(db, post_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gonderi bulunamadi veya silinemez (sadece taslaklar silinebilir).",
        )
