#!/usr/bin/env python3
"""
ContentHub DB restore CLI (Faz 3, Item 4).

Usage:
    python -m scripts.restore_db <snapshot_path> --confirm

Replaces the live SQLite DB with the supplied snapshot file. The previous
DB (and any WAL/SHM sidecars) are moved aside to `<file>.replaced_<ts>`.

REQUIREMENTS:
    1. Stop the backend first. This script will refuse if the live DB is
       still locked by uvicorn / a running pipeline.
    2. Pass --confirm explicitly. Restore is destructive.

Exit code: 0 on success, 1 on failure or missing --confirm.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.db.backup import list_snapshots, restore_database  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Restore the live ContentHub SQLite DB from a snapshot."
    )
    parser.add_argument(
        "snapshot",
        type=Path,
        nargs="?",
        help="Path to the snapshot .db file. If omitted, --list available snapshots.",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Required: acknowledges the backend has been stopped and the live DB will be replaced.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available snapshots in backend/data/ (newest first) and exit.",
    )
    args = parser.parse_args()

    if args.list or args.snapshot is None:
        snaps = list_snapshots()
        if not snaps:
            print("No snapshots found in backend/data/.", file=sys.stderr)
            return 1
        for s in snaps:
            print(str(s))
        return 0

    try:
        live = restore_database(args.snapshot, confirm=args.confirm)
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        print("       Re-run with --confirm after stopping the backend.", file=sys.stderr)
        return 1
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    print(f"Restored: {live}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
