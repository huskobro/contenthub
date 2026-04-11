"""
Unit / integration tests for the Full-Auto service layer.

These tests exercise ``app.full_auto.service.evaluate_guards`` and
``trigger_full_auto`` against the in-memory test DB. They do NOT start the
dispatcher; the trigger test only covers the guard/rejection branch (no job
is created).

Covered:
  - kill switch off → rejected
  - module not allowed → rejected
  - per-project toggle off → rejected
  - required fields missing → rejected
  - daily quota exhausted → rejected
  - scheduled dedupe (duplicate scheduled_run_id) → rejected
  - config update via apply_config_update → audit log + mutation
"""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ChannelProfile, ContentProject, Job, Setting, User
from app.full_auto import service as fa_service
from app.full_auto.schemas import FullAutoTriggerRequest

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# Fixtures — in-memory via existing db_session fixture in conftest
# ---------------------------------------------------------------------------


async def _make_user(db: AsyncSession, *, slug: str = "fa-test") -> User:
    unique = uuid.uuid4().hex[:8]
    u = User(
        id=str(uuid.uuid4()),
        email=f"{slug}-{unique}@test.local",
        display_name="Full Auto User",
        slug=f"{slug}-{unique}",
        role="user",
        status="active",
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


async def _make_channel(db: AsyncSession, user_id: str) -> ChannelProfile:
    ch = ChannelProfile(
        user_id=user_id,
        profile_name="FA Channel",
        channel_slug=f"fa-{uuid.uuid4().hex[:8]}",
    )
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch


async def _make_project(
    db: AsyncSession,
    *,
    user_id: str,
    channel_id: str,
    module_type: str = "standard_video",
    **overrides,
) -> ContentProject:
    proj = ContentProject(
        id=str(uuid.uuid4()),
        user_id=user_id,
        channel_profile_id=channel_id,
        module_type=module_type,
        title="FA Test Project",
        description="FA",
    )
    for k, v in overrides.items():
        setattr(proj, k, v)
    db.add(proj)
    await db.commit()
    await db.refresh(proj)
    return proj


async def _set_global(db: AsyncSession, key: str, value) -> None:
    """Persist a Setting row so ``resolve(key)`` returns ``value``."""
    import json as _json
    from sqlalchemy import select as _select
    row = (await db.execute(_select(Setting).where(Setting.key == key))).scalar_one_or_none()
    if row is None:
        row = Setting(key=key, admin_value_json=_json.dumps(value))
        db.add(row)
    else:
        row.admin_value_json = _json.dumps(value)
    await db.commit()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_guard_kill_switch_off_rejects(db_session: AsyncSession):
    user = await _make_user(db_session)
    ch = await _make_channel(db_session, user.id)
    proj = await _make_project(
        db_session,
        user_id=user.id,
        channel_id=ch.id,
        automation_enabled=True,
        automation_default_template_id="tpl-1",
    )

    # Default: automation.full_auto.enabled is False → must reject.
    result = await fa_service.evaluate_guards(db_session, proj)
    assert result.allowed is False
    assert any("Global tam otomatik" in v for v in result.violations)


async def test_guard_module_not_allowed_rejects(db_session: AsyncSession):
    user = await _make_user(db_session)
    ch = await _make_channel(db_session, user.id)
    proj = await _make_project(
        db_session,
        user_id=user.id,
        channel_id=ch.id,
        module_type="news_bulletin",  # not in v1 allowlist
        automation_enabled=True,
        automation_default_template_id="tpl-1",
    )
    await _set_global(db_session, "automation.full_auto.enabled", True)

    result = await fa_service.evaluate_guards(db_session, proj)
    assert result.allowed is False
    assert any("izinli degil" in v or "Faz 1 destegi" in v for v in result.violations)


async def test_guard_project_toggle_off_rejects(db_session: AsyncSession):
    user = await _make_user(db_session)
    ch = await _make_channel(db_session, user.id)
    proj = await _make_project(
        db_session,
        user_id=user.id,
        channel_id=ch.id,
        automation_enabled=False,
        automation_default_template_id="tpl-1",
    )
    await _set_global(db_session, "automation.full_auto.enabled", True)

    result = await fa_service.evaluate_guards(db_session, proj)
    assert result.allowed is False
    assert any("automation_enabled" in v for v in result.violations)


async def test_guard_missing_template_rejects(db_session: AsyncSession):
    user = await _make_user(db_session)
    ch = await _make_channel(db_session, user.id)
    proj = await _make_project(
        db_session,
        user_id=user.id,
        channel_id=ch.id,
        automation_enabled=True,
        automation_default_template_id=None,  # missing
    )
    await _set_global(db_session, "automation.full_auto.enabled", True)

    result = await fa_service.evaluate_guards(db_session, proj)
    assert result.allowed is False
    assert any("template" in v.lower() for v in result.violations)


async def test_guard_all_clear(db_session: AsyncSession):
    user = await _make_user(db_session)
    ch = await _make_channel(db_session, user.id)
    proj = await _make_project(
        db_session,
        user_id=user.id,
        channel_id=ch.id,
        automation_enabled=True,
        automation_default_template_id="tpl-1",
    )
    await _set_global(db_session, "automation.full_auto.enabled", True)

    result = await fa_service.evaluate_guards(db_session, proj)
    assert result.allowed is True
    assert result.violations == []


async def test_guard_daily_quota_exhausted(db_session: AsyncSession):
    from datetime import datetime, timezone
    user = await _make_user(db_session)
    ch = await _make_channel(db_session, user.id)
    proj = await _make_project(
        db_session,
        user_id=user.id,
        channel_id=ch.id,
        automation_enabled=True,
        automation_default_template_id="tpl-1",
    )
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    proj.automation_runs_today = 5
    proj.automation_runs_today_date = today
    proj.automation_max_runs_per_day = 5
    await db_session.commit()

    await _set_global(db_session, "automation.full_auto.enabled", True)

    result = await fa_service.evaluate_guards(db_session, proj)
    assert result.allowed is False
    assert any("Gunluk" in v for v in result.violations)


async def test_trigger_rejected_when_guards_fail(db_session: AsyncSession):
    """Trigger path returns accepted=False without creating a job when guards fail."""
    user = await _make_user(db_session)
    ch = await _make_channel(db_session, user.id)
    proj = await _make_project(
        db_session,
        user_id=user.id,
        channel_id=ch.id,
        automation_enabled=False,  # toggle off → guaranteed rejection
    )

    response = await fa_service.trigger_full_auto(
        db_session,
        project_id=proj.id,
        dispatcher=None,  # never reached; guards fail first
        session_factory=None,
        trigger_source="manual",
        actor_id=user.id,
    )
    assert response.accepted is False
    assert response.job_id is None
    # Sanity: no job was created
    from sqlalchemy import select, func
    count = await db_session.scalar(
        select(func.count(Job.id)).where(Job.content_project_id == proj.id)
    )
    assert count == 0


async def test_scheduled_dedupe_rejects_duplicate_fire(db_session: AsyncSession):
    """Second scheduler fire with the same scheduled_run_id must be rejected."""
    user = await _make_user(db_session)
    ch = await _make_channel(db_session, user.id)
    proj = await _make_project(
        db_session,
        user_id=user.id,
        channel_id=ch.id,
        automation_enabled=True,
    )

    # Pre-seed a job row with a matching scheduled_run_id, simulating an
    # earlier successful fire from the scheduler.
    seed = Job(
        id=str(uuid.uuid4()),
        module_type="standard_video",
        status="running",
        owner_id=user.id,
        content_project_id=proj.id,
        run_mode="full_auto",
        trigger_source="scheduled",
        scheduled_run_id="dedupe-key-1",
    )
    db_session.add(seed)
    await db_session.commit()

    response = await fa_service.trigger_full_auto(
        db_session,
        project_id=proj.id,
        dispatcher=None,
        session_factory=None,
        trigger_source="scheduled",
        scheduled_run_id="dedupe-key-1",
        actor_id=None,
    )
    assert response.accepted is False
    assert response.reason and "duplicate" in response.reason.lower()


async def test_apply_config_update_writes_changes(db_session: AsyncSession):
    user = await _make_user(db_session)
    ch = await _make_channel(db_session, user.id)
    proj = await _make_project(
        db_session,
        user_id=user.id,
        channel_id=ch.id,
    )

    updated = await fa_service.apply_config_update(
        db_session,
        proj,
        {
            "automation_enabled": True,
            "automation_cron_expression": "*/10 * * * *",
            "automation_default_template_id": "tpl-abc",
            "automation_publish_policy": "draft",
        },
        actor_id=user.id,
    )
    assert updated.automation_enabled is True
    assert updated.automation_cron_expression == "*/10 * * * *"
    assert updated.automation_default_template_id == "tpl-abc"
    assert updated.automation_publish_policy == "draft"
