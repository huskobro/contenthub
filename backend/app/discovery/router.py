"""
Discovery router — unified search endpoint + Phase Final F2.2 ownership guard.

GET /api/v1/discovery/search?q=...&limit=5

Tüm ContentHub entity'lerinde tek bir sorgu ile arama yapar.
Command palette ve global arama UI'ı için tasarlanmıştır.

Ownership:
  - Non-admin caller sadece kendi scope'undaki kayitlari gorur:
    * Jobs: `Job.owner_id == ctx.user_id`
    * StandardVideo / NewsBulletin: owned_channel_ids filtresi
    * Templates / Style Blueprints / Sources / News Items / Assets:
      bu kaynaklar admin-yonetimli global objelerdir; non-admin icin
      discovery aramasindan cikarilir (zaten admin panellerinden
      erisilir).
  - Admin tum kategorileri goruntuler (scope=None).
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import UserContext, get_current_user_context
from app.db.models import ChannelProfile
from app.db.session import get_db
from app.discovery import service
from app.discovery.schemas import DiscoveryResponse
from app.visibility.dependencies import require_visible

router = APIRouter(
    prefix="/discovery",
    tags=["discovery"],
    dependencies=[Depends(require_visible("panel:discovery"))],
)


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


@router.get("/search", response_model=DiscoveryResponse)
async def discovery_search(
    q: str = Query(..., min_length=1, description="Arama sorgusu"),
    limit: int = Query(
        5, ge=1, le=10, description="Kategori başına maksimum sonuç sayısı"
    ),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Tüm ContentHub entity'lerinde birleşik arama — owner-scoped for non-admin.

    Aranan kategoriler: job, content (standard_video + news_bulletin),
    asset, template, style_blueprint, source, news_item.

    Her kategori için en fazla `limit` sonuç döner.

    Phase Final F2.2:
      - Non-admin: jobs owner_id, content owned_channel_ids scope.
      - Non-admin: templates/style_blueprints/sources/news_items/assets
        kategorileri admin-only olarak gizlenir.
    """
    owned_channel_ids = await _scope_channel_ids(db, ctx)
    caller_user_id = None if ctx.is_admin else ctx.user_id
    admin_only_categories_visible = ctx.is_admin

    results = await service.search_all(
        db,
        query=q,
        limit=limit,
        caller_user_id=caller_user_id,
        owned_channel_ids=owned_channel_ids,
        include_admin_only=admin_only_categories_visible,
    )
    return DiscoveryResponse(
        results=results,
        total=len(results),
        query=q,
    )
