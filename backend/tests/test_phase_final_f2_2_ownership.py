"""
Phase Final F2.2 — P1 Ownership regresyon testleri.

Kapsam:
  - brand_profiles: non-admin list scope + create spoof koruma
  - calendar: non-admin events sadece kendi kanallarindan gelir
  - content_library: non-admin sadece kendi kanallarindaki icerigi gorur
  - full_auto: non-admin baska bir user'in content projesi GET/PATCH/trigger yapamaz
  - discovery: non-admin sadece kendi jobs + content'ini gorur
  - assets: non-admin yazma endpoint'leri (upload/refresh/delete) 403 doner

Strateji:
  `raw_client` ile oto-admin fallback'i devre disi; admin_headers /
  user_headers ile 403/200 yanitlari dogrulanir.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import uuid

import pytest
from httpx import AsyncClient

from app.db.models import (
    BrandProfile,
    ChannelProfile,
    ContentProject,
    Job,
    NewsBulletin,
    PlatformPost,
    StandardVideo,
)


# ---------------------------------------------------------------------------
# Yardimcilar
# ---------------------------------------------------------------------------


async def _mk_channel(db_session, owner_id: str, *, slug: str) -> ChannelProfile:
    cp = ChannelProfile(
        user_id=owner_id,
        profile_name=f"F22 Channel {slug}",
        channel_slug=slug,
    )
    db_session.add(cp)
    await db_session.commit()
    await db_session.refresh(cp)
    return cp


# ---------------------------------------------------------------------------
# F2.2 — brand_profiles ownership
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_brand_profiles_list_non_admin_scoped_to_self(
    raw_client: AsyncClient,
    db_session,
    regular_user,
    admin_user,
    user_headers: dict[str, str],
) -> None:
    """Non-admin list'te baskasinin brand profilini gormez."""
    bp_mine = BrandProfile(
        owner_user_id=regular_user.id, brand_name="MyBrand"
    )
    bp_foreign = BrandProfile(
        owner_user_id=admin_user.id, brand_name="AdminBrand"
    )
    db_session.add_all([bp_mine, bp_foreign])
    await db_session.commit()

    r = await raw_client.get(
        "/api/v1/brand-profiles",
        headers=user_headers,
        params={"owner_user_id": admin_user.id},  # spoof denemesi
    )
    assert r.status_code == 200, r.text
    ids = {item["id"] for item in r.json()}
    assert bp_mine.id in ids
    assert bp_foreign.id not in ids


@pytest.mark.asyncio
async def test_brand_profiles_create_spoof_denied(
    raw_client: AsyncClient,
    admin_user,
    user_headers: dict[str, str],
) -> None:
    """Non-admin baska user adina brand profile olusturamaz."""
    r = await raw_client.post(
        "/api/v1/brand-profiles",
        headers=user_headers,
        json={
            "owner_user_id": admin_user.id,  # spoof
            "brand_name": "Spoofed Brand",
        },
    )
    assert r.status_code == 403, r.text


# ---------------------------------------------------------------------------
# F2.2 — calendar ownership
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_calendar_events_non_admin_scoped(
    raw_client: AsyncClient,
    db_session,
    regular_user,
    admin_user,
    user_headers: dict[str, str],
) -> None:
    """Non-admin calendar sadece kendi kanallarindaki eventleri doner."""
    cp_mine = await _mk_channel(db_session, regular_user.id, slug="cal-mine")
    cp_foreign = await _mk_channel(db_session, admin_user.id, slug="cal-foreign")

    now = datetime.now(timezone.utc)
    future = now + timedelta(days=2)

    pj_mine = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=cp_mine.id,
        title="Proj MINE",
        module_type="standard_video",
        content_status="draft",
        deadline_at=future,
    )
    pj_foreign = ContentProject(
        user_id=admin_user.id,
        channel_profile_id=cp_foreign.id,
        title="Proj FOREIGN",
        module_type="standard_video",
        content_status="draft",
        deadline_at=future,
    )
    db_session.add_all([pj_mine, pj_foreign])
    await db_session.commit()

    start = (now - timedelta(days=1)).isoformat()
    end = (now + timedelta(days=7)).isoformat()
    r = await raw_client.get(
        "/api/v1/calendar/events",
        headers=user_headers,
        params={
            "start_date": start,
            "end_date": end,
            "owner_user_id": admin_user.id,  # spoof
        },
    )
    assert r.status_code == 200, r.text
    project_ids = {
        ev["related_project_id"]
        for ev in r.json()
        if ev.get("event_type") == "content_project"
    }
    assert pj_mine.id in project_ids
    assert pj_foreign.id not in project_ids


@pytest.mark.asyncio
async def test_calendar_channel_context_foreign_denied(
    raw_client: AsyncClient,
    db_session,
    admin_user,
    user_headers: dict[str, str],
) -> None:
    """Non-admin baskasinin kanal context'ini isteyemez."""
    cp_foreign = await _mk_channel(db_session, admin_user.id, slug="cal-ctx-foreign")
    r = await raw_client.get(
        f"/api/v1/calendar/channel-context/{cp_foreign.id}",
        headers=user_headers,
    )
    assert r.status_code == 403, r.text


# ---------------------------------------------------------------------------
# F2.2 — content_library ownership
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_content_library_non_admin_scoped(
    raw_client: AsyncClient,
    db_session,
    regular_user,
    admin_user,
    user_headers: dict[str, str],
) -> None:
    """Non-admin content library sadece kendi kanallarini doner."""
    cp_mine = await _mk_channel(db_session, regular_user.id, slug="cl-mine")
    cp_foreign = await _mk_channel(db_session, admin_user.id, slug="cl-foreign")

    sv_mine = StandardVideo(
        title="SV Mine",
        topic="My topic alpha",
        channel_profile_id=cp_mine.id,
        status="draft",
    )
    sv_foreign = StandardVideo(
        title="SV Foreign",
        topic="Foreign topic alpha",
        channel_profile_id=cp_foreign.id,
        status="draft",
    )
    nb_mine = NewsBulletin(
        title="NB Mine",
        topic="My bulletin alpha",
        channel_profile_id=cp_mine.id,
        status="draft",
    )
    nb_foreign = NewsBulletin(
        title="NB Foreign",
        topic="Foreign bulletin alpha",
        channel_profile_id=cp_foreign.id,
        status="draft",
    )
    db_session.add_all([sv_mine, sv_foreign, nb_mine, nb_foreign])
    await db_session.commit()

    r = await raw_client.get(
        "/api/v1/content-library",
        headers=user_headers,
        params={"search": "alpha", "limit": 100},
    )
    assert r.status_code == 200, r.text
    ids = {item["id"] for item in r.json()["items"]}
    assert sv_mine.id in ids
    assert nb_mine.id in ids
    assert sv_foreign.id not in ids
    assert nb_foreign.id not in ids


# ---------------------------------------------------------------------------
# F2.2 — full_auto ownership
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_full_auto_get_foreign_project_denied(
    raw_client: AsyncClient,
    db_session,
    admin_user,
    user_headers: dict[str, str],
) -> None:
    """Non-admin baskasinin projesinin automation config'ini okuyamaz."""
    cp_foreign = await _mk_channel(db_session, admin_user.id, slug="fa-foreign")
    pj = ContentProject(
        user_id=admin_user.id,
        channel_profile_id=cp_foreign.id,
        title="Foreign Auto",
        module_type="standard_video",
        content_status="draft",
    )
    db_session.add(pj)
    await db_session.commit()

    r = await raw_client.get(
        f"/api/v1/full-auto/content-projects/{pj.id}",
        headers=user_headers,
    )
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_full_auto_patch_own_project_allowed(
    raw_client: AsyncClient,
    db_session,
    regular_user,
    user_headers: dict[str, str],
) -> None:
    """Non-admin kendi projesinin config'ini guncelleyebilir."""
    cp_mine = await _mk_channel(db_session, regular_user.id, slug="fa-mine")
    pj = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=cp_mine.id,
        title="Mine Auto",
        module_type="standard_video",
        content_status="draft",
    )
    db_session.add(pj)
    await db_session.commit()

    r = await raw_client.patch(
        f"/api/v1/full-auto/content-projects/{pj.id}",
        headers=user_headers,
        json={"automation_enabled": True},
    )
    assert r.status_code == 200, r.text
    assert r.json()["automation_enabled"] is True


# ---------------------------------------------------------------------------
# F2.2 — discovery ownership
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_discovery_non_admin_excludes_foreign_jobs_and_content(
    raw_client: AsyncClient,
    db_session,
    regular_user,
    admin_user,
    user_headers: dict[str, str],
) -> None:
    """Non-admin discovery sonuclari baskasinin job/content'ini icermez."""
    cp_mine = await _mk_channel(db_session, regular_user.id, slug="dc-mine")
    cp_foreign = await _mk_channel(db_session, admin_user.id, slug="dc-foreign")

    needle = f"disc{uuid.uuid4().hex[:6]}"

    job_mine = Job(
        module_type=f"standard_video_{needle}",
        status="queued",
        owner_id=regular_user.id,
    )
    job_foreign = Job(
        module_type=f"standard_video_{needle}",
        status="queued",
        owner_id=admin_user.id,
    )
    sv_mine = StandardVideo(
        title=f"SV {needle} mine",
        topic="disc topic",
        channel_profile_id=cp_mine.id,
        status="draft",
    )
    sv_foreign = StandardVideo(
        title=f"SV {needle} foreign",
        topic="disc topic",
        channel_profile_id=cp_foreign.id,
        status="draft",
    )
    db_session.add_all([job_mine, job_foreign, sv_mine, sv_foreign])
    await db_session.commit()

    r = await raw_client.get(
        "/api/v1/discovery/search",
        headers=user_headers,
        params={"q": needle, "limit": 10},
    )
    assert r.status_code == 200, r.text
    results = r.json()["results"]
    ids_by_category: dict[str, set[str]] = {}
    for item in results:
        ids_by_category.setdefault(item["category"], set()).add(item["id"])

    # Jobs: yalnizca benim
    assert job_mine.id in ids_by_category.get("job", set())
    assert job_foreign.id not in ids_by_category.get("job", set())

    # Content: yalnizca benim
    assert sv_mine.id in ids_by_category.get("content", set())
    assert sv_foreign.id not in ids_by_category.get("content", set())


# ---------------------------------------------------------------------------
# F2.2 — assets admin-only write guard
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_assets_refresh_denies_non_admin(
    raw_client: AsyncClient, user_headers: dict[str, str]
) -> None:
    r = await raw_client.post("/api/v1/assets/refresh", headers=user_headers)
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_assets_delete_denies_non_admin(
    raw_client: AsyncClient, user_headers: dict[str, str]
) -> None:
    r = await raw_client.delete(
        "/api/v1/assets/fake/path.mp4", headers=user_headers
    )
    assert r.status_code == 403, r.text
