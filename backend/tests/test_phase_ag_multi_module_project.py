"""
PHASE AG — ContentProject modul-ustu konteyner davranisi.

Bu turda kapatmamiz gereken kontratlar:
  1. Create project without module_type -> "mixed" yazilir.
  2. Legacy project (module_type="standard_video") hala calisir.
  3. Ayni project altinda 3 farkli module'den job acilabilir
     (news_bulletin + standard_video + product_review).
  4. /summary by_module karma projelerde dogru sayar.
  5. /summary ayni proje icin mixed olsa bile ownership dogru calisir
     (baska kullanici 403).
  6. Publish by-project mixed projede de project-scope verir (sadece o
     projeye ait publish kayitlari).
  7. Mixed proje icin full-auto tetikleme "mixed project" gerekcesiyle
     acik sekilde reddedilir (pause + warning mantigi).
  8. Non-admin kullanici content_project_id olmadan is acamaz (orphan
     guard).
  9. Update project: module_type alani update sema'sinda yok -> degismez,
     ama diger alanlar update edilebilir.
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
BASE_PUBLISH = "/api/v1/publish"
BASE_JOBS = "/api/v1/jobs"


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


async def _seed_legacy_project(
    db: AsyncSession,
    owner: User,
    channel: ChannelProfile,
    *,
    title: str,
    module: str,
) -> ContentProject:
    """PHASE AG oncesi semayla yaratilmis (legacy) proje: module_type dolu."""
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
    db: AsyncSession,
    owner: User,
    project: ContentProject,
    *,
    module: str,
    status: str = "completed",
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
# 1) Create project without module_type -> "mixed"
# ---------------------------------------------------------------------------


async def test_create_project_without_module_type_defaults_to_mixed(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    ch = await _seed_channel(db_session, regular_user, slug="ag-nomod")

    payload = {
        "user_id": regular_user.id,
        "channel_profile_id": ch.id,
        "title": "Modul-ustu proje",
        # module_type kasten gonderilmiyor
    }
    resp = await client.post(BASE_PROJECTS, json=payload, headers=user_headers)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["module_type"] == "mixed"
    assert body["title"] == "Modul-ustu proje"
    assert body["user_id"] == regular_user.id


async def test_create_project_with_empty_module_type_defaults_to_mixed(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    ch = await _seed_channel(db_session, regular_user, slug="ag-empty")
    payload = {
        "user_id": regular_user.id,
        "channel_profile_id": ch.id,
        "title": "Bos modul",
        "module_type": "   ",
    }
    resp = await client.post(BASE_PROJECTS, json=payload, headers=user_headers)
    assert resp.status_code == 201, resp.text
    assert resp.json()["module_type"] == "mixed"


# ---------------------------------------------------------------------------
# 2) Legacy project (module_type="standard_video") hala calisir
# ---------------------------------------------------------------------------


async def test_legacy_project_with_concrete_module_type_still_works(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    ch = await _seed_channel(db_session, regular_user, slug="ag-legacy")
    legacy = await _seed_legacy_project(
        db_session, regular_user, ch, title="Legacy", module="standard_video"
    )

    # GET detail
    resp = await client.get(f"{BASE_PROJECTS}/{legacy.id}", headers=user_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["module_type"] == "standard_video"

    # Listede de gorunur
    resp = await client.get(BASE_PROJECTS, headers=user_headers)
    assert resp.status_code == 200
    ids = {p["id"] for p in resp.json()}
    assert legacy.id in ids


# ---------------------------------------------------------------------------
# 3) Ayni project altinda 3 modulden de job acilabilir
# ---------------------------------------------------------------------------


async def test_single_project_hosts_jobs_from_three_modules(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    ch = await _seed_channel(db_session, regular_user, slug="ag-tri")
    # Mixed proje olustur
    payload = {
        "user_id": regular_user.id,
        "channel_profile_id": ch.id,
        "title": "Karma proje",
    }
    resp = await client.post(BASE_PROJECTS, json=payload, headers=user_headers)
    assert resp.status_code == 201
    proj_id = resp.json()["id"]
    proj = await db_session.get(ContentProject, proj_id)
    assert proj is not None
    assert proj.module_type == "mixed"

    # Job'lari direkt DB'ye sokuyoruz — is create pipeline'ini bu testte
    # calistirmak yerine kontrat olarak "ayni project altinda 3 farkli module
    # kabul ediliyor mu" dogrulamasi yapiyoruz.
    j_nb = await _seed_job(db_session, regular_user, proj, module="news_bulletin", status="completed")
    j_sv = await _seed_job(db_session, regular_user, proj, module="standard_video", status="running")
    j_pr = await _seed_job(db_session, regular_user, proj, module="product_review", status="queued")

    resp = await client.get(f"{BASE_PROJECTS}/{proj_id}/jobs", headers=user_headers)
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    by_id = {r["id"]: r for r in rows}
    assert {j_nb.id, j_sv.id, j_pr.id} <= set(by_id.keys())
    assert by_id[j_nb.id]["module_type"] == "news_bulletin"
    assert by_id[j_sv.id]["module_type"] == "standard_video"
    assert by_id[j_pr.id]["module_type"] == "product_review"

    # Module filter ayri ayri da calismali
    for module in ("news_bulletin", "standard_video", "product_review"):
        resp = await client.get(
            f"{BASE_PROJECTS}/{proj_id}/jobs?module_type={module}", headers=user_headers
        )
        assert resp.status_code == 200
        ids = {r["id"] for r in resp.json()}
        assert len(ids) == 1
        assert list(resp.json())[0]["module_type"] == module


# ---------------------------------------------------------------------------
# 4) Summary by_module karma projede dogru
# ---------------------------------------------------------------------------


async def test_project_summary_by_module_counts_across_mixed_modules(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    ch = await _seed_channel(db_session, regular_user, slug="ag-sum")
    payload = {
        "user_id": regular_user.id,
        "channel_profile_id": ch.id,
        "title": "Summary mixed",
    }
    proj_id = (
        await client.post(BASE_PROJECTS, json=payload, headers=user_headers)
    ).json()["id"]
    proj = await db_session.get(ContentProject, proj_id)
    assert proj is not None

    # 2 nb completed, 1 sv completed, 1 sv failed, 1 pr queued
    await _seed_job(db_session, regular_user, proj, module="news_bulletin", status="completed")
    await _seed_job(db_session, regular_user, proj, module="news_bulletin", status="completed")
    await _seed_job(db_session, regular_user, proj, module="standard_video", status="completed")
    await _seed_job(db_session, regular_user, proj, module="standard_video", status="failed")
    await _seed_job(db_session, regular_user, proj, module="product_review", status="queued")

    resp = await client.get(f"{BASE_PROJECTS}/{proj_id}/summary", headers=user_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["jobs"]["total"] == 5
    assert body["jobs"]["by_module"]["news_bulletin"] == 2
    assert body["jobs"]["by_module"]["standard_video"] == 2
    assert body["jobs"]["by_module"]["product_review"] == 1
    assert body["jobs"]["by_status"]["completed"] == 3
    assert body["jobs"]["by_status"]["failed"] == 1
    assert body["jobs"]["by_status"]["queued"] == 1


# ---------------------------------------------------------------------------
# 5) Cross-user: mixed projenin jobs/summary/detail 403
# ---------------------------------------------------------------------------


async def test_cross_user_cannot_see_mixed_project_jobs(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User,
    user_headers: dict,
):
    ch = await _seed_channel(db_session, admin_user, slug="ag-xuser")
    proj = ContentProject(
        user_id=admin_user.id,
        channel_profile_id=ch.id,
        title="Admin karma",
        module_type="mixed",
        content_status="draft",
        review_status="not_required",
        publish_status="unpublished",
        origin_type="original",
        priority="normal",
    )
    db_session.add(proj)
    await db_session.commit()
    await db_session.refresh(proj)

    await _seed_job(db_session, admin_user, proj, module="news_bulletin", status="completed")

    for path in (
        f"{BASE_PROJECTS}/{proj.id}",
        f"{BASE_PROJECTS}/{proj.id}/jobs",
        f"{BASE_PROJECTS}/{proj.id}/summary",
    ):
        resp = await client.get(path, headers=user_headers)
        assert resp.status_code == 403, f"{path}: {resp.status_code} {resp.text}"


# ---------------------------------------------------------------------------
# 6) Publish by-project mixed projede scope korunur
# ---------------------------------------------------------------------------


async def test_publish_by_project_remains_scoped_for_mixed_project(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    ch = await _seed_channel(db_session, regular_user, slug="ag-pub")
    # Iki mixed proje: kayitlarin kesin olarak proje bazinda bolunmesi
    # gerek.
    p1_id = (
        await client.post(
            BASE_PROJECTS,
            json={
                "user_id": regular_user.id,
                "channel_profile_id": ch.id,
                "title": "P1 karma",
            },
            headers=user_headers,
        )
    ).json()["id"]
    p2_id = (
        await client.post(
            BASE_PROJECTS,
            json={
                "user_id": regular_user.id,
                "channel_profile_id": ch.id,
                "title": "P2 karma",
            },
            headers=user_headers,
        )
    ).json()["id"]
    p1 = await db_session.get(ContentProject, p1_id)
    p2 = await db_session.get(ContentProject, p2_id)
    assert p1 is not None and p2 is not None

    # Farkli modullerden jobs + publish records
    j1 = await _seed_job(db_session, regular_user, p1, module="news_bulletin", status="completed")
    j2 = await _seed_job(db_session, regular_user, p2, module="standard_video", status="completed")
    mine = PublishRecord(
        job_id=j1.id,
        content_ref_type="news_bulletin",
        content_ref_id=p1.id,
        platform="youtube",
        status="draft",
        content_project_id=p1.id,
    )
    other = PublishRecord(
        job_id=j2.id,
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
    ids = {r["id"] for r in resp.json()}
    assert mine.id in ids
    assert other.id not in ids


# ---------------------------------------------------------------------------
# 7) Mixed project full-auto = pause + warning
# ---------------------------------------------------------------------------


async def test_full_auto_rejects_mixed_project_with_explicit_reason(
    db_session: AsyncSession,
    regular_user: User,
):
    """
    Guard evaluation birim testi: mixed proje icin evaluate_guards, "modul-ustu
    proje icin belirli bir modul secilmeli" gerekcesiyle acik reddetmeli
    (sessiz kosmak yok).
    """
    from app.full_auto.service import evaluate_guards

    ch = await _seed_channel(db_session, regular_user, slug="ag-fa")
    proj = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=ch.id,
        title="Mixed fa",
        module_type="mixed",
        content_status="draft",
        review_status="not_required",
        publish_status="unpublished",
        origin_type="original",
        priority="normal",
        automation_enabled=True,
    )
    db_session.add(proj)
    await db_session.commit()
    await db_session.refresh(proj)

    result = await evaluate_guards(db_session, proj)
    # En az bir violation "karma" / "mixed" gerekcesiyle gelmeli.
    assert any(
        ("karma" in v.lower() or "modul-ustu" in v.lower() or "mixed" in v.lower())
        for v in result.violations
    ), f"violations: {result.violations}"


async def test_full_auto_rejects_null_module_type_as_mixed(
    db_session: AsyncSession,
    regular_user: User,
):
    from app.full_auto.service import evaluate_guards

    ch = await _seed_channel(db_session, regular_user, slug="ag-fa-null")
    # module_type=None -> PHASE AG migrasyon sonrasi nullable; legacy cikis
    proj = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=ch.id,
        title="Null mod",
        module_type=None,
        content_status="draft",
        review_status="not_required",
        publish_status="unpublished",
        origin_type="original",
        priority="normal",
        automation_enabled=True,
    )
    db_session.add(proj)
    await db_session.commit()
    await db_session.refresh(proj)

    result = await evaluate_guards(db_session, proj)
    assert any(
        ("karma" in v.lower() or "modul-ustu" in v.lower() or "mixed" in v.lower())
        for v in result.violations
    ), f"violations: {result.violations}"


# ---------------------------------------------------------------------------
# 8) Orphan job guard: non-admin content_project_id olmadan is acamaz
# ---------------------------------------------------------------------------


async def test_non_admin_cannot_create_orphan_job(
    client: AsyncClient,
    user_headers: dict,
):
    payload = {
        "module_id": "standard_video",
        "topic": "orphan test",
        "language": "tr",
        "duration_seconds": 30,
        # content_project_id kasten yok
    }
    resp = await client.post(BASE_JOBS, json=payload, headers=user_headers)
    # 422 kabul: content_project_id zorunlu
    assert resp.status_code == 422, resp.text
    assert "content_project_id" in resp.text.lower()


# ---------------------------------------------------------------------------
# 9) Update project: module_type update'inde bulunmaz -> bozulmaz; diger
#    alanlar degistirilebilir
# ---------------------------------------------------------------------------


async def test_update_project_does_not_break_module_type(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    ch = await _seed_channel(db_session, regular_user, slug="ag-upd")
    payload = {
        "user_id": regular_user.id,
        "channel_profile_id": ch.id,
        "title": "Update edilecek",
    }
    proj_id = (
        await client.post(BASE_PROJECTS, json=payload, headers=user_headers)
    ).json()["id"]

    # Update: baska bir alan degistirelim — module_type update sema'sinda
    # zaten yok, degismemeli.
    resp = await client.patch(
        f"{BASE_PROJECTS}/{proj_id}",
        json={"title": "Yeni baslik", "priority": "high"},
        headers=user_headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["title"] == "Yeni baslik"
    assert body["priority"] == "high"
    assert body["module_type"] == "mixed"
