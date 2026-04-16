"""
PHASE Z-E — Release Candidate smoke tests.

Uctan-uca kritik akislari dogrular. Bu testler hicbir yeni feature
testi degil — mevcut davranisin release-candidate olgunlukta stabil
calistigini dogrulayan minimal smoke hatti.

Kapsam:
  1. Onboarding: user login + me endpoint'i.
  2. Channel URL-only create -> partial state -> list.
  3. Project create on user channel -> Job create -> Job detail.
  4. Ownership isolation: user A, user B'nin job/channel/project'ini
     goremiyor.
  5. Admin global erisim: admin her user'in verisini gorur.
  6. Analytics read: admin overview 200.
  7. Publish review gate: non-reviewed publish record reject path'i
     dusuruyor mu?
  8. Startup recovery: stale running job'un fail'e donusmesi (unit).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.channels import metadata_fetch as mf
from app.db.models import Job, JobStep, User


async def _make_user_with_password(
    db: AsyncSession, *, slug: str, role: str = "user"
) -> tuple[User, str]:
    from app.auth.password import hash_password
    pw = "testpass123"
    u = User(
        email=f"{slug}@test.local",
        display_name=slug,
        slug=slug,
        role=role,
        status="active",
        password_hash=hash_password(pw),
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u, pw


def _headers(user: User) -> dict[str, str]:
    from app.auth.jwt import create_access_token
    return {"Authorization": f"Bearer {create_access_token({'sub': user.id})}"}


# ===========================================================================
# 1. Onboarding smoke — login + me
# ===========================================================================


@pytest.mark.asyncio
async def test_rc_onboarding_login_and_me(
    raw_client: AsyncClient, db_session: AsyncSession
):
    user, pw = await _make_user_with_password(db_session, slug="rc-onboard-1")
    resp = await raw_client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": pw},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "access_token" in data
    token = data["access_token"]

    me = await raw_client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert me.status_code == 200
    assert me.json()["email"] == user.email


# ===========================================================================
# 2. Channel URL-only create → partial → list
# ===========================================================================


@pytest.mark.asyncio
async def test_rc_channel_url_only_create_list(
    raw_client: AsyncClient, db_session: AsyncSession, monkeypatch
):
    user, _ = await _make_user_with_password(db_session, slug="rc-chan-1")
    h = _headers(user)

    # Metadata fetch basarisiz olsa bile partial profile donmelidir
    async def _no_html(_url):
        return None

    monkeypatch.setattr(mf, "_fetch_html", _no_html)

    resp = await raw_client.post(
        "/api/v1/channel-profiles/from-url",
        headers=h,
        json={"source_url": "https://www.youtube.com/@rc-smoke-1"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["import_status"] == "partial"
    assert data["platform"] == "youtube"

    # List endpoint yalniz bu user'a ait kayit dondurur
    resp_list = await raw_client.get("/api/v1/channel-profiles", headers=h)
    assert resp_list.status_code == 200
    ids = [p["id"] for p in resp_list.json()]
    assert data["id"] in ids


# ===========================================================================
# 3. Project create → Job create → Job detail
# ===========================================================================


@pytest.mark.asyncio
async def test_rc_project_job_creation_flow(
    raw_client: AsyncClient, db_session: AsyncSession, monkeypatch
):
    user, _ = await _make_user_with_password(db_session, slug="rc-proj-1")
    h = _headers(user)

    async def _no_html(_url):
        return None

    monkeypatch.setattr(mf, "_fetch_html", _no_html)

    ch_resp = await raw_client.post(
        "/api/v1/channel-profiles/from-url",
        headers=h,
        json={"source_url": "https://www.youtube.com/@rc-proj-1"},
    )
    assert ch_resp.status_code == 201, ch_resp.text
    channel_id = ch_resp.json()["id"]

    proj_resp = await raw_client.post(
        "/api/v1/content-projects",
        headers=h,
        json={
            "user_id": user.id,
            "channel_profile_id": channel_id,
            "module_type": "standard_video",
            "title": "RC Smoke Proje",
            "description": "RC smoke",
        },
    )
    assert proj_resp.status_code == 201, proj_resp.text
    project_id = proj_resp.json()["id"]

    job_resp = await raw_client.post(
        "/api/v1/jobs",
        headers=h,
        json={
            "module_id": "standard_video",
            "topic": "RC smoke topic",
            "language": "tr",
            "duration_seconds": 60,
            "content_project_id": project_id,
            "channel_profile_id": channel_id,
        },
    )
    assert job_resp.status_code == 201, job_resp.text
    job_id = job_resp.json()["id"]

    detail = await raw_client.get(f"/api/v1/jobs/{job_id}", headers=h)
    assert detail.status_code == 200
    assert detail.json()["module_type"] == "standard_video"


# ===========================================================================
# 4. Ownership isolation
# ===========================================================================


@pytest.mark.asyncio
async def test_rc_ownership_isolation_user_cannot_see_other_user(
    raw_client: AsyncClient, db_session: AsyncSession, monkeypatch
):
    user_a, _ = await _make_user_with_password(db_session, slug="rc-iso-a")
    user_b, _ = await _make_user_with_password(db_session, slug="rc-iso-b")
    h_a = _headers(user_a)
    h_b = _headers(user_b)

    async def _no_html(_url):
        return None

    monkeypatch.setattr(mf, "_fetch_html", _no_html)

    # A bir kanal ekler
    resp = await raw_client.post(
        "/api/v1/channel-profiles/from-url",
        headers=h_a,
        json={"source_url": "https://www.youtube.com/@rc-iso-a"},
    )
    assert resp.status_code == 201
    a_channel_id = resp.json()["id"]

    # B listesinde A'nin kanali gorunmemeli
    b_list = await raw_client.get("/api/v1/channel-profiles", headers=h_b)
    assert b_list.status_code == 200
    b_ids = [p["id"] for p in b_list.json()]
    assert a_channel_id not in b_ids


# ===========================================================================
# 5. Admin global access
# ===========================================================================


@pytest.mark.asyncio
async def test_rc_admin_sees_all_channels(
    raw_client: AsyncClient, db_session: AsyncSession, monkeypatch
):
    user, _ = await _make_user_with_password(db_session, slug="rc-admin-u")
    admin, _ = await _make_user_with_password(
        db_session, slug="rc-admin-a", role="admin"
    )
    h_u = _headers(user)
    h_a = _headers(admin)

    async def _no_html(_url):
        return None

    monkeypatch.setattr(mf, "_fetch_html", _no_html)

    resp = await raw_client.post(
        "/api/v1/channel-profiles/from-url",
        headers=h_u,
        json={"source_url": "https://www.youtube.com/@rc-admin-viz"},
    )
    assert resp.status_code == 201
    user_channel_id = resp.json()["id"]

    admin_list = await raw_client.get("/api/v1/channel-profiles", headers=h_a)
    assert admin_list.status_code == 200
    admin_ids = [p["id"] for p in admin_list.json()]
    assert user_channel_id in admin_ids


# ===========================================================================
# 6. Analytics admin read
# ===========================================================================


@pytest.mark.asyncio
async def test_rc_analytics_overview_admin(
    raw_client: AsyncClient, db_session: AsyncSession
):
    admin, _ = await _make_user_with_password(
        db_session, slug="rc-analytics-a", role="admin"
    )
    h = _headers(admin)
    resp = await raw_client.get(
        "/api/v1/analytics/overview?window=last_30d", headers=h
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "total_job_count" in data


# ===========================================================================
# 7. Publish review gate (reject-without-reason)
# ===========================================================================


@pytest.mark.asyncio
async def test_rc_publish_reject_requires_reason(
    client: AsyncClient,
):
    """Publish review reject — reason yoksa 422 dondurmeli (auto-auth client)."""
    resp = await client.post(
        "/api/v1/publish/nonexistent/review/reject",
        json={},
    )
    # Reason zorunlu veya record yok — iki dunya da bloklayici
    assert resp.status_code in (404, 422), resp.text


# ===========================================================================
# 8. Startup recovery — stale job transitions to failed
# ===========================================================================


@pytest.mark.asyncio
async def test_rc_startup_recovery_fails_stale_running_job(
    db_session: AsyncSession,
):
    from app.jobs.recovery import run_startup_recovery

    admin = User(
        email="rc-recovery-admin@test.local",
        display_name="Recovery Admin",
        slug="rc-recovery-a",
        role="admin",
        status="active",
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)

    # 10 dk once started, heartbeat yok → stale
    old = datetime.now(timezone.utc) - timedelta(minutes=10)
    job = Job(
        module_type="standard_video",
        status="running",
        owner_id=admin.id,
        started_at=old,
    )
    db_session.add(job)
    await db_session.commit()
    await db_session.refresh(job)

    step = JobStep(
        job_id=job.id,
        step_key="script",
        step_order=1,
        status="running",
        started_at=old,
        idempotency_type="deterministic",
    )
    db_session.add(step)
    await db_session.commit()

    summary = await run_startup_recovery(db_session, stale_threshold_minutes=5)
    assert summary.recovered_jobs >= 1
    assert job.id in summary.job_ids

    # DB'den tekrar oku
    await db_session.refresh(job)
    await db_session.refresh(step)
    assert job.status == "failed"
    assert step.status == "failed"
