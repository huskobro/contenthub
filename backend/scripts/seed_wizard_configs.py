"""
Seed wizard_configs table from app.wizard_configs.seed data.
Run from backend/ directory: .venv/bin/python3 scripts/seed_wizard_configs.py
"""

import json
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Ensure backend/app is importable
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.wizard_configs.seed import ALL_WIZARD_CONFIGS

DB_PATH = backend_dir / "data" / "contenthub.db"


def seed():
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    inserted = []
    skipped = []

    for config in ALL_WIZARD_CONFIGS:
        wizard_type = config["wizard_type"]

        # Check if already exists
        cursor.execute(
            "SELECT id FROM wizard_configs WHERE wizard_type = ?", (wizard_type,)
        )
        if cursor.fetchone():
            skipped.append(wizard_type)
            continue

        row_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO wizard_configs
                (id, wizard_type, display_name, enabled, steps_config_json,
                 field_defaults_json, module_scope, status, version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row_id,
                wizard_type,
                config["display_name"],
                True,
                json.dumps(config["steps_config"], ensure_ascii=False),
                json.dumps(config.get("field_defaults", {}), ensure_ascii=False),
                config.get("module_scope"),
                "active",
                1,
                now,
                now,
            ),
        )
        inserted.append(wizard_type)

    conn.commit()
    conn.close()

    if inserted:
        print(f"Inserted {len(inserted)} wizard config(s): {', '.join(inserted)}")
    if skipped:
        print(f"Skipped {len(skipped)} (already exist): {', '.join(skipped)}")
    if not inserted and not skipped:
        print("No configs to seed.")


if __name__ == "__main__":
    seed()
