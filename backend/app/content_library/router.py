"""
Content Library Router — M21-D.

Birlesik icerik kutuphanesi endpoint'i.
Standard Video ve News Bulletin kayitlarini tek response icinde dondurur.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException

from app.db.session import get_db
from app.visibility.dependencies import require_visible
from app.content_library import service
from app.content_library.schemas import ContentLibraryResponse

router = APIRouter(prefix="/content-library", tags=["content-library"], dependencies=[Depends(require_visible("panel:content-library"))])

_VALID_CONTENT_TYPES = ("standard_video", "news_bulletin")


@router.get("", response_model=ContentLibraryResponse)
async def list_content_library(
    content_type: Optional[str] = Query(None, description="Icerik turu: standard_video veya news_bulletin"),
    status: Optional[str] = Query(None, description="Durum filtresi"),
    search: Optional[str] = Query(None, description="Baslik/konu arama (case-insensitive)"),
    limit: int = Query(50, ge=1, le=500, description="Sayfalama limiti"),
    offset: int = Query(0, ge=0, description="Sayfalama offset'i"),
    session=Depends(get_db),
):
    """
    Birlesik icerik kutuphanesi.

    Standard Video ve News Bulletin kayitlarini tek payload'ta dondurur.
    Backend-side filtreleme, arama ve sayfalama.
    """
    if content_type and content_type not in _VALID_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Gecersiz content_type: '{content_type}'. Gecerli: {list(_VALID_CONTENT_TYPES)}",
        )
    return await service.list_content_library(
        db=session,
        content_type=content_type,
        status=status,
        search=search,
        limit=limit,
        offset=offset,
    )
