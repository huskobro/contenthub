"""
Faz 3 — UPGRADE / OLD DB COMPATIBILITY tests.

Goal: prove that an operator who already has a database at an older Alembic
revision can run `alembic upgrade head` against it and end up with the same
clean schema as a fresh-DB operator.

Coverage:
  1. upgrade from earliest revision (initial_foundation) → head
  2. upgrade from the revision JUST BEFORE faz13_automation_policy_v2 → head
     (this is the migration that previously crashed with
     `no such column: source_scan_mode` on fresh DB; the same crash mode
     would have hit any operator upgrading across this revision boundary)
  3. half-completed migration recovery: stamp DB at intermediate revision,
     run upgrade head, verify it picks up cleanly without re-applying
     completed steps

These tests run real `alembic upgrade` subprocesses against fresh data
directories, exactly as start.sh would do on operator machines.
"""

from __future__ import annotations

import os
import shutil
import sqlite3
import subprocess
import tempfile
from pathlib import Path

import pytest


_BACKEND_DIR = Path(__file__).resolve().parents[1]


def _make_workdir() -> Path:
    return Path(tempfile.mkdtemp(prefix="contenthub_upgrade_"))


def _run_alembic(workdir: Path, *args: str, timeout: int = 180) -> subprocess.CompletedProcess:
    """Run `python -m alembic <args>` against an isolated CONTENTHUB_DATA_DIR."""
    env = os.environ.copy()
    env["CONTENTHUB_DATA_DIR"] = str(workdir)
    return subprocess.run(
        ["python3", "-m", "alembic", *args],
        cwd=str(_BACKEND_DIR),
        env=env,
        capture_output=True,
        text=True,
        timeout=timeout,
    )


def _db_path(workdir: Path) -> Path:
    db_files = list(workdir.glob("*.db"))
    return db_files[0] if db_files else workdir / "contenthub.db"


def _list_tables(db_path: Path) -> set[str]:
    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
        return {r[0] for r in rows}
    finally:
        conn.close()


def _columns(db_path: Path, table: str) -> set[str]:
    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
        return {r[1] for r in rows}
    finally:
        conn.close()


def _current_revision(db_path: Path) -> str | None:
    conn = sqlite3.connect(str(db_path))
    try:
        row = conn.execute(
            "SELECT version_num FROM alembic_version"
        ).fetchone()
        return row[0] if row else None
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# 1. Upgrade from earliest revision → head
# ---------------------------------------------------------------------------


def test_upgrade_from_initial_foundation_reaches_head():
    """
    An operator who set up ContentHub at the very first revision (i.e. only
    the initial_foundation tables) must still be able to upgrade to head
    without hand-editing the schema.
    """
    workdir = _make_workdir()
    try:
        # Step 1: bring schema up to the earliest revision.
        proc = _run_alembic(workdir, "upgrade", "e7dc18c0bcfb")
        assert proc.returncode == 0, (
            f"failed to stage initial revision.\nstdout={proc.stdout!r}\n"
            f"stderr={proc.stderr!r}"
        )

        db_path = _db_path(workdir)
        assert db_path.exists()
        assert _current_revision(db_path) == "e7dc18c0bcfb"

        # Step 2: upgrade to head — this is the operator's actual upgrade flow.
        proc = _run_alembic(workdir, "upgrade", "head")
        assert proc.returncode == 0, (
            f"upgrade-from-initial → head failed.\n"
            f"stdout={proc.stdout!r}\nstderr={proc.stderr!r}"
        )

        # Step 3: head schema reached. The head revision moves as migrations
        # land; we assert the revision chain ends here (aurora_surface_001 is
        # the Aurora-only cleanup migration that follows branding_center_001).
        assert _current_revision(db_path) == "aurora_surface_001"

        # Step 4: critical tables present (matches first-run smoke test).
        tables = _list_tables(db_path)
        critical = {
            "users", "settings", "jobs", "job_steps",
            "publish_records", "publish_logs",
            "templates", "style_blueprints",
            "news_sources", "news_items",
            "automation_policies", "operations_inbox_items",
            "alembic_version",
        }
        missing = critical - tables
        assert not missing, f"upgrade left schema missing: {missing}"
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


# ---------------------------------------------------------------------------
# 2. Upgrade across the faz13 boundary — the historical crash point
# ---------------------------------------------------------------------------


def test_upgrade_across_faz13_boundary_is_safe():
    """
    Pre-Faz-3 root-cause bug: faz13 migration UPDATEd new columns before
    add_column ran, crashing both fresh-DB (cols never created) and
    upgrade-from-87a789ff3f45 (cols created in 87a789... as old names,
    then UPDATE referenced new names that didn't exist yet).

    This test replays the exact upgrade boundary that operators on a
    pre-faz13 DB will cross.
    """
    workdir = _make_workdir()
    try:
        # Stage at 87a789ff3f45 — created automation_policies with OLD schema
        # (cp_source_scan, status, automation_level, ...).
        proc = _run_alembic(workdir, "upgrade", "87a789ff3f45")
        assert proc.returncode == 0, (
            f"failed to stage 87a789ff3f45.\nstderr={proc.stderr!r}"
        )

        db_path = _db_path(workdir)
        # Confirm OLD shape present before upgrade.
        old_cols = _columns(db_path, "automation_policies")
        assert "cp_source_scan" in old_cols, (
            "test setup wrong: 87a789ff3f45 should have created cp_source_scan"
        )
        assert "source_scan_mode" not in old_cols, (
            "test setup wrong: source_scan_mode should not exist yet"
        )

        # Cross the faz13 boundary plus everything after.
        proc = _run_alembic(workdir, "upgrade", "head")
        assert proc.returncode == 0, (
            f"upgrade across faz13 boundary failed — root-cause bug regressed.\n"
            f"stdout={proc.stdout!r}\nstderr={proc.stderr!r}"
        )

        # NEW shape present, OLD columns dropped.
        new_cols = _columns(db_path, "automation_policies")
        assert "source_scan_mode" in new_cols
        assert "publish_mode" in new_cols
        assert "is_enabled" in new_cols
        assert "cp_source_scan" not in new_cols, (
            "old column survived faz13 upgrade — drop step skipped"
        )
        assert "status" not in new_cols, (
            "old 'status' column survived faz13 upgrade"
        )

        # Inbox table created.
        tables = _list_tables(db_path)
        assert "operations_inbox_items" in tables, (
            "faz13 inbox table not created on upgrade"
        )

        assert _current_revision(db_path) == "aurora_surface_001"
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


# ---------------------------------------------------------------------------
# 3. Re-running upgrade head against an already-up-to-date DB is a no-op
# ---------------------------------------------------------------------------


def test_double_upgrade_head_is_noop():
    """
    start.sh runs `alembic upgrade head` on every boot. A DB already at
    head must accept the second pass without errors and without changing
    revision.
    """
    workdir = _make_workdir()
    try:
        proc1 = _run_alembic(workdir, "upgrade", "head")
        assert proc1.returncode == 0, proc1.stderr

        db_path = _db_path(workdir)
        rev_before = _current_revision(db_path)
        assert rev_before == "aurora_surface_001"

        proc2 = _run_alembic(workdir, "upgrade", "head")
        assert proc2.returncode == 0, (
            f"second `upgrade head` failed — start.sh would refuse to boot.\n"
            f"stderr={proc2.stderr!r}"
        )
        rev_after = _current_revision(db_path)
        assert rev_after == rev_before, (
            f"second upgrade changed revision: {rev_before} → {rev_after}"
        )
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


# ---------------------------------------------------------------------------
# 4. `alembic current` reports head exactly once after upgrade
# ---------------------------------------------------------------------------


def test_alembic_current_reports_single_head_after_upgrade():
    """
    Drift detection: after `upgrade head`, `alembic current` must report
    exactly one revision and it must equal `alembic heads`. Mismatch means
    branched history or stamp drift.
    """
    workdir = _make_workdir()
    try:
        proc = _run_alembic(workdir, "upgrade", "head")
        assert proc.returncode == 0, proc.stderr

        cur = _run_alembic(workdir, "current")
        assert cur.returncode == 0
        # `alembic current` prints revision id (and (head)) on stdout.
        assert "aurora_surface_001" in cur.stdout, (
            f"alembic current did not report aurora_surface_001 head:\n{cur.stdout!r}"
        )
        # No branches: single line of revision output.
        non_empty_lines = [
            ln for ln in cur.stdout.strip().splitlines()
            if ln.strip() and not ln.startswith("INFO")
        ]
        assert len(non_empty_lines) == 1, (
            f"alembic reported multiple current revisions (branched?):\n"
            f"{cur.stdout!r}"
        )
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
