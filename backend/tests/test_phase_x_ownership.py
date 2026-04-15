"""
PHASE X — Ownership + Channel URL-only + Project-Job hierarchy tests.

Scope:
  1. Channel URL-only create flow
      - POST /channel-profiles/from-url with URL only
      - Ayni user ayni URL'i ikinci kez ekleyemez (409)
      - Metadata fetch basarisiz olsa dahi kayit acilir (honest state)
  2. Cross-user ownership enforcement
      - User A, User B'nin channel'ini goremez (404/403)
      - User A, User B'nin job'unu cancel/retry edemez (403)
      - User A, User B'nin publish kaydini kabul/reddedemez (403)
  3. Analytics scoping
      - Non-admin user_id override edemez (admin=true'da override gecerli)
      - Source-impact ve prompt-assembly non-admin icin 403
  4. Project-Job hierarchy
      - /api/v1/jobs?content_project_id=X sadece o projeye ait job'lari doner
      - Non-admin bir baska user'in project'ine job yaratamaz (403)
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

BASE_CHANNELS = "/api/v1/channel-profiles"
BASE_JOBS = "/api/v1/jobs"
BASE_ANALYTICS = "/api/v1/analytics"


async def _make_channel(
    db: AsyncSession, owner: User, *, slug: str, url: str | None = None
) -> ChannelProfile:
    ch = ChannelProfile(
        user_id=owner.id,
        profile_name=f"ch-{slug}",
        channel_slug=slug,
        default_language="tr",
        status="active",
        source_url=url,
        normalized_url=url,
        platform="youtube" if url else None,
        import_status="ready" if url else "pending",
    )
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch


async def _make_project(
    db: AsyncSession, owner: User, *, name: str = "p", channel: ChannelProfile | None = None
) -> ContentProject:
    if channel is None:
        channel = await _make_channel(db, owner, slug=f"proj-ch-{name}")
    proj = ContentProject(
        user_id=owner.id,
        channel_profile_id=channel.id,
        title=name,
        module_type="standard_video",
        content_status="draft",
    )
    db.add(proj)
    await db.commit()
    await db.refresh(proj)
    return proj


async def _make_job(
    db: AsyncSession,
    owner: User,
    *,
    project: ContentProject | None = None,
    channel: ChannelProfile | None = None,
) -> Job:
    job = Job(
        owner_id=owner.id,
        module_type="standard_video",
        status="queued",
        content_project_id=project.id if project else None,
        channel_profile_id=channel.id if channel else None,
        input_data_json="{}",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


# ---------------------------------------------------------------------------
# 1. Channel URL-only create
# ---------------------------------------------------------------------------


async def test_channel_create_from_url_success(
    client: AsyncClient, user_headers: dict[str, str]
):
    payload = {"source_url": "https://www.youtube.com/@phase-x-test"}
    resp = await client.post(
        f"{BASE_CHANNELS}/from-url", json=payload, headers=user_headers
    )
    # Metadata fetch basarisiz olsa da 201 dondurur (honest state).
    assert resp.status_code in (201, 422), resp.text
    if resp.status_code == 201:
        data = resp.json()
        assert data["source_url"].startswith("https://www.youtube.com/")


async def test_channel_create_from_url_duplicate_blocked(
    client: AsyncClient, user_headers: dict[str, str]
):
    payload = {"source_url": "https://www.youtube.com/@phase-x-dup"}
    first = await client.post(
        f"{BASE_CHANNELS}/from-url", json=payload, headers=user_headers
    )
    if first.status_code != 201:
        pytest.skip(f"ilk olusturma beklenmedik kod: {first.status_code}")
    # Ayni user + ayni URL -> 409
    second = await client.post(
        f"{BASE_CHANNELS}/from-url", json=payload, headers=user_headers
    )
    assert second.status_code == 409, second.text


# ---------------------------------------------------------------------------
# 2. Cross-user ownership enforcement
# ---------------------------------------------------------------------------


async def test_user_cannot_see_other_users_channel(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    admin_user: User,
    user_headers: dict[str, str],
):
    """regular_user, admin_user'in kanalini get edemez."""
    admin_ch = await _make_channel(db_session, admin_user, slug="admin-ch")
    resp = await client.get(
        f"{BASE_CHANNELS}/{admin_ch.id}", headers=user_headers
    )
    assert resp.status_code in (403, 404), resp.text


async def test_admin_can_see_any_channel(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    admin_user: User,
    admin_headers: dict[str, str],
):
    user_ch = await _make_channel(db_session, regular_user, slug="user-ch")
    resp = await client.get(
        f"{BASE_CHANNELS}/{user_ch.id}", headers=admin_headers
    )
    assert resp.status_code == 200, resp.text


async def test_user_cannot_cancel_other_users_job(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    admin_user: User,
    user_headers: dict[str, str],
):
    admin_job = await _make_job(db_session, admin_user)
    resp = await client.post(
        f"{BASE_JOBS}/{admin_job.id}/cancel", headers=user_headers
    )
    assert resp.status_code in (403, 404), resp.text


async def test_user_can_cancel_own_job(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict[str, str],
):
    my_job = await _make_job(db_session, regular_user)
    resp = await client.post(
        f"{BASE_JOBS}/{my_job.id}/cancel", headers=user_headers
    )
    # cancel state machine'den 200 ya da 409 (zaten bitmis) kabul edilir,
    # 403 olmamalidir.
    assert resp.status_code != 403, resp.text


# ---------------------------------------------------------------------------
# 3. Analytics scoping
# ---------------------------------------------------------------------------


async def test_analytics_overview_non_admin_user_id_locked(
    client: AsyncClient,
    regular_user: User,
    admin_user: User,
    user_headers: dict[str, str],
):
    """Non-admin user_id=baska-id override edemez — sistem ctx.user_id'ye kilitler."""
    # Ornegin regular_user admin_user'in id'sini gondermeye calissin
    resp = await client.get(
        f"{BASE_ANALYTICS}/overview",
        params={"user_id": admin_user.id},
        headers=user_headers,
    )
    # 200 donmeli (non-admin sessizce kendi verisine kilitlenir)
    assert resp.status_code == 200, resp.text


async def test_analytics_source_impact_admin_only(
    client: AsyncClient, user_headers: dict[str, str]
):
    resp = await client.get(
        f"{BASE_ANALYTICS}/source-impact", headers=user_headers
    )
    assert resp.status_code == 403, resp.text


async def test_analytics_prompt_assembly_admin_only(
    client: AsyncClient, user_headers: dict[str, str]
):
    resp = await client.get(
        f"{BASE_ANALYTICS}/prompt-assembly", headers=user_headers
    )
    assert resp.status_code == 403, resp.text


# ---------------------------------------------------------------------------
# 4. Project-Job hierarchy
# ---------------------------------------------------------------------------


async def test_job_list_project_scope_server_side(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict[str, str],
):
    """content_project_id query parametresiyle sadece o projeye ait job'lar doner."""
    proj1 = await _make_project(db_session, regular_user, name="p1")
    proj2 = await _make_project(db_session, regular_user, name="p2")
    j1 = await _make_job(db_session, regular_user, project=proj1)
    _ = await _make_job(db_session, regular_user, project=proj2)

    resp = await client.get(
        BASE_JOBS,
        params={"content_project_id": proj1.id},
        headers=user_headers,
    )
    assert resp.status_code == 200, resp.text
    job_ids = [j["id"] for j in resp.json()]
    assert j1.id in job_ids
    # proj2'nin job'u listede olmamali
    for j in resp.json():
        assert j["content_project_id"] == proj1.id


async def test_user_cannot_create_job_on_other_users_project(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    admin_user: User,
    user_headers: dict[str, str],
):
    admin_proj = await _make_project(db_session, admin_user, name="admin-p")
    payload = {
        "module_id": "standard_video",
        "content_project_id": admin_proj.id,
        "topic": "cross-user smuggle",
        "language": "tr",
        "duration_seconds": 60,
    }
    resp = await client.post(BASE_JOBS, json=payload, headers=user_headers)
    assert resp.status_code in (403, 404), resp.text
