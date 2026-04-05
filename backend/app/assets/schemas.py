"""
Asset Schemas — M19-A.

Salt-okunur workspace disk taramasi ile uretilen asset index icin
Pydantic modelleri.
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
