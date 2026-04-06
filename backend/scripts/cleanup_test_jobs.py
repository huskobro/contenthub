#!/usr/bin/env python3
"""
Test job cleanup script — M31.

Eski test/demo job kayitlarini is_test_data=True olarak isaretler.
Hicbir kayit silinmez — sadece varsayilan listeden gizlenir.

Kullanim:
  python scripts/cleanup_test_jobs.py [--days 7] [--module news_bulletin]
"""
import asyncio
import argparse
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


async def main(older_than_days: int, module_type: str | None) -> None:
    from app.db.session import AsyncSessionLocal
    from app.jobs.service import bulk_archive_test_jobs

    async with AsyncSessionLocal() as db:
        count = await bulk_archive_test_jobs(
            db,
            older_than_days=older_than_days,
            module_type=module_type,
        )
        print(f"Arşivlendi: {count} test job kaydı is_test_data=True olarak işaretlendi.")
        print("Not: Bu kayıtlar silinmedi — varsayılan listeden gizlendi.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=7)
    parser.add_argument("--module", type=str, default=None)
    args = parser.parse_args()
    asyncio.run(main(args.days, args.module))
