#!/usr/bin/env python3
"""
Aurora Test Seed — Aurora kokpit dashboard'unu zengin gosterilebilmesi icin
"is_test_data=True" + input_data_json'da {aurora_test: true} ile bayrakli
sahte job kayitlari uretir.

Hicbir gercek job/data ile karismaz. Test sonu temizlemek icin:
  python scripts/aurora_test_seed.py --purge

Kullanim:
  python scripts/aurora_test_seed.py            # 4 aktif + 12 tamamlanmis
  python scripts/aurora_test_seed.py --reseed   # once temizler, sonra ekler
  python scripts/aurora_test_seed.py --purge    # sadece temizler
"""
import argparse
import asyncio
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


# Aurora marker — input_data_json icinde bu key bulunan kayitlar Aurora seed'idir.
AURORA_MARKER_KEY = "aurora_test_seed"
AURORA_MARKER_VALUE = True


# Sahte job senaryosu — dashboard.html "RENDERS" + ilave kuyruk
ACTIVE_JOBS = [
    # (id_prefix, module, status, current_step, eta_sec, channel_pid, title)
    ("BLT-AUR-042", "news_bulletin", "running", "Visuals", 92,
     "Haftalik ekonomi bulteni · Aurora test"),
    ("REV-AUR-018", "product_review", "running", "Compose", 18,
     "Urun incelemesi · AirPods Pro 3 · Aurora test"),
    ("VID-AUR-108", "standard_video", "running", "TTS", 227,
     "Tarih belgeseli · Bizans · Aurora test"),
    ("BLT-AUR-041", "news_bulletin", "queued", None, None,
     "Teknoloji bulteni · Aurora test"),
    ("REV-AUR-019", "product_review", "queued", None, None,
     "iPhone 16 Pro Max incelemesi · Aurora test"),
]

COMPLETED_JOBS = [
    ("BLT-AUR-040", "news_bulletin", "completed", 184),
    ("BLT-AUR-039", "news_bulletin", "completed", 167),
    ("BLT-AUR-038", "news_bulletin", "completed", 192),
    ("REV-AUR-017", "product_review", "completed", 251),
    ("REV-AUR-016", "product_review", "completed", 248),
    ("REV-AUR-015", "product_review", "failed", 88),
    ("VID-AUR-107", "standard_video", "completed", 412),
    ("VID-AUR-106", "standard_video", "completed", 429),
    ("VID-AUR-105", "standard_video", "completed", 405),
    ("BLT-AUR-037", "news_bulletin", "completed", 178),
    ("BLT-AUR-036", "news_bulletin", "completed", 185),
    ("REV-AUR-014", "product_review", "failed", 61),
]


def _aurora_input(extra: Optional[dict] = None) -> str:
    payload = {AURORA_MARKER_KEY: AURORA_MARKER_VALUE}
    if extra:
        payload.update(extra)
    return json.dumps(payload, ensure_ascii=False)


def _is_aurora_seed(input_data_json: Optional[str]) -> bool:
    if not input_data_json:
        return False
    try:
        data = json.loads(input_data_json)
    except (ValueError, TypeError):
        return False
    return data.get(AURORA_MARKER_KEY) is AURORA_MARKER_VALUE


async def purge() -> int:
    from sqlalchemy import select
    from app.db.session import AsyncSessionLocal
    from app.db.models import Job

    deleted = 0
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(Job).where(Job.is_test_data.is_(True)))).scalars().all()
        for j in rows:
            if _is_aurora_seed(j.input_data_json):
                await db.delete(j)
                deleted += 1
        await db.commit()
    return deleted


async def seed() -> int:
    from app.db.session import AsyncSessionLocal
    from app.db.models import Job

    now = datetime.now(timezone.utc)
    created = 0

    async with AsyncSessionLocal() as db:
        # Active / queued jobs
        for i, (prefix, module, status, step, eta, title) in enumerate(ACTIVE_JOBS):
            job_id = f"{prefix.lower()}-{int(now.timestamp())}-{i:02d}"
            started = now - timedelta(seconds=120 + i * 30) if status == "running" else None
            j = Job(
                id=job_id,
                module_type=module,
                status=status,
                current_step_key=step,
                estimated_remaining_seconds=eta,
                elapsed_total_seconds=120.0 + i * 30 if status == "running" else None,
                started_at=started,
                created_at=now - timedelta(minutes=5 + i * 2),
                input_data_json=_aurora_input({"display_title": title, "id_label": prefix}),
                is_test_data=True,
            )
            db.add(j)
            created += 1

        # Completed / failed jobs (spread over last 7 days)
        for i, (prefix, module, status, dur) in enumerate(COMPLETED_JOBS):
            job_id = f"{prefix.lower()}-{int(now.timestamp())}-c{i:02d}"
            finished = now - timedelta(hours=2 + i * 4)
            started = finished - timedelta(seconds=dur)
            j = Job(
                id=job_id,
                module_type=module,
                status=status,
                current_step_key="published" if status == "completed" else "render",
                elapsed_total_seconds=float(dur),
                started_at=started,
                finished_at=finished,
                created_at=started - timedelta(minutes=2),
                input_data_json=_aurora_input({"id_label": prefix}),
                is_test_data=True,
                last_error="render_failed: composition timeout" if status == "failed" else None,
            )
            db.add(j)
            created += 1

        await db.commit()
    return created


async def main(do_purge: bool, do_reseed: bool) -> None:
    if do_purge or do_reseed:
        n = await purge()
        print(f"[purge] {n} Aurora seed kaydi silindi.")
    if do_purge and not do_reseed:
        return
    n = await seed()
    print(f"[seed] {n} Aurora seed kaydi eklendi (is_test_data=True, marker={AURORA_MARKER_KEY}).")
    print("Not: Tum kayitlar 'is_test_data=True'; varsayilan job listesinde gizli.")
    print("Aurora dashboard React Query bunlari (admin) include_test_data=True ile gormeli.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--purge", action="store_true", help="Sadece Aurora seed'lerini sil")
    parser.add_argument("--reseed", action="store_true", help="Once temizle, sonra yeniden ekle")
    args = parser.parse_args()
    asyncio.run(main(args.purge, args.reseed))
