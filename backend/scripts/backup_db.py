#!/usr/bin/env python3
"""
ContentHub DB backup CLI (Faz 3, Item 4).

Usage:
    python -m scripts.backup_db [--out DIR]

Takes a hot snapshot of the live SQLite DB using SQLite's online backup API.
Safe to run while the backend is running.

Output: prints the absolute path of the created snapshot to stdout.
Exit code: 0 on success, 1 on failure.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Allow `python scripts/backup_db.py` to find `app.*` imports.
_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.db.backup import backup_database  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Hot-snapshot the live ContentHub SQLite DB."
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Directory to write the snapshot into (default: backend/data/).",
    )
    args = parser.parse_args()

    try:
        snap = backup_database(target_dir=args.out)
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"ERROR: backup failed: {exc}", file=sys.stderr)
        return 1

    print(str(snap))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
