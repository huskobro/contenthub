"""
Phase AM-4 — Settings drift repair tests.

Scope (matches Phase AL audit fix D):
    Some DB rows belong to keys that were renamed or deprecated in
    ``KNOWN_SETTINGS`` (test seeds from earlier phases, legacy
    ``workspace`` / ``execution`` group names, etc.). The previous seed
    pipeline never touched them, so they kept ``visible_to_user=True``
    and leaked into the user-facing effective list while the 16 keys the
    registry currently considers user-visible stayed hidden.

    The fix introduces ``status='orphan'`` so the resolver and the
    ``visible_to_user_only`` filter can drop those rows, plus a read-only
    drift inspector endpoint and a one-shot admin repair endpoint so
    operators can confirm the drift is closed without tailing logs.

Covered here:
    - ``mark_orphan_settings`` happy path (active → orphan)
    - reactivation when the key reappears in KNOWN_SETTINGS
    - admin-soft-deleted rows (``status='deleted'``) are left alone
    - idempotency: second run does nothing
    - ``compute_drift_report`` returns consistent counts + key lists
    - ``list_settings(visible_to_user_only=True)`` excludes orphans
      (belt-and-suspenders hardening in service layer)
    - ``GET /api/v1/settings/drift`` enforces 401/403/200 admin guard
    - ``POST /api/v1/settings/drift/repair`` enforces admin guard
      and is idempotent on the second call

The test DB is the shared in-memory SQLite from conftest — fixtures
insert only the rows each test needs, so numbers stay deterministic
without depending on a seeded registry.
"""

from __future__ import annotations

from uuid import uuid4 as _uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.password import hash_password
from app.db.models import Setting, User
from app.settings.service import list_settings
from app.settings.settings_resolver import KNOWN_SETTINGS
from app.settings.settings_seed import (
    compute_drift_report,
    mark_orphan_settings,
)

pytestmark = pytest.mark.asyncio

DRIFT_BASE = "/api/v1/settings/drift"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _token_for(user: User) -> str:
    from app.auth.jwt import create_access_token

    return create_access_token({"sub": user.id})


def _headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {_token_for(user)}"}


async def _make_user(db: AsyncSession, *, role: str = "user") -> User:
    slug = f"{role}-{_uuid4().hex[:8]}"
    u = User(
        email=f"{slug}@test.local",
        display_name=f"Drift {role.title()}",
        slug=slug,
        role=role,
        status="active",
        password_hash=hash_password("testpass123"),
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


def _pick_known_key() -> str:
    """Return a key that is guaranteed to exist in KNOWN_SETTINGS.

    We avoid hard-coding a specific key so the test stays stable as the
    registry evolves. We just need *one* real key to build a
    ``visible_to_user`` active row we can assert on.
    """
    try:
        return next(iter(KNOWN_SETTINGS.keys()))
    except StopIteration:  # pragma: no cover — registry is never empty
        raise AssertionError("KNOWN_SETTINGS must not be empty for drift tests")


async def _insert_setting(
    db: AsyncSession,
    *,
    key: str,
    status: str = "active",
    visible_to_user: bool = False,
    group_name: str = "test",
) -> Setting:
    row = Setting(
        key=key,
        group_name=group_name,
        type="string",
        default_value_json='"x"',
        admin_value_json="null",
        user_override_allowed=False,
        visible_to_user=visible_to_user,
        visible_in_wizard=False,
        read_only_for_user=True,
        status=status,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def _fetch_setting(db: AsyncSession, key: str) -> Setting | None:
    return (
        await db.execute(select(Setting).where(Setting.key == key))
    ).scalar_one_or_none()


# ---------------------------------------------------------------------------
# mark_orphan_settings — behavior
# ---------------------------------------------------------------------------


async def test_mark_orphan_flips_active_to_orphan_for_missing_key(
    db_session: AsyncSession,
):
    stale_key = f"am4.stale.{_uuid4().hex[:8]}"
    assert stale_key not in KNOWN_SETTINGS  # defensive — generated suffix
    await _insert_setting(db_session, key=stale_key, status="active")

    counts = await mark_orphan_settings(db_session)
    assert counts["marked_orphan"] >= 1
    assert counts["reactivated"] == 0

    db_session.expire_all()
    row = await _fetch_setting(db_session, stale_key)
    assert row is not None
    assert row.status == "orphan"


async def test_mark_orphan_reactivates_when_key_reappears(
    db_session: AsyncSession,
):
    known_key = _pick_known_key()

    # Preload a row marked orphan for a key that is actually in the
    # registry — simulates "registry edit restored the key".
    existing = await _fetch_setting(db_session, known_key)
    if existing is None:
        existing = await _insert_setting(
            db_session, key=known_key, status="orphan"
        )
    else:
        existing.status = "orphan"
        await db_session.commit()

    counts = await mark_orphan_settings(db_session)
    assert counts["reactivated"] >= 1

    db_session.expire_all()
    row = await _fetch_setting(db_session, known_key)
    assert row is not None
    assert row.status == "active"


async def test_mark_orphan_leaves_admin_deleted_rows_untouched(
    db_session: AsyncSession,
):
    stale_key = f"am4.deleted.{_uuid4().hex[:8]}"
    assert stale_key not in KNOWN_SETTINGS
    await _insert_setting(db_session, key=stale_key, status="deleted")

    await mark_orphan_settings(db_session)

    db_session.expire_all()
    row = await _fetch_setting(db_session, stale_key)
    assert row is not None, "soft-deleted row must be preserved"
    assert row.status == "deleted", "drift marker must not touch admin-soft-delete state"


async def test_mark_orphan_is_idempotent(db_session: AsyncSession):
    stale_key = f"am4.idem.{_uuid4().hex[:8]}"
    assert stale_key not in KNOWN_SETTINGS
    await _insert_setting(db_session, key=stale_key, status="active")

    first = await mark_orphan_settings(db_session)
    second = await mark_orphan_settings(db_session)

    assert first["marked_orphan"] >= 1
    assert second["marked_orphan"] == 0
    assert second["reactivated"] == 0


# ---------------------------------------------------------------------------
# compute_drift_report — pure reducer
# ---------------------------------------------------------------------------


async def test_compute_drift_report_shape_on_empty_input():
    report = compute_drift_report([])
    assert report["registry_total"] == len(KNOWN_SETTINGS)
    assert report["registry_visible"] == sum(
        1 for m in KNOWN_SETTINGS.values() if m.get("visible_to_user")
    )
    assert report["db_total"] == 0
    assert report["db_active_total"] == 0
    assert report["db_visible_total"] == 0
    assert report["orphan_count"] == 0
    assert report["missing_count"] == len(KNOWN_SETTINGS)
    assert report["orphan_keys"] == []
    assert sorted(report["missing_keys"]) == sorted(KNOWN_SETTINGS.keys())
    # Every registry-visible key is missing from an empty DB, so every one
    # of them shows up in visible_but_hidden_keys as well.
    assert set(report["visible_but_hidden_keys"]) == {
        k for k, m in KNOWN_SETTINGS.items() if m.get("visible_to_user")
    }


async def test_compute_drift_report_counts_orphans_and_visible():
    known_key = _pick_known_key()
    stale_key = f"am4.report.{_uuid4().hex[:8]}"

    rows = [
        Setting(
            key=known_key,
            group_name="test",
            type="string",
            default_value_json="null",
            admin_value_json="null",
            visible_to_user=True,
            status="active",
        ),
        Setting(
            key=stale_key,
            group_name="test",
            type="string",
            default_value_json="null",
            admin_value_json="null",
            visible_to_user=False,
            status="orphan",
        ),
    ]

    report = compute_drift_report(rows)
    assert report["db_total"] == 2
    assert report["db_active_total"] == 1
    assert report["db_visible_total"] == 1
    assert report["orphan_count"] == 1
    assert stale_key in report["orphan_keys"]
    assert known_key not in report["orphan_keys"]
    # Known-key row is active AND visible → must NOT be in visible_but_hidden_keys.
    assert known_key not in report["visible_but_hidden_keys"]


# ---------------------------------------------------------------------------
# Service layer hardening — list_settings(visible_to_user_only=True)
# ---------------------------------------------------------------------------


async def test_list_settings_visible_excludes_orphan_rows(
    db_session: AsyncSession,
):
    stale_key = f"am4.list.{_uuid4().hex[:8]}"
    await _insert_setting(
        db_session,
        key=stale_key,
        status="orphan",
        visible_to_user=True,
    )

    rows = await list_settings(db_session, visible_to_user_only=True)
    keys = [r.key for r in rows]
    assert stale_key not in keys, (
        "orphan rows must never leak into the user-visible effective list"
    )


async def test_list_settings_visible_excludes_deleted_rows(
    db_session: AsyncSession,
):
    stale_key = f"am4.list.deleted.{_uuid4().hex[:8]}"
    await _insert_setting(
        db_session,
        key=stale_key,
        status="deleted",
        visible_to_user=True,
    )

    rows = await list_settings(db_session, visible_to_user_only=True)
    keys = [r.key for r in rows]
    assert stale_key not in keys, (
        "admin-soft-deleted rows must never leak to users either"
    )


# ---------------------------------------------------------------------------
# Admin guard — GET /settings/drift
# ---------------------------------------------------------------------------


async def test_drift_report_requires_auth(raw_client: AsyncClient):
    r = await raw_client.get(DRIFT_BASE)
    assert r.status_code == 401, r.text


async def test_drift_report_forbidden_for_non_admin(
    client: AsyncClient, db_session: AsyncSession
):
    viewer = await _make_user(db_session, role="user")
    r = await client.get(DRIFT_BASE, headers=_headers(viewer))
    assert r.status_code == 403, r.text


async def test_drift_report_ok_for_admin(
    client: AsyncClient, db_session: AsyncSession
):
    admin = await _make_user(db_session, role="admin")
    r = await client.get(DRIFT_BASE, headers=_headers(admin))
    assert r.status_code == 200, r.text
    body = r.json()
    # Shape is enforced by DriftReport pydantic model, but we still spot-check
    # the numeric fields so schema drift is caught at the API boundary.
    for field in (
        "registry_total",
        "registry_visible",
        "db_total",
        "db_active_total",
        "db_visible_total",
        "orphan_count",
        "missing_count",
    ):
        assert isinstance(body[field], int), field
    assert isinstance(body["orphan_keys"], list)
    assert isinstance(body["missing_keys"], list)
    assert isinstance(body["visible_but_hidden_keys"], list)
    assert body["registry_total"] == len(KNOWN_SETTINGS)


# ---------------------------------------------------------------------------
# Admin guard — POST /settings/drift/repair
# ---------------------------------------------------------------------------


async def test_drift_repair_requires_auth(raw_client: AsyncClient):
    r = await raw_client.post(f"{DRIFT_BASE}/repair")
    assert r.status_code == 401, r.text


async def test_drift_repair_forbidden_for_non_admin(
    client: AsyncClient, db_session: AsyncSession
):
    viewer = await _make_user(db_session, role="user")
    r = await client.post(f"{DRIFT_BASE}/repair", headers=_headers(viewer))
    assert r.status_code == 403, r.text


async def test_drift_repair_marks_orphan_and_is_idempotent(
    client: AsyncClient, db_session: AsyncSession
):
    admin = await _make_user(db_session, role="admin")
    # Snapshot admin identity BEFORE any endpoint-side commits expire
    # our session's attributes — otherwise rebuilding the JWT header after
    # the POST triggers a lazy refresh that fails outside the greenlet.
    headers = _headers(admin)

    stale_key = f"am4.repair.{_uuid4().hex[:8]}"
    assert stale_key not in KNOWN_SETTINGS
    await _insert_setting(
        db_session, key=stale_key, status="active", visible_to_user=True
    )

    # First call marks the row.
    first = await client.post(f"{DRIFT_BASE}/repair", headers=headers)
    assert first.status_code == 200, first.text
    payload = first.json()
    assert payload["marked_orphan"] >= 1
    assert payload["reactivated"] == 0
    assert stale_key in payload["report"]["orphan_keys"]

    # Row must actually be flipped on disk.
    db_session.expire_all()
    row = await _fetch_setting(db_session, stale_key)
    assert row is not None and row.status == "orphan"

    # Second call must be a no-op (idempotent).
    second = await client.post(f"{DRIFT_BASE}/repair", headers=headers)
    assert second.status_code == 200, second.text
    payload2 = second.json()
    assert payload2["marked_orphan"] == 0
    assert payload2["reactivated"] == 0
