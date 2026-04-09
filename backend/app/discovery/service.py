"""
Discovery service — unified search across ContentHub entities.

Searches: jobs, standard_videos, news_bulletins, assets, templates,
style_blueprints, sources, news_items.

Uses ilike pattern matching. Caps results per category at `limit`.
"""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Job,
    StandardVideo,
    NewsBulletin,
    Template,
    StyleBlueprint,
    NewsSource,
    NewsItem,
)
from app.discovery.schemas import DiscoveryResult

logger = logging.getLogger(__name__)


async def search_all(
    db: AsyncSession,
    query: str,
    limit: int = 5,
) -> list[DiscoveryResult]:
    """
    Tüm entity kategorilerinde arama yapar.

    Her kategori için en fazla `limit` sonuç döner.
    """
    pattern = f"%{query}%"
    results: list[DiscoveryResult] = []

    # --- Jobs: module_type veya id üzerinde arama ---
    job_stmt = (
        select(Job)
        .where(Job.module_type.ilike(pattern) | Job.id.ilike(pattern))
        .order_by(Job.created_at.desc())
        .limit(limit)
    )
    job_rows = await db.execute(job_stmt)
    for job in job_rows.scalars().all():
        results.append(DiscoveryResult(
            id=job.id,
            label=f"{job.module_type} — {job.id[:8]}",
            category="job",
            route=f"/admin/jobs/{job.id}",
            status=job.status,
            snippet=f"Modül: {job.module_type}, Retry: {job.retry_count}",
            icon="briefcase",
        ))

    # --- Standard Videos: title veya topic üzerinde arama ---
    sv_stmt = (
        select(StandardVideo)
        .where(
            StandardVideo.title.ilike(pattern) | StandardVideo.topic.ilike(pattern)
        )
        .order_by(StandardVideo.created_at.desc())
        .limit(limit)
    )
    sv_rows = await db.execute(sv_stmt)
    for sv in sv_rows.scalars().all():
        results.append(DiscoveryResult(
            id=sv.id,
            label=sv.title or sv.topic,
            category="content",
            route=f"/admin/content/standard-video/{sv.id}",
            status=sv.status,
            snippet=f"Standard Video — {sv.topic[:80]}" if sv.topic else None,
            icon="video",
        ))

    # --- News Bulletins: title veya topic üzerinde arama ---
    nb_stmt = (
        select(NewsBulletin)
        .where(
            NewsBulletin.title.ilike(pattern) | NewsBulletin.topic.ilike(pattern)
        )
        .order_by(NewsBulletin.created_at.desc())
        .limit(limit)
    )
    nb_rows = await db.execute(nb_stmt)
    for nb in nb_rows.scalars().all():
        results.append(DiscoveryResult(
            id=nb.id,
            label=nb.title or nb.topic,
            category="content",
            route=f"/admin/content/news-bulletin/{nb.id}",
            status=nb.status,
            snippet=f"News Bulletin — {nb.topic[:80]}" if nb.topic else None,
            icon="newspaper",
        ))

    # --- Templates: name üzerinde arama ---
    tmpl_stmt = (
        select(Template)
        .where(Template.name.ilike(pattern))
        .order_by(Template.created_at.desc())
        .limit(limit)
    )
    tmpl_rows = await db.execute(tmpl_stmt)
    for t in tmpl_rows.scalars().all():
        results.append(DiscoveryResult(
            id=t.id,
            label=t.name,
            category="template",
            route=f"/admin/templates/{t.id}",
            status=t.status,
            snippet=f"{t.template_type} — {t.owner_scope}",
            icon="layout",
        ))

    # --- Style Blueprints: name üzerinde arama ---
    sb_stmt = (
        select(StyleBlueprint)
        .where(StyleBlueprint.name.ilike(pattern))
        .order_by(StyleBlueprint.created_at.desc())
        .limit(limit)
    )
    sb_rows = await db.execute(sb_stmt)
    for sb in sb_rows.scalars().all():
        results.append(DiscoveryResult(
            id=sb.id,
            label=sb.name,
            category="style_blueprint",
            route=f"/admin/style-blueprints/{sb.id}",
            status=sb.status,
            snippet=f"v{sb.version}" + (f" — {sb.module_scope}" if sb.module_scope else ""),
            icon="palette",
        ))

    # --- Sources: name üzerinde arama ---
    src_stmt = (
        select(NewsSource)
        .where(NewsSource.name.ilike(pattern))
        .order_by(NewsSource.created_at.desc())
        .limit(limit)
    )
    src_rows = await db.execute(src_stmt)
    for src in src_rows.scalars().all():
        results.append(DiscoveryResult(
            id=src.id,
            label=src.name,
            category="source",
            route=f"/admin/sources/{src.id}",
            status=src.status,
            snippet=f"{src.source_type}" + (f" — {src.category}" if src.category else ""),
            icon="rss",
        ))

    # --- News Items: title üzerinde arama ---
    ni_stmt = (
        select(NewsItem)
        .where(NewsItem.title.ilike(pattern))
        .order_by(NewsItem.created_at.desc())
        .limit(limit)
    )
    ni_rows = await db.execute(ni_stmt)
    for ni in ni_rows.scalars().all():
        results.append(DiscoveryResult(
            id=ni.id,
            label=ni.title[:120] if ni.title else ni.id,
            category="news_item",
            route=f"/admin/news-items/{ni.id}",
            status=ni.status,
            snippet=ni.summary[:100] if ni.summary else None,
            icon="file-text",
        ))

    # --- Assets: dosya-bazlı arama (disk taraması yerine DB job workspace) ---
    # Assets DB'de değil disk'te yaşıyor. Discovery için asset aramasını
    # mevcut asset service üzerinden yapıyoruz.
    try:
        from app.assets.service import list_assets as _list_assets
        asset_result = await _list_assets(
            session=db,
            search=query,
            limit=limit,
            offset=0,
        )
        for asset in asset_result.get("items", []):
            asset_id = asset.get("id", "")
            results.append(DiscoveryResult(
                id=asset_id,
                label=asset.get("name", ""),
                category="asset",
                route=f"/admin/assets/{asset_id}",
                status=None,
                snippet=f"{asset.get('asset_type', '')} — {asset.get('job_id', 'uploads')}",
                icon="file",
            ))
    except Exception as exc:
        logger.warning("Asset discovery scan failed: %s", exc)

    return results
