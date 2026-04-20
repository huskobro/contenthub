"""
Faz 3 — First-run / bootstrap hardening tests.

Goal: prove that the clone → first-run path is deterministic and safe.

Coverage:
  1. Fresh DB + `alembic upgrade head` → schema reaches latest revision
  2. Fresh schema contains all tables expected by SQLAlchemy metadata
  3. seed_admin_user against an empty users table creates the initial admin
  4. seed_admin_user is idempotent (running twice does not duplicate)
  5. seed_admin_user backfills NULL password_hash (phase_ac drift recovery)
  6. seed_known_settings populates KNOWN_SETTINGS into an empty settings table
  7. seed_known_settings is idempotent

These tests exercise the actual production bootstrap functions, not stubs.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import sqlite3
import tempfile
from pathlib import Path

import pytest


_BACKEND_DIR = Path(__file__).resolve().parents[1]


def _run_alembic_on_fresh_db() -> tuple[Path, subprocess.CompletedProcess]:
    """
    Run `alembic upgrade head` against a brand-new empty data directory.

    Alembic env.py honours `CONTENTHUB_DATA_DIR` to relocate the SQLite file,
    matching how `start.sh` and the M7 migration suite drive Alembic.
    """
    workdir = Path(tempfile.mkdtemp(prefix="contenthub_first_run_"))
    env = os.environ.copy()
    env["CONTENTHUB_DATA_DIR"] = str(workdir)
    proc = subprocess.run(
        ["python3", "-m", "alembic", "upgrade", "head"],
        cwd=str(_BACKEND_DIR),
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )
    # alembic env.py decides the actual file name; locate it.
    db_files = list(workdir.glob("*.db"))
    db_path = db_files[0] if db_files else workdir / "contenthub.db"
    return db_path, proc


# ---------------------------------------------------------------------------
# 1. Fresh-DB + alembic upgrade head completes successfully
# ---------------------------------------------------------------------------


def test_first_run_alembic_upgrade_head_succeeds():
    db_path, proc = _run_alembic_on_fresh_db()
    try:
        assert proc.returncode == 0, (
            f"first-run alembic upgrade failed.\n"
            f"stdout={proc.stdout!r}\n"
            f"stderr={proc.stderr!r}"
        )
        assert db_path.exists(), "alembic did not create the DB file"
    finally:
        shutil.rmtree(db_path.parent, ignore_errors=True)


# ---------------------------------------------------------------------------
# 2. Fresh schema contains the critical product tables
# ---------------------------------------------------------------------------


def test_first_run_schema_has_critical_tables():
    """
    Sanity check that the first-run schema includes the core tables a freshly
    cloned operator needs to actually run the product. If any of these are
    missing, the lifespan handler will crash on startup.
    """
    db_path, proc = _run_alembic_on_fresh_db()
    try:
        assert proc.returncode == 0, proc.stderr
        conn = sqlite3.connect(str(db_path))
        try:
            rows = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
            tables = {r[0] for r in rows}
        finally:
            conn.close()

        critical = {
            "users",                     # auth seed depends on this
            "settings",                  # KNOWN_SETTINGS seed depends on this
            "jobs", "job_steps",         # job engine
            "publish_records", "publish_logs",  # publish hub
            "templates", "style_blueprints",
            "news_sources", "news_items",
            "automation_policies",       # faz13 V2 schema
            "operations_inbox_items",    # faz13
            "alembic_version",
        }
        missing = critical - tables
        assert not missing, (
            f"first-run schema is missing critical tables: {missing}. "
            f"Operator clone-and-run path is broken."
        )
    finally:
        shutil.rmtree(db_path.parent, ignore_errors=True)


# ---------------------------------------------------------------------------
# 3 & 4 — seed_admin_user behaviour (uses the in-memory test DB)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_seed_admin_user_creates_initial_admin_on_empty_db(db_session):
    """A fresh users table must yield a single admin@contenthub.local row."""
    from sqlalchemy import select, delete
    from app.db.models import User
    from app.auth.seed import seed_admin_user

    # Conftest may have already created users; isolate.
    await db_session.execute(delete(User))
    await db_session.commit()

    await seed_admin_user(db_session)

    rows = (await db_session.execute(
        select(User).where(User.role == "admin")
    )).scalars().all()
    assert len(rows) == 1, f"expected exactly 1 admin, got {len(rows)}"
    assert rows[0].email == "admin@contenthub.local"
    assert rows[0].password_hash is not None, "admin must have a usable password"
    assert rows[0].status == "active"


@pytest.mark.asyncio
async def test_seed_admin_user_is_idempotent(db_session):
    """Running seed_admin_user twice must not create a duplicate admin."""
    from sqlalchemy import select, delete
    from app.db.models import User
    from app.auth.seed import seed_admin_user

    await db_session.execute(delete(User))
    await db_session.commit()

    await seed_admin_user(db_session)
    await seed_admin_user(db_session)

    rows = (await db_session.execute(
        select(User).where(User.role == "admin")
    )).scalars().all()
    assert len(rows) == 1, (
        f"seed_admin_user not idempotent — created {len(rows)} admins"
    )


@pytest.mark.asyncio
async def test_seed_admin_user_backfills_null_password_hash(db_session):
    """
    phase_ac drift scenario: a user row existed before password_hash was added.
    The seed function must backfill it so the operator is not locked out.
    """
    from sqlalchemy import select, delete
    from app.db.models import User
    from app.auth.seed import seed_admin_user

    await db_session.execute(delete(User))
    await db_session.commit()

    drifted = User(
        email="driftedadmin@contenthub.local",
        display_name="Drifted",
        slug="drifted-admin",
        role="admin",
        status="active",
        password_hash=None,  # phase_ac drift
    )
    db_session.add(drifted)
    await db_session.commit()

    await seed_admin_user(db_session)

    refreshed = (await db_session.execute(
        select(User).where(User.email == "driftedadmin@contenthub.local")
    )).scalars().one()
    assert refreshed.password_hash is not None, (
        "drifted admin's NULL password_hash was not backfilled"
    )


# ---------------------------------------------------------------------------
# 5 & 6 — settings registry seeding behaviour
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_seed_known_settings_populates_empty_registry(db_session):
    """First-run: KNOWN_SETTINGS keys must land in the DB."""
    from sqlalchemy import delete, select, func
    from app.db.models import Setting
    from app.settings.settings_seed import seed_known_settings

    await db_session.execute(delete(Setting))
    await db_session.commit()

    seeded = await seed_known_settings(db_session)
    assert seeded > 0, "no KNOWN_SETTINGS were seeded — registry is empty"

    count = (await db_session.execute(
        select(func.count(Setting.id))
    )).scalar_one()
    assert count == seeded, "Setting count mismatch after seed"


@pytest.mark.asyncio
async def test_seed_known_settings_is_idempotent(db_session):
    """Second pass must not re-add rows already present."""
    from sqlalchemy import delete, select, func
    from app.db.models import Setting
    from app.settings.settings_seed import seed_known_settings

    await db_session.execute(delete(Setting))
    await db_session.commit()

    first = await seed_known_settings(db_session)
    second = await seed_known_settings(db_session)

    assert first > 0
    assert second == 0, (
        f"seed_known_settings re-added {second} rows on the second pass — "
        "not idempotent"
    )

    total = (await db_session.execute(
        select(func.count(Setting.id))
    )).scalar_one()
    assert total == first, "row count drifted after second seed pass"
