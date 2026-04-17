"""
Dev DB drift repair — Phase Final F4.

Amac:
  Development ortaminda zaman icinde birikmis test pollution'i ve owner'siz
  kayitlari "urun davranisi" hizasina getir. PRODUCTION DB'ye veya FRESH
  (bos) DB'ye dokunmaz — sadece mevcut kayitlarda drift varsa temizler.

Kurallar (CLAUDE.md):
  * DB SCHEMA degistirilmez (migration yok).
  * FOREIGN KEY iliskileri zorlanmaz — SQLite native SET NULL/CASCADE
    zaten schema seviyesinde tanimli.
  * Hic bir kullanici-uretimi icerik silinmez. Sadece:
      - key'i `test.*` ile baslayan settings (test pollution)
      - owner_id NULL jobs (test/dev donemi artigi)
  * Varsayilan: dry-run. --apply olmadan hic bir write yapilmaz.

Kullanim:
    python scripts/drift_repair.py                # dry-run raporu
    python scripts/drift_repair.py --apply        # gercek silme
    python scripts/drift_repair.py --apply --yes  # confirm-prompt atla

Cikti: her kategori icin bulunan satir sayisi + silinecek / silinen sayisi.
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path


DB_PATH = Path(__file__).resolve().parent.parent / "data" / "contenthub.db"


CATEGORIES = {
    "settings_test_pollution": {
        "count_sql": "SELECT COUNT(*) FROM settings WHERE key LIKE 'test.%'",
        "delete_sql": "DELETE FROM settings WHERE key LIKE 'test.%'",
        "describe": "test.* prefix'li settings key'leri (pytest artigi)",
    },
    "jobs_null_owner": {
        "count_sql": "SELECT COUNT(*) FROM jobs WHERE owner_id IS NULL",
        "delete_sql": "DELETE FROM jobs WHERE owner_id IS NULL",
        "describe": "owner_id NULL olan jobs (eski dev seed artigi)",
    },
    "job_steps_orphan": {
        "count_sql": "SELECT COUNT(*) FROM job_steps WHERE job_id NOT IN (SELECT id FROM jobs)",
        "delete_sql": "DELETE FROM job_steps WHERE job_id NOT IN (SELECT id FROM jobs)",
        "describe": "job_steps kayitlari (silinmis jobs FK hedefi)",
    },
    "prompt_assembly_runs_orphan": {
        "count_sql": "SELECT COUNT(*) FROM prompt_assembly_runs WHERE job_id NOT IN (SELECT id FROM jobs)",
        "delete_sql": "DELETE FROM prompt_assembly_runs WHERE job_id NOT IN (SELECT id FROM jobs)",
        "describe": "prompt_assembly_runs (silinmis jobs FK hedefi)",
    },
    "prompt_assembly_block_traces_orphan": {
        "count_sql": (
            "SELECT COUNT(*) FROM prompt_assembly_block_traces "
            "WHERE assembly_run_id NOT IN (SELECT id FROM prompt_assembly_runs)"
        ),
        "delete_sql": (
            "DELETE FROM prompt_assembly_block_traces "
            "WHERE assembly_run_id NOT IN (SELECT id FROM prompt_assembly_runs)"
        ),
        "describe": "prompt_assembly_block_traces (silinmis runs FK hedefi)",
    },
    "news_bulletins_orphan_job": {
        "count_sql": (
            "SELECT COUNT(*) FROM news_bulletins "
            "WHERE job_id IS NOT NULL AND job_id NOT IN (SELECT id FROM jobs)"
        ),
        # Yayin kaydini SILMEYIZ — sadece job_id referansini NULL'a ceker.
        "delete_sql": (
            "UPDATE news_bulletins SET job_id = NULL "
            "WHERE job_id IS NOT NULL AND job_id NOT IN (SELECT id FROM jobs)"
        ),
        "describe": "news_bulletins job_id (referans NULL'a donusturulur, kayit SILINMEZ)",
    },
}


def _inspect(con: sqlite3.Connection) -> dict[str, int]:
    results: dict[str, int] = {}
    for name, cat in CATEGORIES.items():
        row = con.execute(cat["count_sql"]).fetchone()
        results[name] = int(row[0]) if row and row[0] is not None else 0
    return results


def _apply(con: sqlite3.Connection) -> dict[str, int]:
    deleted: dict[str, int] = {}
    for name, cat in CATEGORIES.items():
        cur = con.execute(cat["delete_sql"])
        deleted[name] = cur.rowcount if cur.rowcount is not None else 0
    con.commit()
    return deleted


def main() -> int:
    parser = argparse.ArgumentParser(description="Dev DB drift repair (safe)")
    parser.add_argument("--apply", action="store_true", help="actually delete")
    parser.add_argument("--yes", action="store_true", help="skip confirm prompt")
    parser.add_argument("--db", type=Path, default=DB_PATH, help="DB path")
    args = parser.parse_args()

    if not args.db.exists():
        print(f"[drift_repair] DB not found: {args.db}")
        return 2

    con = sqlite3.connect(str(args.db))

    print(f"[drift_repair] DB: {args.db}")
    print("[drift_repair] mode:", "APPLY" if args.apply else "dry-run")
    print("")

    found = _inspect(con)
    total = 0
    for name, n in found.items():
        total += n
        print(f"  {name:30s} : {n:4d}  ({CATEGORIES[name]['describe']})")
    print(f"\n  TOTAL candidate rows: {total}")

    if total == 0:
        print("\n[drift_repair] No drift found. Nothing to do.")
        con.close()
        return 0

    if not args.apply:
        print("\n[drift_repair] Dry-run only. Run with --apply to delete.")
        con.close()
        return 0

    if not args.yes:
        resp = input("\nProceed with deletion? [y/N] ")
        if resp.strip().lower() != "y":
            print("[drift_repair] Aborted.")
            con.close()
            return 1

    deleted = _apply(con)
    print("\n[drift_repair] Deleted:")
    for name, n in deleted.items():
        print(f"  {name:30s} : {n:4d}")

    # Post-apply verification
    post = _inspect(con)
    print("\n[drift_repair] After cleanup (should all be 0):")
    for name, n in post.items():
        print(f"  {name:30s} : {n:4d}")

    con.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
