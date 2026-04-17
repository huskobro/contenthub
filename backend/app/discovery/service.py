"""
Discovery service — unified search across ContentHub entities
+ Phase Final F2.2 ownership scoping.

Searches: jobs, standard_videos, news_bulletins, assets, templates,
style_blueprints, sources, news_items.

Uses ilike pattern matching. Caps results per category at `limit`.

Phase Final F2.2:
  - `caller_user_id`: None => admin (no owner filter). Set => sadece bu
    user'a ait Job'lar (`Job.owner_id`) dondurulur.
  - `owned_channel_ids`: None => admin (no channel filter). Liste => sadece
    bu kanallardaki StandardVideo / NewsBulletin kayitlari dondurulur.
  - `include_admin_only`: False => templates, style_blueprints, sources,
    news_items, assets kategorileri tamamen gizlenir (non-admin).
"""

import logging
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Job,
    NewsBulletin,
    NewsItem,
    NewsSource,
    StandardVideo,
    StyleBlueprint,
    Template,
)
from app.discovery.schemas import DiscoveryResult

logger = logging.getLogger(__name__)


async def search_all(
    db: AsyncSession,
    query: str,
    limit: int = 5,
    caller_user_id: Optional[str] = None,
    owned_channel_ids: Optional[List[str]] = None,
    include_admin_only: bool = True,
) -> list[DiscoveryResult]:
    """
    Tüm entity kategorilerinde arama yapar.

    Her kategori için en fazla `limit` sonuç döner.

    Phase Final F2.2 scope'u:
      - `caller_user_id` set ise Job'lar `owner_id` ile filtrelenir.
      - `owned_channel_ids` set ise content (SV/NB) ilgili kanallara
        kisitlanir. Bos liste => content dondurulmez.
      - `include_admin_only` False ise templates/sources/news_items/assets
        aramadan cikarilir (non-admin).
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
    if caller_user_id is not None:
        job_stmt = job_stmt.where(Job.owner_id == caller_user_id)
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

    # --- Content (Standard Video + News Bulletin): channel scope uygulanir.
    # Non-admin ve hic kanal yok => content kategorisi tamamen bos.
    content_scope_blocks = (
        owned_channel_ids is not None and not owned_channel_ids
    )

    if not content_scope_blocks:
        # Standard Videos
        sv_stmt = (
            select(StandardVideo)
            .where(
                StandardVideo.title.ilike(pattern)
                | StandardVideo.topic.ilike(pattern)
            )
            .order_by(StandardVideo.created_at.desc())
            .limit(limit)
        )
        if owned_channel_ids is not None:
            sv_stmt = sv_stmt.where(
                StandardVideo.channel_profile_id.in_(owned_channel_ids)
            )
        sv_rows = await db.execute(sv_stmt)
        for sv in sv_rows.scalars().all():
            results.append(DiscoveryResult(
                id=sv.id,
                label=sv.title or sv.topic,
                category="content",
                route=f"/admin/content/standard-video/{sv.id}",
                status=sv.status,
                snippet=(
                    f"Standard Video — {sv.topic[:80]}" if sv.topic else None
                ),
                icon="video",
            ))

        # News Bulletins
        nb_stmt = (
            select(NewsBulletin)
            .where(
                NewsBulletin.title.ilike(pattern)
                | NewsBulletin.topic.ilike(pattern)
            )
            .order_by(NewsBulletin.created_at.desc())
            .limit(limit)
        )
        if owned_channel_ids is not None:
            nb_stmt = nb_stmt.where(
                NewsBulletin.channel_profile_id.in_(owned_channel_ids)
            )
        nb_rows = await db.execute(nb_stmt)
        for nb in nb_rows.scalars().all():
            results.append(DiscoveryResult(
                id=nb.id,
                label=nb.title or nb.topic,
                category="content",
                route=f"/admin/content/news-bulletin/{nb.id}",
                status=nb.status,
                snippet=(
                    f"News Bulletin — {nb.topic[:80]}" if nb.topic else None
                ),
                icon="newspaper",
            ))

    # --- Admin-only globals: templates / style_blueprints / sources /
    # news_items / assets. Non-admin icin tamamen gizli.
    if include_admin_only:
        # Templates
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

        # Style Blueprints
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
                snippet=(
                    f"v{sb.version}"
                    + (f" — {sb.module_scope}" if sb.module_scope else "")
                ),
                icon="palette",
            ))

        # Sources
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
                snippet=(
                    f"{src.source_type}"
                    + (f" — {src.category}" if src.category else "")
                ),
                icon="rss",
            ))

        # News Items
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

        # Assets — diskten dosya bazli arama (admin-only global library).
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
                    snippet=(
                        f"{asset.get('asset_type', '')} — "
                        f"{asset.get('job_id', 'uploads')}"
                    ),
                    icon="file",
                ))
        except Exception as exc:
            logger.warning("Asset discovery scan failed: %s", exc)

    return results
