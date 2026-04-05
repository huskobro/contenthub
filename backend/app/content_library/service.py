"""
Content Library Service — M21-D + M22-D hardened.

Standard Video ve News Bulletin kayitlarini birlesik tek endpoint
uzerinden sunar. Backend-side filtreleme, arama ve sayfalama.

M22-D: SQL tarafinda UNION ALL ile birlesim, sort ve sayfalama.
Eski Python-side merge/sort/paginate kaldirildi.
"""

from typing import Optional

from sqlalchemy import text, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession


async def list_content_library(
    db: AsyncSession,
    content_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """
    Birlesik icerik kutuphanesi sorgulama — SQL UNION ALL.

    M22-D: Tum filtreleme, siralama ve sayfalama SQL tarafinda yapilir.
    has_script ve has_metadata icin correlated subquery kullanilir.
    """

    # Build WHERE clause fragments
    where_clauses_sv = ["1=1"]
    where_clauses_nb = ["1=1"]
    params: dict = {}

    if status:
        where_clauses_sv.append("sv.status = :status")
        where_clauses_nb.append("nb.status = :status")
        params["status"] = status

    if search:
        where_clauses_sv.append("(sv.title LIKE :search_pattern OR sv.topic LIKE :search_pattern)")
        where_clauses_nb.append("(nb.title LIKE :search_pattern OR nb.topic LIKE :search_pattern)")
        params["search_pattern"] = f"%{search}%"

    sv_where = " AND ".join(where_clauses_sv)
    nb_where = " AND ".join(where_clauses_nb)

    # SV subquery
    sv_sql = f"""
        SELECT
            sv.id,
            'standard_video' AS content_type,
            sv.title,
            sv.topic,
            sv.status,
            sv.created_at,
            CASE WHEN EXISTS (
                SELECT 1 FROM standard_video_scripts svs
                WHERE svs.standard_video_id = sv.id
            ) THEN 1 ELSE 0 END AS has_script,
            CASE WHEN EXISTS (
                SELECT 1 FROM standard_video_metadata svm
                WHERE svm.standard_video_id = sv.id
            ) THEN 1 ELSE 0 END AS has_metadata
        FROM standard_videos sv
        WHERE {sv_where}
    """

    # NB subquery
    nb_sql = f"""
        SELECT
            nb.id,
            'news_bulletin' AS content_type,
            nb.title,
            nb.topic,
            nb.status,
            nb.created_at,
            CASE WHEN EXISTS (
                SELECT 1 FROM news_bulletin_scripts nbs
                WHERE nbs.news_bulletin_id = nb.id
            ) THEN 1 ELSE 0 END AS has_script,
            CASE WHEN EXISTS (
                SELECT 1 FROM news_bulletin_metadata nbm
                WHERE nbm.news_bulletin_id = nb.id
            ) THEN 1 ELSE 0 END AS has_metadata
        FROM news_bulletins nb
        WHERE {nb_where}
    """

    # Conditional UNION based on content_type filter
    # SQLite uyumlu: parantez yok, doğrudan UNION ALL
    if content_type == "standard_video":
        union_sql = sv_sql
    elif content_type == "news_bulletin":
        union_sql = nb_sql
    else:
        union_sql = f"{sv_sql} UNION ALL {nb_sql}"

    # Count query
    count_sql = f"SELECT COUNT(*) FROM ({union_sql})"
    count_result = await db.execute(text(count_sql), params)
    total = count_result.scalar() or 0

    # Data query with sort and pagination
    data_sql = f"""
        SELECT * FROM ({union_sql})
        ORDER BY created_at DESC
        LIMIT :lim OFFSET :off
    """
    params["lim"] = limit
    params["off"] = offset

    data_result = await db.execute(text(data_sql), params)
    rows = data_result.fetchall()

    items = []
    for row in rows:
        items.append({
            "id": row[0],
            "content_type": row[1],
            "title": row[2],
            "topic": row[3],
            "status": row[4],
            "created_at": str(row[5]) if row[5] else None,
            "has_script": bool(row[6]),
            "has_metadata": bool(row[7]),
        })

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": items,
    }
