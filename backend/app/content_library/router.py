"""
Content Library Router — M21-D + Phase Final F2.2 ownership guard.

Birlesik icerik kutuphanesi endpoint'i.
Standard Video ve News Bulletin kayitlarini tek response icinde dondurur.

Ownership:
  - Non-admin caller sadece sahip oldugu `ChannelProfile`'lara bagli
    StandardVideo ve NewsBulletin kayitlarini gorebilir.
  - Orphan (channel_profile_id=NULL) kayitlar sadece admin icin gorunur.
  - Ownership filtresi service katmaninda SQL-side enforce edilir.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import UserContext, get_current_user_context
from app.content_library import service
from app.content_library.schemas import ContentLibraryResponse
from app.db.models import ChannelProfile
from app.db.session import get_db
from app.visibility.dependencies import require_visible

router = APIRouter(
    prefix="/content-library",
    tags=["content-library"],
    dependencies=[Depends(require_visible("panel:content-library"))],
)

_VALID_CONTENT_TYPES = ("standard_video", "news_bulletin")


async def _scope_channel_ids(
    db: AsyncSession, ctx: UserContext
) -> Optional[List[str]]:
    """Non-admin icin sahip oldugu kanal id listesi. Admin icin None."""
    if ctx.is_admin:
        return None
    result = await db.execute(
        select(ChannelProfile.id).where(ChannelProfile.user_id == ctx.user_id)
    )
    return [row[0] for row in result.all()]


@router.get("", response_model=ContentLibraryResponse)
async def list_content_library(
    content_type: Optional[str] = Query(
        None, description="Icerik turu: standard_video veya news_bulletin"
    ),
    status: Optional[str] = Query(None, description="Durum filtresi"),
    search: Optional[str] = Query(
        None, description="Baslik/konu arama (case-insensitive)"
    ),
    limit: int = Query(50, ge=1, le=500, description="Sayfalama limiti"),
    offset: int = Query(0, ge=0, description="Sayfalama offset'i"),
    ctx: UserContext = Depends(get_current_user_context),
    session: AsyncSession = Depends(get_db),
):
    """
    Birlesik icerik kutuphanesi — owner-scoped for non-admin.

    Standard Video ve News Bulletin kayitlarini tek payload'ta dondurur.
    Backend-side filtreleme, arama ve sayfalama.

    Phase Final F2.2: non-admin caller sadece kendi kanallarina bagli
    kayitlari gorur. Orphan (channel_profile_id NULL) kayitlar admin-only.
    """
    if content_type and content_type not in _VALID_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Gecersiz content_type: '{content_type}'. "
                f"Gecerli: {list(_VALID_CONTENT_TYPES)}"
            ),
        )

    owned_channel_ids = await _scope_channel_ids(session, ctx)

    return await service.list_content_library(
        db=session,
        content_type=content_type,
        status=status,
        search=search,
        limit=limit,
        offset=offset,
        owned_channel_ids=owned_channel_ids,
    )
