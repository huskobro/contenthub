"""
Discovery endpoint response schemas.

Unified search across all ContentHub entities.
"""

from typing import Optional

from pydantic import BaseModel


class DiscoveryResult(BaseModel):
    """Tek bir arama sonucu."""
    id: str
    label: str
    category: str  # "job", "content", "asset", "template", "style_blueprint", "source", "news_item"
    route: str     # frontend route, e.g. "/admin/jobs/abc123"
    status: Optional[str] = None
    snippet: Optional[str] = None  # kısa açıklama
    icon: Optional[str] = None


class DiscoveryResponse(BaseModel):
    """Arama yanıt modeli."""
    results: list[DiscoveryResult]
    total: int
    query: str
