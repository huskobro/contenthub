"""
Discovery router — unified search endpoint.

GET /api/v1/discovery/search?q=...&limit=5

Tüm ContentHub entity'lerinde tek bir sorgu ile arama yapar.
Command palette ve global arama UI'ı için tasarlanmıştır.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.discovery.schemas import DiscoveryResponse
from app.discovery import service

router = APIRouter(prefix="/discovery", tags=["discovery"])


@router.get("/search", response_model=DiscoveryResponse)
async def discovery_search(
    q: str = Query(..., min_length=1, description="Arama sorgusu"),
    limit: int = Query(5, ge=1, le=10, description="Kategori başına maksimum sonuç sayısı"),
    db: AsyncSession = Depends(get_db),
):
    """
    Tüm ContentHub entity'lerinde birleşik arama.

    Aranan kategoriler: job, content (standard_video + news_bulletin),
    asset, template, style_blueprint, source, news_item.

    Her kategori için en fazla `limit` sonuç döner.
    """
    results = await service.search_all(db, query=q, limit=limit)
    return DiscoveryResponse(
        results=results,
        total=len(results),
        query=q,
    )
