"""
Phase Final F4 — Daily Automation Digest regresyon testleri.

Kapsam:
  - GET /full-auto/digest/today caller scope
  - Non-admin sadece kendi sahip oldugu projeleri gorur (direct user_id VE
    channel_profile.user_id uzerinden)
  - Admin butun projeleri gorur (orphan dahil)
  - runs_today counter agregasyonu (automation_runs_today + _date)
  - at_limit hesaplamasi (runs_today >= max_runs_per_day)
  - next_upcoming_run_at gelecek tarihli ilk cron fire'i secer

Strateji:
  `raw_client` fixture'i ile oto-admin fallback kapali — user_headers /
  admin_headers ile scope izolasyonu dogrulanir.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

from app.db.models import ChannelProfile, ContentProject


DIGEST_URL = "/api/v1/full-auto/digest/today"


# ---------------------------------------------------------------------------
# Yardimci
# ---------------------------------------------------------------------------


async def _mk_channel(db_session, owner_id: str, *, slug: str) -> ChannelProfile:
    cp = ChannelProfile(
        user_id=owner_id,
        profile_name=f"F4 Digest {slug}",
        channel_slug=slug,
    )
    db_session.add(cp)
    await db_session.commit()
    await db_session.refresh(cp)
    return cp


def _today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# F4 — Non-admin scope izolasyonu
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_digest_non_admin_sees_only_own_projects(
    raw_client: AsyncClient,
    db_session,
    regular_user,
    admin_user,
    user_headers: dict[str, str],
) -> None:
    """Non-admin caller baskasinin projesini digest'te gormez."""
    cp_mine = await _mk_channel(db_session, regular_user.id, slug="f4-mine")
    cp_foreign = await _mk_channel(db_session, admin_user.id, slug="f4-foreign")

    # Her iki FK NOT NULL — direct user_id match + channel owner match senaryolari
    pj_mine = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=cp_mine.id,
        title="Mine direct",
        module_type="standard_video",
        content_status="draft",
        automation_enabled=True,
    )
    # regular_user.id user_id'de ama channel admin'e ait — yine gorunmeli
    # (direct user_id match yeterli)
    pj_mine_mixed = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=cp_foreign.id,
        title="Mine via user_id only",
        module_type="standard_video",
        content_status="draft",
        automation_enabled=True,
    )
    pj_foreign = ContentProject(
        user_id=admin_user.id,
        channel_profile_id=cp_foreign.id,
        title="Foreign project",
        module_type="standard_video",
        content_status="draft",
        automation_enabled=True,
    )
    db_session.add_all([pj_mine, pj_mine_mixed, pj_foreign])
    await db_session.commit()

    r = await raw_client.get(DIGEST_URL, headers=user_headers)
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["scope"] == "user"
    returned_ids = {p["project_id"] for p in body["projects"]}
    assert pj_mine.id in returned_ids
    assert pj_mine_mixed.id in returned_ids
    assert pj_foreign.id not in returned_ids
    assert body["total_projects"] == 2
    assert body["automation_enabled_count"] == 2


# ---------------------------------------------------------------------------
# F4 — Admin tum projeleri gorur
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_digest_admin_sees_all_projects(
    raw_client: AsyncClient,
    db_session,
    regular_user,
    admin_user,
    admin_headers: dict[str, str],
) -> None:
    """Admin caller regular_user'in projelerini de gorur."""
    cp_user = await _mk_channel(db_session, regular_user.id, slug="f4-admin-view")
    cp_admin = await _mk_channel(db_session, admin_user.id, slug="f4-admin-own")

    pj_user = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=cp_user.id,
        title="User project visible to admin",
        module_type="standard_video",
        content_status="draft",
        automation_enabled=True,
    )
    pj_admin_own = ContentProject(
        user_id=admin_user.id,
        channel_profile_id=cp_admin.id,
        title="Admin's own project",
        module_type="standard_video",
        content_status="draft",
        automation_enabled=False,
    )
    db_session.add_all([pj_user, pj_admin_own])
    await db_session.commit()

    r = await raw_client.get(DIGEST_URL, headers=admin_headers)
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["scope"] == "admin"
    returned_ids = {p["project_id"] for p in body["projects"]}
    # Admin farkli user'in projesini de, kendi projesini de gorur
    assert pj_user.id in returned_ids
    assert pj_admin_own.id in returned_ids


# ---------------------------------------------------------------------------
# F4 — runs_today agregasyonu + at_limit hesabi
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_digest_runs_today_and_at_limit_aggregation(
    raw_client: AsyncClient,
    db_session,
    regular_user,
    user_headers: dict[str, str],
) -> None:
    """runs_today_total, runs_today_limit_total, at_limit_count dogru hesaplanir."""
    cp = await _mk_channel(db_session, regular_user.id, slug="f4-limits")
    today = _today_str()

    pj_at_limit = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=cp.id,
        title="At limit",
        module_type="standard_video",
        content_status="draft",
        automation_enabled=True,
        automation_max_runs_per_day=3,
        automation_runs_today=3,
        automation_runs_today_date=today,
    )
    pj_below = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=cp.id,
        title="Below limit",
        module_type="standard_video",
        content_status="draft",
        automation_enabled=True,
        automation_max_runs_per_day=5,
        automation_runs_today=1,
        automation_runs_today_date=today,
    )
    pj_stale = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=cp.id,
        title="Stale date (yesterday)",
        module_type="standard_video",
        content_status="draft",
        automation_enabled=True,
        automation_max_runs_per_day=2,
        automation_runs_today=2,
        automation_runs_today_date="2000-01-01",  # eski tarih -> effective 0
    )
    db_session.add_all([pj_at_limit, pj_below, pj_stale])
    await db_session.commit()

    r = await raw_client.get(DIGEST_URL, headers=user_headers)
    assert r.status_code == 200, r.text
    body = r.json()

    # runs_today_total: 3 (at_limit) + 1 (below) + 0 (stale) = 4
    assert body["runs_today_total"] == 4
    # runs_today_limit_total: 3 + 5 + 2 = 10
    assert body["runs_today_limit_total"] == 10
    # at_limit: yalniz pj_at_limit
    assert body["at_limit_count"] == 1

    # stale project item runs_today reset edilmis olmali
    by_id = {p["project_id"]: p for p in body["projects"]}
    assert by_id[pj_stale.id]["runs_today"] == 0
    assert by_id[pj_stale.id]["runs_today_date"] == today


# ---------------------------------------------------------------------------
# F4 — next_upcoming_run_at gelecekteki ilk fire'i gosterir
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_digest_next_upcoming_picks_earliest_future_run(
    raw_client: AsyncClient,
    db_session,
    regular_user,
    user_headers: dict[str, str],
) -> None:
    """Gecmis next_run_at dikkate alinmaz; gelecektekilerden en yakini secilir."""
    cp = await _mk_channel(db_session, regular_user.id, slug="f4-upcoming")
    now = datetime.now(timezone.utc)

    pj_past = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=cp.id,
        title="Past next_run (stale)",
        module_type="standard_video",
        content_status="draft",
        automation_enabled=True,
        automation_schedule_enabled=True,
        automation_next_run_at=now - timedelta(hours=1),
    )
    pj_soon = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=cp.id,
        title="Soon next_run",
        module_type="standard_video",
        content_status="draft",
        automation_enabled=True,
        automation_schedule_enabled=True,
        automation_next_run_at=now + timedelta(minutes=30),
    )
    pj_later = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=cp.id,
        title="Later next_run",
        module_type="standard_video",
        content_status="draft",
        automation_enabled=True,
        automation_schedule_enabled=True,
        automation_next_run_at=now + timedelta(hours=6),
    )
    db_session.add_all([pj_past, pj_soon, pj_later])
    await db_session.commit()

    r = await raw_client.get(DIGEST_URL, headers=user_headers)
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["next_upcoming_run_at"] is not None
    picked = datetime.fromisoformat(body["next_upcoming_run_at"].replace("Z", "+00:00"))
    # pj_soon ~30 dakika sonra — tolerans 5 dakika
    assert abs((picked - pj_soon.automation_next_run_at).total_seconds()) < 300
    assert body["schedule_enabled_count"] == 3


# ---------------------------------------------------------------------------
# F4 — Bos proje durumu
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_digest_returns_empty_cleanly(
    raw_client: AsyncClient,
    db_session,
    regular_user,
    user_headers: dict[str, str],
) -> None:
    """Hic projesi olmayan non-admin caller bos ama 200 alir."""
    r = await raw_client.get(DIGEST_URL, headers=user_headers)
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["scope"] == "user"
    assert body["projects"] == []
    assert body["total_projects"] == 0
    assert body["automation_enabled_count"] == 0
    assert body["schedule_enabled_count"] == 0
    assert body["runs_today_total"] == 0
    assert body["at_limit_count"] == 0
    assert body["next_upcoming_run_at"] is None
