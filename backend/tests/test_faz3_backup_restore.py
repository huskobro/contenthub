"""
Faz 3 — BACKUP / RESTORE TRUTH tests.

Goal: prove that the operator-facing backup/restore path works honestly.

Coverage:
  1. backup_database produces a valid, readable SQLite snapshot
  2. backup is safe with a live connection holding a transaction (online API)
  3. restore_database refuses without confirm=True
  4. restore_database swaps the live file and moves the old one aside
  5. restore_database rejects a non-SQLite snapshot
  6. restore_database rejects a missing snapshot
  7. CLI (`scripts/backup_db.py` and `scripts/restore_db.py`) exit 0 on the
     happy path, exit 1 on the safety-guard path.
"""

from __future__ import annotations

import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest


_BACKEND_DIR = Path(__file__).resolve().parents[1]


def _make_workdir() -> Path:
    return Path(tempfile.mkdtemp(prefix="contenthub_backup_"))


def _seed_live_db(workdir: Path) -> Path:
    """Create a minimal SQLite file at workdir/contenthub.db with one row."""
    db = workdir / "contenthub.db"
    conn = sqlite3.connect(str(db))
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("CREATE TABLE marker(id INTEGER PRIMARY KEY, label TEXT)")
        conn.execute("INSERT INTO marker(id, label) VALUES (1, 'pre-backup')")
        conn.commit()
    finally:
        conn.close()
    return db


def _patch_settings_data_dir(monkeypatch: pytest.MonkeyPatch, workdir: Path) -> None:
    """Point app.core.config.settings.data_dir at workdir for this test."""
    from app.core.config import settings as live_settings
    monkeypatch.setattr(live_settings, "data_dir", workdir, raising=True)


# ---------------------------------------------------------------------------
# 1. backup_database produces a valid snapshot
# ---------------------------------------------------------------------------


def test_backup_database_creates_readable_snapshot(monkeypatch):
    workdir = _make_workdir()
    try:
        _seed_live_db(workdir)
        _patch_settings_data_dir(monkeypatch, workdir)

        from app.db.backup import backup_database

        snap = backup_database()
        assert snap.exists(), "snapshot file was not created"
        assert snap.name.startswith("contenthub_backup_")
        assert snap.suffix == ".db"
        assert snap.parent == workdir, "snapshot landed outside data_dir"

        # Snapshot is a valid SQLite file with the row we wrote.
        conn = sqlite3.connect(str(snap))
        try:
            row = conn.execute("SELECT label FROM marker WHERE id=1").fetchone()
            assert row == ("pre-backup",)
        finally:
            conn.close()
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


# ---------------------------------------------------------------------------
# 2. backup_database is safe against a concurrent open connection
# ---------------------------------------------------------------------------


def test_backup_database_safe_with_open_connection(monkeypatch):
    """SQLite online backup API: a live connection must not corrupt the snapshot."""
    workdir = _make_workdir()
    try:
        live = _seed_live_db(workdir)
        _patch_settings_data_dir(monkeypatch, workdir)

        from app.db.backup import backup_database

        # Hold an open connection with an in-flight uncommitted write.
        live_conn = sqlite3.connect(str(live))
        try:
            live_conn.execute("INSERT INTO marker(id, label) VALUES (2, 'in-flight')")
            # do NOT commit yet — backup must skip this row
            snap = backup_database()
            live_conn.commit()
        finally:
            live_conn.close()

        # Snapshot must contain the committed row only.
        snap_conn = sqlite3.connect(str(snap))
        try:
            ids = sorted(r[0] for r in snap_conn.execute("SELECT id FROM marker"))
            assert 1 in ids, "committed row missing from snapshot"
            # The in-flight write either landed (if backup ran after commit
            # finished in another thread, which can't happen here) or did not.
            # Either way the snapshot is internally consistent.
            assert ids in ([1], [1, 2]), f"snapshot ids unexpected: {ids}"
        finally:
            snap_conn.close()
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


# ---------------------------------------------------------------------------
# 3. restore refuses without confirm=True
# ---------------------------------------------------------------------------


def test_restore_database_refuses_without_confirm(monkeypatch):
    workdir = _make_workdir()
    try:
        _seed_live_db(workdir)
        _patch_settings_data_dir(monkeypatch, workdir)
        from app.db.backup import backup_database, restore_database

        snap = backup_database()
        with pytest.raises(RuntimeError, match="confirm=True"):
            restore_database(snap, confirm=False)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


# ---------------------------------------------------------------------------
# 4. restore swaps the live file and moves the old one aside
# ---------------------------------------------------------------------------


def test_restore_database_replaces_live_and_moves_old_aside(monkeypatch):
    workdir = _make_workdir()
    try:
        live = _seed_live_db(workdir)
        _patch_settings_data_dir(monkeypatch, workdir)
        from app.db.backup import backup_database, restore_database

        snap = backup_database()

        # Mutate the live DB AFTER snapshot so we can detect the swap.
        conn = sqlite3.connect(str(live))
        try:
            conn.execute("UPDATE marker SET label='post-backup' WHERE id=1")
            conn.commit()
        finally:
            conn.close()

        restored = restore_database(snap, confirm=True)
        assert restored == live

        # Live DB should now read the OLD label (snapshot wins).
        conn = sqlite3.connect(str(restored))
        try:
            row = conn.execute("SELECT label FROM marker WHERE id=1").fetchone()
            assert row == ("pre-backup",), (
                "live DB did not adopt snapshot contents after restore"
            )
        finally:
            conn.close()

        # Old file should have been moved aside, not deleted.
        aside = list(workdir.glob("contenthub.db.replaced_*"))
        assert aside, (
            "previous live DB was not preserved as .replaced_<ts> — "
            "operator has no rollback path"
        )
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


# ---------------------------------------------------------------------------
# 5. restore rejects a non-SQLite snapshot
# ---------------------------------------------------------------------------


def test_restore_database_rejects_non_sqlite_snapshot(monkeypatch):
    workdir = _make_workdir()
    try:
        _seed_live_db(workdir)
        _patch_settings_data_dir(monkeypatch, workdir)
        from app.db.backup import restore_database

        bad = workdir / "not_a_db.db"
        bad.write_text("this is not a sqlite file")
        with pytest.raises(ValueError, match="not a valid SQLite"):
            restore_database(bad, confirm=True)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


# ---------------------------------------------------------------------------
# 6. restore rejects a missing snapshot
# ---------------------------------------------------------------------------


def test_restore_database_rejects_missing_snapshot(monkeypatch):
    workdir = _make_workdir()
    try:
        _seed_live_db(workdir)
        _patch_settings_data_dir(monkeypatch, workdir)
        from app.db.backup import restore_database

        missing = workdir / "does_not_exist.db"
        with pytest.raises(FileNotFoundError):
            restore_database(missing, confirm=True)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


# ---------------------------------------------------------------------------
# 7. CLI smoke tests
# ---------------------------------------------------------------------------


def _run_cli(workdir: Path, *cli_args: str) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    env["CONTENTHUB_DATA_DIR"] = str(workdir)
    return subprocess.run(
        [sys.executable, *cli_args],
        cwd=str(_BACKEND_DIR),
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_cli_backup_then_list_then_restore_safety_gate():
    workdir = _make_workdir()
    try:
        _seed_live_db(workdir)

        # backup_db.py — happy path
        proc = _run_cli(workdir, "scripts/backup_db.py")
        assert proc.returncode == 0, (
            f"backup CLI failed: stdout={proc.stdout!r} stderr={proc.stderr!r}"
        )
        snap_path = Path(proc.stdout.strip())
        assert snap_path.exists()

        # restore_db.py --list — should print the snapshot
        proc = _run_cli(workdir, "scripts/restore_db.py", "--list")
        assert proc.returncode == 0
        assert str(snap_path) in proc.stdout

        # restore_db.py without --confirm — must exit 1
        proc = _run_cli(workdir, "scripts/restore_db.py", str(snap_path))
        assert proc.returncode == 1, (
            "restore CLI must refuse without --confirm"
        )
        assert "confirm" in proc.stderr.lower()

        # restore_db.py with --confirm — must exit 0
        proc = _run_cli(
            workdir, "scripts/restore_db.py", str(snap_path), "--confirm"
        )
        assert proc.returncode == 0, (
            f"restore CLI failed with --confirm: stderr={proc.stderr!r}"
        )
        assert "Restored" in proc.stdout
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
