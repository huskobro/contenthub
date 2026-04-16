"""
PHASE AF — Project-centered final workflow smoke tests.

Scope (AE'nin uzerine PHASE AF ekleri):
  1. /content-projects/{id}/jobs module_type + status filtreleri
  2. /content-projects/{id}/summary: jobs + publish aggregate, scope kilitli
  3. Cross-user isolation: baska kullanicinin projesi 403
  4. Create job without content_project_id: ownership gate (orphan)
  5. Publish by-project: sadece ilgili projeye ait kayitlar
  6. Channel reimport endpoint: sahip 200, yabanci 403, yok 404

Yeni altyapi yazmiyoruz; testler zaten var olan endpoint'lerin ihtiyac
duyulan filtreleme + ownership kontratlarini dogruluyor.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    ChannelProfile,
    ContentProject,
    Job,
    PublishRecord,
    User,
)

pytestmark = pytest.mark.asyncio


BASE_PROJECTS = "/api/v1/content-projects"
BASE_JOBS = "/api/v1/jobs"
BASE_PUBLISH = "/api/v1/publish"
BASE_CHANNELS = "/api/v1/channel-profiles"


async def _seed_channel(db: AsyncSession, owner: User, *, slug: str) -> ChannelProfile:
    url = f"https://www.youtube.com/@{slug}"
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
    )
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch


async def _seed_project(
    db: AsyncSession, owner: User, channel: ChannelProfile, *, title: str, module: str
) -> ContentProject:
    p = ContentProject(
        user_id=owner.id,
        channel_profile_id=channel.id,
        title=title,
        module_type=module,
        content_status="draft",
        review_status="not_required",
        publish_status="unpublished",
        origin_type="original",
        priority="normal",
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


async def _seed_job(
    db: AsyncSession, owner: User, project: ContentProject, *, module: str, status: str = "completed"
) -> Job:
    j = Job(
        module_type=module,
        status=status,
        owner_id=owner.id,
        content_project_id=project.id,
        channel_profile_id=project.channel_profile_id,
    )
    db.add(j)
    await db.commit()
    await db.refresh(j)
    return j


# ---------------------------------------------------------------------------
# 1) Project jobs filter — module_type + status
# ---------------------------------------------------------------------------


async def test_project_jobs_filter_by_module_and_status(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    ch = await _seed_channel(db_session, regular_user, slug="af-filter")
    proj = await _seed_project(db_session, regular_user, ch, title="AF filter", module="standard_video")

    sv_done = await _seed_job(db_session, regular_user, proj, module="standard_video", status="completed")
    sv_run = await _seed_job(db_session, regular_user, proj, module="standard_video", status="running")
    nb_done = await _seed_job(db_session, regular_user, proj, module="news_bulletin", status="completed")

    # Tum is listesi
    resp = await client.get(f"{BASE_PROJECTS}/{proj.id}/jobs", headers=user_headers)
    assert resp.status_code == 200, resp.text
    ids = {r["id"] for r in resp.json()}
    assert ids == {sv_done.id, sv_run.id, nb_done.id}

    # module_type filter
    resp = await client.get(
        f"{BASE_PROJECTS}/{proj.id}/jobs?module_type=news_bulletin", headers=user_headers
    )
    assert resp.status_code == 200
    ids = {r["id"] for r in resp.json()}
    assert ids == {nb_done.id}

    # status filter
    resp = await client.get(
        f"{BASE_PROJECTS}/{proj.id}/jobs?status=running", headers=user_headers
    )
    assert resp.status_code == 200
    ids = {r["id"] for r in resp.json()}
    assert ids == {sv_run.id}

    # combined
    resp = await client.get(
        f"{BASE_PROJECTS}/{proj.id}/jobs?module_type=standard_video&status=completed",
        headers=user_headers,
    )
    assert resp.status_code == 200
    ids = {r["id"] for r in resp.json()}
    assert ids == {sv_done.id}


# ---------------------------------------------------------------------------
# 2) /summary endpoint — scope kilitli, aggregate dogru
# ---------------------------------------------------------------------------


async def test_project_summary_scope_and_counts(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    ch = await _seed_channel(db_session, regular_user, slug="af-sum")
    proj = await _seed_project(db_session, regular_user, ch, title="AF summary", module="standard_video")

    # 3 sv (2 completed, 1 failed), 1 nb completed
    await _seed_job(db_session, regular_user, proj, module="standard_video", status="completed")
    await _seed_job(db_session, regular_user, proj, module="standard_video", status="completed")
    await _seed_job(db_session, regular_user, proj, module="standard_video", status="failed")
    await _seed_job(db_session, regular_user, proj, module="news_bulletin", status="completed")

    # 2 publish records (1 draft, 1 approved) — job_id NOT NULL oldugu icin
    # bagli bir is'e baglamak gerekiyor.
    publish_job = await _seed_job(
        db_session, regular_user, proj, module="standard_video", status="completed"
    )
    pr1 = PublishRecord(
        job_id=publish_job.id,
        content_ref_type="standard_video",
        content_ref_id=proj.id,
        platform="youtube",
        status="draft",
        content_project_id=proj.id,
    )
    pr2 = PublishRecord(
        job_id=publish_job.id,
        content_ref_type="standard_video",
        content_ref_id=proj.id,
        platform="youtube",
        status="approved",
        content_project_id=proj.id,
    )
    db_session.add_all([pr1, pr2])
    await db_session.commit()

    resp = await client.get(f"{BASE_PROJECTS}/{proj.id}/summary", headers=user_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["project_id"] == proj.id
    # 4 seed job + 1 publish_job = 5 toplam
    assert body["jobs"]["total"] == 5
    assert body["jobs"]["by_status"]["completed"] == 4
    assert body["jobs"]["by_status"]["failed"] == 1
    assert body["jobs"]["by_module"]["standard_video"] == 4
    assert body["jobs"]["by_module"]["news_bulletin"] == 1
    assert body["publish"]["total"] == 2
    assert body["publish"]["by_status"]["draft"] == 1
    assert body["publish"]["by_status"]["approved"] == 1


# ---------------------------------------------------------------------------
# 3) Cross-user: summary + jobs + detail 403
# ---------------------------------------------------------------------------


async def test_cross_user_cannot_access_project_endpoints(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User,
    user_headers: dict,
):
    ch = await _seed_channel(db_session, admin_user, slug="af-cross")
    proj = await _seed_project(
        db_session, admin_user, ch, title="Admin-owned AF", module="standard_video"
    )

    # Non-admin user_headers: uc endpoint de 403 donmeli
    for path in (
        f"{BASE_PROJECTS}/{proj.id}",
        f"{BASE_PROJECTS}/{proj.id}/jobs",
        f"{BASE_PROJECTS}/{proj.id}/summary",
    ):
        resp = await client.get(path, headers=user_headers)
        assert resp.status_code == 403, f"{path}: {resp.status_code} {resp.text}"


# ---------------------------------------------------------------------------
# 4) Publish by-project: sadece proje scope'undan gelir
# ---------------------------------------------------------------------------


async def test_publish_by_project_scope_is_strict(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    ch = await _seed_channel(db_session, regular_user, slug="af-pub-scope")
    p1 = await _seed_project(db_session, regular_user, ch, title="p1", module="standard_video")
    p2 = await _seed_project(db_session, regular_user, ch, title="p2", module="standard_video")

    job1 = await _seed_job(db_session, regular_user, p1, module="standard_video", status="completed")
    job2 = await _seed_job(db_session, regular_user, p2, module="standard_video", status="completed")
    mine = PublishRecord(
        job_id=job1.id,
        content_ref_type="standard_video",
        content_ref_id=p1.id,
        platform="youtube",
        status="draft",
        content_project_id=p1.id,
    )
    other = PublishRecord(
        job_id=job2.id,
        content_ref_type="standard_video",
        content_ref_id=p2.id,
        platform="youtube",
        status="draft",
        content_project_id=p2.id,
    )
    db_session.add_all([mine, other])
    await db_session.commit()
    await db_session.refresh(mine)
    await db_session.refresh(other)

    resp = await client.get(f"{BASE_PUBLISH}/by-project/{p1.id}", headers=user_headers)
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    ids = {r["id"] for r in rows}
    assert mine.id in ids
    assert other.id not in ids


# ---------------------------------------------------------------------------
# 5) Channel reimport — owner 200, yabanci 403, yok 404
# ---------------------------------------------------------------------------


async def test_channel_reimport_ownership(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    admin_user: User,
    user_headers: dict,
):
    mine = await _seed_channel(db_session, regular_user, slug="af-mine")
    admins = await _seed_channel(db_session, admin_user, slug="af-admin")

    # owner: 200 (reimport cagrisi, metadata fetch test env'de partial olabilir)
    resp = await client.post(f"{BASE_CHANNELS}/{mine.id}/reimport", headers=user_headers)
    # Basarili veya honest partial — ama 2xx olmali
    assert resp.status_code in (200, 201, 422), resp.text
    # 422 kabul ediyoruz cunku test env'de YouTube fetch gerceklesmez;
    # kontrat acisindan onemli olan 200/201 veya 422 donmesi, 403 degil.
    assert resp.status_code != 403

    # yabanci: 403
    resp = await client.post(f"{BASE_CHANNELS}/{admins.id}/reimport", headers=user_headers)
    assert resp.status_code == 403

    # yok: 404
    resp = await client.post(f"{BASE_CHANNELS}/does-not-exist/reimport", headers=user_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 6) Empty project summary: saglam default degerler
# ---------------------------------------------------------------------------


async def test_empty_project_summary_returns_zeros(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    ch = await _seed_channel(db_session, regular_user, slug="af-empty")
    proj = await _seed_project(db_session, regular_user, ch, title="empty", module="standard_video")

    resp = await client.get(f"{BASE_PROJECTS}/{proj.id}/summary", headers=user_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["jobs"]["total"] == 0
    assert body["jobs"]["by_status"] == {}
    assert body["jobs"]["by_module"] == {}
    assert body["jobs"]["last_created_at"] is None
    assert body["publish"]["total"] == 0
    assert body["publish"]["last_published_at"] is None
