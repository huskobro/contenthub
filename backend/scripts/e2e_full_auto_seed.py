"""
E2E Full-Auto Test Seed — güvenli, izole, rollback'li.

Kullanım:
  cd backend
  .venv/bin/python3 scripts/e2e_full_auto_seed.py seed      # Test verisi oluştur
  .venv/bin/python3 scripts/e2e_full_auto_seed.py rollback   # Temizle
  .venv/bin/python3 scripts/e2e_full_auto_seed.py status     # Mevcut durumu göster

Ne yapar:
  - 1 test channel_profile INSERT
  - 1 test content_project (standard_video) INSERT
  - 1 test template INSERT (mevcut uygun yoksa)
  - 2 settings geçici UPDATE (eski değer kaydedilir)

Güvenlik:
  - Mevcut kayıtlara UPDATE/DELETE yapmaz
  - Tüm ID'ler sabit prefix ile izlenebilir (e2e-fa-*)
  - Rollback tüm INSERT'leri DELETE eder, settings'i eski değere döndürür
  - Manifest dosyası (.e2e_full_auto_manifest.json) ile state takibi
"""

import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "data" / "contenthub.db"
MANIFEST_PATH = Path(__file__).parent.parent / "data" / ".e2e_full_auto_manifest.json"

# Sabit test ID'leri — kolay tanınır, rollback'te kesin hedef
ADMIN_USER_ID = "f423e3c7-40a7-4cc5-bac5-0b9e00711933"
TEST_CHANNEL_ID = "e2e-fa-channel-001"
TEST_PROJECT_ID = "e2e-fa-project-001"
TEST_TEMPLATE_ID = "e2e-fa-template-001"

# Settings key'leri ve test değerleri
SETTINGS_OVERRIDES = {
    "automation.full_auto.enabled": "true",
    "automation.scheduler.enabled": "true",
}

NOW = datetime.now(timezone.utc).isoformat()


def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def save_manifest(data: dict):
    MANIFEST_PATH.write_text(json.dumps(data, indent=2, default=str))
    print(f"  Manifest kaydedildi: {MANIFEST_PATH}")


def load_manifest() -> Optional[dict]:
    if not MANIFEST_PATH.exists():
        return None
    return json.loads(MANIFEST_PATH.read_text())


# ─────────────────────────────────────────────────────────────────────
# SEED
# ─────────────────────────────────────────────────────────────────────

def seed():
    if load_manifest():
        print("HATA: Manifest zaten var — önce rollback yapın.")
        print(f"  Dosya: {MANIFEST_PATH}")
        sys.exit(1)

    conn = get_conn()
    c = conn.cursor()
    manifest = {"created_at": NOW, "inserted": [], "settings_backup": {}}

    # 1. Mevcut uygun template var mı?
    c.execute(
        "SELECT id FROM templates WHERE status='active' LIMIT 1"
    )
    existing_tpl = c.fetchone()
    template_id = existing_tpl["id"] if existing_tpl else TEST_TEMPLATE_ID
    template_created = existing_tpl is None

    if template_created:
        c.execute(
            """INSERT INTO templates (id, name, module_scope, type, status,
               ownership_level, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (TEST_TEMPLATE_ID, "E2E Test Template", "standard_video",
             "content", "active", "system", NOW, NOW),
        )
        manifest["inserted"].append({"table": "templates", "id": TEST_TEMPLATE_ID})
        print(f"  ✓ Template oluşturuldu: {TEST_TEMPLATE_ID}")
    else:
        print(f"  ○ Mevcut template kullanılıyor: {template_id}")

    # 2. Channel profile
    c.execute("SELECT id FROM channel_profiles WHERE id = ?", (TEST_CHANNEL_ID,))
    if c.fetchone():
        print(f"  ○ Channel zaten var: {TEST_CHANNEL_ID}")
    else:
        c.execute(
            """INSERT INTO channel_profiles
               (id, user_id, profile_name, profile_type, channel_slug,
                default_language, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (TEST_CHANNEL_ID, ADMIN_USER_ID, "E2E Test Kanal", "youtube",
             "e2e-test-kanal", "tr", "active", NOW, NOW),
        )
        manifest["inserted"].append({"table": "channel_profiles", "id": TEST_CHANNEL_ID})
        print(f"  ✓ Channel oluşturuldu: {TEST_CHANNEL_ID}")

    # 3. Content project
    c.execute("SELECT id FROM content_projects WHERE id = ?", (TEST_PROJECT_ID,))
    if c.fetchone():
        print(f"  ○ Proje zaten var: {TEST_PROJECT_ID}")
    else:
        c.execute(
            """INSERT INTO content_projects
               (id, user_id, channel_profile_id, module_type, title, description,
                content_status, review_status, publish_status, origin_type, priority,
                automation_enabled, automation_run_mode, automation_schedule_enabled,
                automation_timezone, automation_default_template_id,
                automation_require_review_gate, automation_publish_policy,
                automation_fallback_on_error, automation_max_runs_per_day,
                automation_runs_today, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (TEST_PROJECT_ID, ADMIN_USER_ID, TEST_CHANNEL_ID,
             "standard_video", "E2E Full-Auto Test Projesi",
             "Tam otomatik mod E2E doğrulama projesi",
             "draft", "pending", "unpublished", "manual", "normal",
             1,  # automation_enabled
             "full_auto",  # automation_run_mode
             0,  # automation_schedule_enabled (test sırasında açılacak)
             "Europe/Istanbul",  # timezone
             template_id,  # automation_default_template_id
             1,  # automation_require_review_gate
             "draft",  # automation_publish_policy
             "pause",  # automation_fallback_on_error
             5,  # automation_max_runs_per_day
             0,  # automation_runs_today
             NOW, NOW),
        )
        manifest["inserted"].append({"table": "content_projects", "id": TEST_PROJECT_ID})
        print(f"  ✓ Proje oluşturuldu: {TEST_PROJECT_ID}")

    # 4. Settings geçici değişiklik
    for key, new_val in SETTINGS_OVERRIDES.items():
        c.execute(
            "SELECT admin_value_json FROM settings WHERE key = ?", (key,)
        )
        row = c.fetchone()
        old_val = row["admin_value_json"] if row else None
        manifest["settings_backup"][key] = old_val

        c.execute(
            "UPDATE settings SET admin_value_json = ? WHERE key = ?",
            (new_val, key),
        )
        print(f"  ✓ Setting güncellendi: {key} = {new_val} (eski: {old_val})")

    conn.commit()
    conn.close()

    manifest["template_id"] = template_id
    manifest["template_created"] = template_created
    save_manifest(manifest)

    print()
    print("SEED TAMAMLANDI")
    print(f"  Proje ID : {TEST_PROJECT_ID}")
    print(f"  Channel  : {TEST_CHANNEL_ID}")
    print(f"  Template : {template_id} {'(yeni)' if template_created else '(mevcut)'}")
    print(f"  Settings : {list(SETTINGS_OVERRIDES.keys())}")
    print()
    print("Test URL'leri:")
    print(f"  Proje detay: http://localhost:5173/user/projects/{TEST_PROJECT_ID}")
    print(f"  Evaluate   : curl -X POST http://127.0.0.1:8000/api/v1/full-auto/content-projects/{TEST_PROJECT_ID}/evaluate -H 'X-ContentHub-User-Id: {ADMIN_USER_ID}'")


# ─────────────────────────────────────────────────────────────────────
# ROLLBACK
# ─────────────────────────────────────────────────────────────────────

def rollback():
    manifest = load_manifest()
    if not manifest:
        print("Manifest bulunamadı — rollback yapılacak bir şey yok.")
        return

    conn = get_conn()
    c = conn.cursor()

    # 1. Trigger'ın oluşturduğu job'ları da temizle
    c.execute(
        "SELECT id FROM jobs WHERE content_project_id = ?", (TEST_PROJECT_ID,)
    )
    test_jobs = [r["id"] for r in c.fetchall()]
    for job_id in test_jobs:
        c.execute("DELETE FROM job_steps WHERE job_id = ?", (job_id,))
        c.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
        print(f"  ✓ Job temizlendi: {job_id}")

    # 2. INSERT edilen kayıtları sil (ters sırada)
    for item in reversed(manifest.get("inserted", [])):
        table = item["table"]
        rid = item["id"]
        c.execute(f"DELETE FROM {table} WHERE id = ?", (rid,))
        print(f"  ✓ Silindi: {table}.{rid} (rows={c.rowcount})")

    # 3. Settings'i geri al
    for key, old_val in manifest.get("settings_backup", {}).items():
        c.execute(
            "UPDATE settings SET admin_value_json = ? WHERE key = ?",
            (old_val, key),
        )
        print(f"  ✓ Setting geri alındı: {key} = {old_val}")

    # 4. Audit log'ları temizle (test kaynaklı)
    c.execute(
        "DELETE FROM audit_logs WHERE details_json LIKE ?",
        (f"%{TEST_PROJECT_ID}%",),
    )
    if c.rowcount:
        print(f"  ✓ Audit log temizlendi: {c.rowcount} satır")

    conn.commit()
    conn.close()

    MANIFEST_PATH.unlink(missing_ok=True)
    print()
    print("ROLLBACK TAMAMLANDI — tüm test verisi temizlendi.")


# ─────────────────────────────────────────────────────────────────────
# STATUS
# ─────────────────────────────────────────────────────────────────────

def status():
    manifest = load_manifest()
    conn = get_conn()
    c = conn.cursor()

    print("=== E2E Full-Auto Test Durumu ===")
    print()

    if manifest:
        print(f"Manifest: VAR (oluşturulma: {manifest.get('created_at', '?')})")
        print(f"  Eklenen kayıtlar: {len(manifest.get('inserted', []))}")
        print(f"  Değiştirilen settings: {list(manifest.get('settings_backup', {}).keys())}")
    else:
        print("Manifest: YOK (seed yapılmamış veya rollback edilmiş)")

    print()

    # DB durumu
    c.execute("SELECT COUNT(*) as n FROM content_projects WHERE id = ?", (TEST_PROJECT_ID,))
    print(f"Test proje: {'VAR' if c.fetchone()['n'] else 'YOK'}")

    c.execute("SELECT COUNT(*) as n FROM channel_profiles WHERE id = ?", (TEST_CHANNEL_ID,))
    print(f"Test kanal: {'VAR' if c.fetchone()['n'] else 'YOK'}")

    c.execute("SELECT COUNT(*) as n FROM jobs WHERE content_project_id = ?", (TEST_PROJECT_ID,))
    job_count = c.fetchone()["n"]
    print(f"Test job'ları: {job_count}")

    for key in SETTINGS_OVERRIDES:
        c.execute("SELECT admin_value_json FROM settings WHERE key = ?", (key,))
        row = c.fetchone()
        val = row["admin_value_json"] if row else "N/A"
        print(f"Setting {key}: {val}")

    conn.close()


# ─────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("seed", "rollback", "status"):
        print("Kullanım: python scripts/e2e_full_auto_seed.py [seed|rollback|status]")
        sys.exit(1)

    cmd = sys.argv[1]
    print(f"\n{'='*50}")
    print(f"E2E Full-Auto Seed — {cmd.upper()}")
    print(f"DB: {DB_PATH}")
    print(f"{'='*50}\n")

    if cmd == "seed":
        seed()
    elif cmd == "rollback":
        rollback()
    elif cmd == "status":
        status()
