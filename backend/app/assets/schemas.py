"""
Asset Schemas — M19-A + M20-A.

Workspace disk taramasi ile uretilen asset index icin Pydantic modelleri.
M20-A: Operasyon schema'lari (delete, refresh, reveal, allowed-actions).
"""

from typing import Optional
from pydantic import BaseModel


class AssetItem(BaseModel):
    """Tek bir asset dosyasinin metadata'si."""
    id: str
    name: str
    asset_type: str
    source_kind: str  # "job_artifact", "job_preview"
    file_path: str
    size_bytes: int
    mime_ext: str
    job_id: Optional[str] = None
    module_type: Optional[str] = None
    discovered_at: Optional[str] = None


class AssetListResponse(BaseModel):
    """Asset listeleme yaniti."""
    total: int
    offset: int
    limit: int
    items: list[AssetItem]


# ── M20-A: Operation schemas ──────────────────────────────────


class AssetRefreshResponse(BaseModel):
    """Refresh sonucu."""
    status: str  # "ok"
    total_scanned: int
    message: str


class AssetDeleteResponse(BaseModel):
    """Silme sonucu."""
    status: str  # "deleted"
    asset_id: str
    message: str


class AssetRevealResponse(BaseModel):
    """Reveal sonucu — guvenli metadata."""
    asset_id: str
    absolute_path: str
    directory: str
    exists: bool


class AssetAllowedActionsResponse(BaseModel):
    """Bir asset icin izin verilen aksiyonlar."""
    asset_id: str
    actions: list[str]  # e.g. ["delete", "reveal", "refresh"]


# ── M21-A: Upload schema ──────────────────────────────────────


class AssetUploadResponse(BaseModel):
    """Upload sonucu."""
    status: str  # "uploaded"
    asset_id: str
    name: str
    asset_type: str
    size_bytes: int
    message: str
