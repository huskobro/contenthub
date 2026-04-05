"""
Content Library Service — M21-D.

Standard Video ve News Bulletin kayitlarini birlesik tek endpoint
uzerinden sunar. Backend-side filtreleme, arama ve sayfalama.
"""

from typing import Optional, List

from sqlalchemy import select, union_all, literal_column, func as sqlfunc, case, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    StandardVideo,
    StandardVideoScript,
    StandardVideoMetadata,
    NewsBulletin,
    NewsBulletinScript,
    NewsBulletinMetadata,
)


async def list_content_library(
    db: AsyncSession,
    content_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """
    Birlesik icerik kutuphanesi sorgulama.

    İki modülü (standard_video + news_bulletin) UNION ALL ile birlestirir.
    Tam backend-side filtreleme ve sayfalama.

    Parameters:
      content_type: "standard_video" veya "news_bulletin" (None = hepsi)
      status: durum filtresi
      search: baslik/konu arama (ilike)
      limit: sayfalama limiti
      offset: sayfalama offset'i
    """
    items = []
    total = 0

    # Standard Video query
    if content_type is None or content_type == "standard_video":
        sv_stmt = select(StandardVideo).order_by(StandardVideo.created_at.desc())
        if status:
            sv_stmt = sv_stmt.where(StandardVideo.status == status)
        if search:
            pattern = f"%{search}%"
            sv_stmt = sv_stmt.where(
                StandardVideo.title.ilike(pattern) | StandardVideo.topic.ilike(pattern)
            )

        # Count
        sv_count_stmt = select(sqlfunc.count()).select_from(sv_stmt.subquery())
        sv_count = (await db.execute(sv_count_stmt)).scalar() or 0
        total += sv_count

        # Fetch — burada tum SV'leri aliyoruz
        sv_rows = (await db.execute(sv_stmt)).scalars().all()

        for v in sv_rows:
            # has_script
            script_row = await db.execute(
                select(sqlfunc.count()).select_from(StandardVideoScript)
                .where(StandardVideoScript.standard_video_id == v.id)
            )
            has_script = (script_row.scalar() or 0) > 0

            # has_metadata
            meta_row = await db.execute(
                select(sqlfunc.count()).select_from(StandardVideoMetadata)
                .where(StandardVideoMetadata.standard_video_id == v.id)
            )
            has_metadata = (meta_row.scalar() or 0) > 0

            items.append({
                "id": v.id,
                "content_type": "standard_video",
                "title": v.title,
                "topic": v.topic,
                "status": v.status,
                "created_at": v.created_at.isoformat() if v.created_at else None,
                "has_script": has_script,
                "has_metadata": has_metadata,
            })

    # News Bulletin query
    if content_type is None or content_type == "news_bulletin":
        nb_stmt = select(NewsBulletin).order_by(NewsBulletin.created_at.desc())
        if status:
            nb_stmt = nb_stmt.where(NewsBulletin.status == status)
        if search:
            pattern = f"%{search}%"
            nb_stmt = nb_stmt.where(
                NewsBulletin.title.ilike(pattern) | NewsBulletin.topic.ilike(pattern)
            )

        nb_count_stmt = select(sqlfunc.count()).select_from(nb_stmt.subquery())
        nb_count = (await db.execute(nb_count_stmt)).scalar() or 0
        total += nb_count

        nb_rows = (await db.execute(nb_stmt)).scalars().all()

        for b in nb_rows:
            script_row = await db.execute(
                select(sqlfunc.count()).select_from(NewsBulletinScript)
                .where(NewsBulletinScript.news_bulletin_id == b.id)
            )
            has_script = (script_row.scalar() or 0) > 0

            meta_row = await db.execute(
                select(sqlfunc.count()).select_from(NewsBulletinMetadata)
                .where(NewsBulletinMetadata.news_bulletin_id == b.id)
            )
            has_metadata = (meta_row.scalar() or 0) > 0

            items.append({
                "id": b.id,
                "content_type": "news_bulletin",
                "title": b.title,
                "topic": b.topic,
                "status": b.status,
                "created_at": b.created_at.isoformat() if b.created_at else None,
                "has_script": has_script,
                "has_metadata": has_metadata,
            })

    # Birlesik siralama (en yeni once)
    items.sort(key=lambda x: x.get("created_at") or "", reverse=True)

    # Backend-side sayfalama
    paginated = items[offset:offset + limit]

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": paginated,
    }
