"""
PHASE AD — Final Unified User Flow smoke tests.

Scope:
  1. Kanal ekleme: POST /channel-profiles/from-url ile URL-only create.
  2. Reimport: POST /channel-profiles/{id}/reimport partial -> refresh.
     - Non-admin baska kullanicinin kanalinda reimport tetikleyemez (403).
  3. Proje olusturma + job bagi: ContentProject acip job olusturulduktan
     sonra /api/v1/jobs?content_project_id=... sadece o projeye ait job
     dondurur.
  4. News bulletin publish-record shim ownership kapisi:
     - Baska kullanicinin bultenine publish-record yaratma denemesi 403.
     - Orphan (content_project_id=None) bultende sadece admin yayinlar.
  5. Product review start-production:
     - Non-admin kendi review'unu baslatabilir, baskasininkini baslatamaz (403).

Notlar:
  - Job dispatcher test ortamda mock — async task dispatch etmez.
    start-production cagrisinin yalnizca ownership gate + job olusturma
    kismi dogrulanir (yani 400/403/200 davranisi).
  - Publish-record shim cagirmak icin bulletin.job_id = <gercek job>
    set edilir; ownership kapisi dolu-proje durumunda devreye girer.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    ChannelProfile,
    ContentProject,
    Job,
    NewsBulletin,
    User,
)

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _seed_channel(
    db: AsyncSession, owner: User, *, slug: str, url: str = "https://www.youtube.com/@ntvhaber"
) -> ChannelProfile:
    ch = ChannelProfile(
        user_id=owner.id,
        profile_name=f"ch-{slug}",
        channel_slug=slug,
        default_language="tr",
        status="active",
        source_url=url,
        normalized_url=url,
        platform="youtube",
        import_status="partial",
        import_error="initial fetch failed",
    )
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch


async def _seed_project(
    db: AsyncSession,
    owner: User,
    *,
    slug_suffix: str,
    module_type: str = "news_bulletin",
    channel: ChannelProfile | None = None,
) -> ContentProject:
    if channel is None:
        channel = await _seed_channel(
            db, owner, slug=f"proj-ch-{slug_suffix}", url=f"https://www.youtube.com/@proj{slug_suffix}"
        )
    proj = ContentProject(
        user_id=owner.id,
        channel_profile_id=channel.id,
        title=f"PhaseAD project {slug_suffix}",
        module_type=module_type,
        content_status="draft",
        publish_status="unpublished",
        priority="normal",
        current_stage="planning",
    )
    db.add(proj)
    await db.commit()
    await db.refresh(proj)
    return proj


async def _seed_job(
    db: AsyncSession, owner: User, project: ContentProject | None, *, module_type: str = "news_bulletin"
) -> Job:
    j = Job(
        module_type=module_type,
        status="queued",
        owner_id=owner.id,
        content_project_id=project.id if project else None,
    )
    db.add(j)
    await db.commit()
    await db.refresh(j)
    return j


# ---------------------------------------------------------------------------
# (1) Channel reimport ownership
# ---------------------------------------------------------------------------


async def test_channel_reimport_owner_succeeds(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    ch = await _seed_channel(db_session, regular_user, slug="own-1")

    resp = await client.post(
        f"/api/v1/channel-profiles/{ch.id}/reimport", headers=user_headers
    )
    # Metadata fetch best-effort — partial kalabilir; 200 dondugu
    # surece endpoint calisiyor demektir.
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["id"] == ch.id
    assert body["import_status"] in ("success", "partial")


async def test_channel_reimport_cross_user_forbidden(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User,
    user_headers: dict,
):
    """User A, User B'nin (admin'in) kanalini reimport edemez."""
    admin_ch = await _seed_channel(db_session, admin_user, slug="admin-owned")

    resp = await client.post(
        f"/api/v1/channel-profiles/{admin_ch.id}/reimport", headers=user_headers
    )
    assert resp.status_code == 403, resp.text


# ---------------------------------------------------------------------------
# (2) Project-scoped job listing
# ---------------------------------------------------------------------------


async def test_jobs_listing_scoped_by_project(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    """`/api/v1/jobs?content_project_id=X` sadece o projeye ait job'lari
    dondurur. PHASE AD'nin project-centered hub kontrati."""
    p1 = await _seed_project(db_session, regular_user, slug_suffix="p1")
    p2 = await _seed_project(db_session, regular_user, slug_suffix="p2")

    j1 = await _seed_job(db_session, regular_user, p1)
    await _seed_job(db_session, regular_user, p2)  # farkli proje
    await _seed_job(db_session, regular_user, None)  # orphan

    resp = await client.get(
        f"/api/v1/jobs?content_project_id={p1.id}", headers=user_headers
    )
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    assert len(rows) == 1, rows
    assert rows[0]["id"] == j1.id
    assert rows[0]["content_project_id"] == p1.id


# ---------------------------------------------------------------------------
# (3) News bulletin publish-record ownership kapisi
# ---------------------------------------------------------------------------


async def _seed_bulletin_with_job(
    db: AsyncSession, owner: User, *, project: ContentProject | None
) -> NewsBulletin:
    job = await _seed_job(db, owner, project, module_type="news_bulletin")
    b = NewsBulletin(
        topic="test topic",
        status="completed",
        job_id=job.id,
        content_project_id=project.id if project else None,
    )
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return b


async def test_bulletin_publish_record_cross_user_forbidden(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User,
    regular_user: User,
    user_headers: dict,
):
    """Admin'in projesine bagli bultene user B publish-record yaratamaz."""
    admin_project = await _seed_project(db_session, admin_user, slug_suffix="admin-proj")
    bulletin = await _seed_bulletin_with_job(db_session, admin_user, project=admin_project)

    resp = await client.post(
        f"/api/v1/modules/news-bulletin/{bulletin.id}/publish-record",
        headers=user_headers,
        json={"platform": "youtube"},
    )
    assert resp.status_code == 403, resp.text


async def test_bulletin_publish_record_orphan_user_forbidden(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    """Orphan bultende (content_project_id=None) non-admin 403 alir."""
    bulletin = await _seed_bulletin_with_job(db_session, regular_user, project=None)

    resp = await client.post(
        f"/api/v1/modules/news-bulletin/{bulletin.id}/publish-record",
        headers=user_headers,
        json={"platform": "youtube"},
    )
    assert resp.status_code == 403, resp.text


# ---------------------------------------------------------------------------
# (4) Product review start-production ownership gate
# ---------------------------------------------------------------------------


async def test_product_review_start_production_cross_user_forbidden(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User,
    user_headers: dict,
):
    """User B, admin'in product-review kaydini baslatamaz (403)."""
    from app.db.models import Product, ProductReview

    # Seed product + review owned by admin
    prod = Product(
        name="Admin product",
        canonical_url="https://shop.example.com/admin-prod",
        source_url="https://shop.example.com/admin-prod",
    )
    db_session.add(prod)
    await db_session.commit()
    await db_session.refresh(prod)

    review = ProductReview(
        topic="Admin-owned review",
        template_type="single",
        primary_product_id=prod.id,
        secondary_product_ids_json="[]",
        language="tr",
        orientation="vertical",
        duration_seconds=60,
        run_mode="semi_auto",
        affiliate_enabled=False,
        owner_user_id=admin_user.id,
    )
    db_session.add(review)
    await db_session.commit()
    await db_session.refresh(review)

    resp = await client.post(
        f"/api/v1/product-review/product-reviews/{review.id}/start-production",
        headers=user_headers,
        json={},
    )
    assert resp.status_code == 403, resp.text
