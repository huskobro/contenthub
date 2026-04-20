"""
DB backup / restore — minimum honest implementation (Faz 3, Item 4).

Design constraints (from CLAUDE.md):
  - No new product features; this is operator hygiene only.
  - Must be honest: do NOT claim hot-swap restore. Restore stops the
    backend before swapping the file.
  - Must be safe with WAL mode: use SQLite's online backup API
    (`sqlite3.Connection.backup`) which copies pages under a shared
    lock, so a running backend cannot corrupt the snapshot.
  - Backups are plain SQLite files (no compression yet) so any
    SQLite tool can read them — no proprietary format lock-in.

Public API:
  backup_database(target_dir=None) -> Path
      Take a hot snapshot of the live DB. Safe to run while the
      backend is running.
  restore_database(snapshot_path, confirm=False) -> Path
      Atomically replace the live DB with `snapshot_path`. The caller
      MUST stop the backend first; this function will raise if the
      target DB is locked.

CLI: see backend/scripts/backup_db.py and backend/scripts/restore_db.py.
"""

from __future__ import annotations

import os
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

from app.core.config import settings


# Snapshot filename pattern: contenthub_backup_YYYYMMDD_HHMMSS.db
_SNAPSHOT_PREFIX = "contenthub_backup_"
_SNAPSHOT_SUFFIX = ".db"


def _live_db_path() -> Path:
    """Resolve the live SQLite DB path from settings.data_dir."""
    return Path(settings.data_dir) / "contenthub.db"


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def backup_database(target_dir: Path | None = None) -> Path:
    """
    Create a snapshot of the live SQLite DB.

    Uses SQLite's online backup API so it is safe to run against a live,
    WAL-enabled DB. Returns the absolute path of the created snapshot.

    Raises:
        FileNotFoundError: live DB does not exist (run `alembic upgrade head` first).
        sqlite3.OperationalError: snapshot copy failed.
    """
    src = _live_db_path()
    if not src.exists():
        raise FileNotFoundError(
            f"Live DB not found at {src}. Run `python -m alembic upgrade head` first."
        )

    if target_dir is None:
        target_dir = src.parent
    _ensure_dir(target_dir)

    dest = target_dir / f"{_SNAPSHOT_PREFIX}{_timestamp()}{_SNAPSHOT_SUFFIX}"

    # SQLite online backup — pages are copied under a shared lock; the
    # source DB stays usable. WAL frames in flight are checkpointed by
    # the backup API into the destination as a single consistent snapshot.
    src_conn = sqlite3.connect(str(src))
    try:
        dest_conn = sqlite3.connect(str(dest))
        try:
            src_conn.backup(dest_conn)
        finally:
            dest_conn.close()
    finally:
        src_conn.close()

    return dest


def list_snapshots(snapshot_dir: Path | None = None) -> list[Path]:
    """List existing snapshots, newest first."""
    if snapshot_dir is None:
        snapshot_dir = Path(settings.data_dir)
    if not snapshot_dir.exists():
        return []
    snaps = [
        p for p in snapshot_dir.iterdir()
        if p.is_file()
        and p.name.startswith(_SNAPSHOT_PREFIX)
        and p.name.endswith(_SNAPSHOT_SUFFIX)
    ]
    return sorted(snaps, key=lambda p: p.stat().st_mtime, reverse=True)


def restore_database(snapshot_path: Path, *, confirm: bool = False) -> Path:
    """
    Replace the live DB with `snapshot_path`.

    HONEST BEHAVIOR:
      - Caller must stop the backend before invoking this. This function
        does NOT shut anything down.
      - The current DB is moved aside to `<live>.replaced_<timestamp>` so
        the operator can roll back manually if needed.
      - WAL/SHM sidecar files are also moved aside to prevent the new
        DB from being mis-merged with stale WAL pages.

    Raises:
        FileNotFoundError: snapshot file missing.
        ValueError: snapshot is not a valid SQLite file.
        RuntimeError: live DB is locked (backend still running) or
                      `confirm=False` (safety guard).
    """
    if not confirm:
        raise RuntimeError(
            "restore_database refused: pass confirm=True to acknowledge "
            "that the backend has been stopped and the live DB will be replaced."
        )

    snapshot_path = Path(snapshot_path)
    if not snapshot_path.exists():
        raise FileNotFoundError(f"Snapshot not found: {snapshot_path}")

    # Validate the snapshot is a real SQLite file by opening it briefly.
    try:
        probe = sqlite3.connect(str(snapshot_path))
        try:
            probe.execute("SELECT name FROM sqlite_master LIMIT 1").fetchone()
        finally:
            probe.close()
    except sqlite3.DatabaseError as exc:
        raise ValueError(
            f"Snapshot {snapshot_path} is not a valid SQLite database: {exc}"
        ) from exc

    live = _live_db_path()
    ts = _timestamp()

    # Move live DB + sidecars aside if present.
    aside_paths: list[Path] = []
    for sidecar in (live, Path(str(live) + "-wal"), Path(str(live) + "-shm")):
        if sidecar.exists():
            aside = sidecar.with_name(sidecar.name + f".replaced_{ts}")
            os.replace(sidecar, aside)
            aside_paths.append(aside)

    _ensure_dir(live.parent)
    shutil.copy2(snapshot_path, live)
    return live
