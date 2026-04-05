"""
Content Library Schemas — M21-D.

Birlesik icerik kutuphanesi icin Pydantic modelleri.
Standard Video ve News Bulletin kayitlarini tek formatta dondurur.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class ContentLibraryItem(BaseModel):
    """Birlesik icerik kaydi."""
    id: str
    content_type: str  # "standard_video" veya "news_bulletin"
    title: Optional[str] = None
    topic: str
    status: str
    created_at: datetime
    has_script: bool = False
    has_metadata: bool = False


class ContentLibraryResponse(BaseModel):
    """Birlesik icerik kutuphanesi yaniti."""
    total: int
    offset: int
    limit: int
    items: List[ContentLibraryItem]
