"""
activate_surfaces.py — Surface Registry aktivasyon scripti.

Amac: Surface Registry altyapisinin default kapali halini (legacy) bozmadan,
admin_value_json uzerinden calistirilabilir/geri alinabilir sekilde Canvas
(user scope) ve Bridge (admin scope) yuzeylerini aktive etmek.

Bu script CLAUDE.md'deki su kurallara uyar:
  - "No hidden magic flags" — aktivasyon DB'de settings satirlari uzerinde
    yapilir, builtin_default'lar false/legacy kalir; kill-switch'ler
    acilmazsa her sey eski haline doner.
  - "All critical behavior must be visible and manageable in the admin panel"
    — bu script sadece Settings Registry'deki mevcut satirlarin admin_value_json
    alanini gunceller; Settings sayfasinda / Admin UI'da gorulur ve elle
    geri alinabilir.
  - Idempotent: tekrar tekrar calistirilabilir; her calistirmada guncelleme
    istenen deger zaten yazili degilse `version += 1` yapar.

Calistirma (backend/ klasorunden):

    .venv/bin/python3 scripts/activate_surfaces.py              # aktive et
    .venv/bin/python3 scripts/activate_surfaces.py --revert     # admin_value_json'u null'a dondur

Etkilenen settings keyler:
  - ui.surface.infrastructure.enabled -> true
  - ui.surface.bridge.enabled         -> true
  - ui.surface.canvas.enabled         -> true
  - ui.surface.default.admin          -> "bridge"
  - ui.surface.default.user           -> "canvas"

Etkilenmeyenler (bilincli):
  - ui.surface.atrium.enabled         -> DOKUNULMAZ (Faz 1 placeholder; secilirse
                                         resolver zaten legacy'ye duser)

Resolver mantigi (Layer 3 / role-default):
  - infrastructureEnabled=true olduktan sonra, kullanici localStorage'inda bir
    tercih yoksa role-default devreye girer:
      * admin panel: bridge (admin-scope) -> BridgeAdminLayout render edilir
      * user panel:  canvas (user-scope)  -> CanvasUserLayout render edilir
  - Hatali/scope-uyumsuz tercihler layer-by-layer duserek her zaman legacy'ye
    guvenli bir sekilde geri dusebilir. Kill-switch tekrar kapatildiginda
    `legacyLayoutMode` (themeStore) devreye girer.
"""

from __future__ import annotations

import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Tuple

BACKEND_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BACKEND_DIR / "data" / "contenthub.db"


# Aktivasyonda hangi key hangi degere yazilsin
ACTIVATION_PLAN: List[Tuple[str, object]] = [
    ("ui.surface.infrastructure.enabled", True),
    ("ui.surface.bridge.enabled", True),
    ("ui.surface.canvas.enabled", True),
    ("ui.surface.default.admin", "bridge"),
    ("ui.surface.default.user", "canvas"),
]

# Revert durumunda hangi keyler null'a dondurulecek
REVERT_KEYS: List[str] = [k for (k, _) in ACTIVATION_PLAN]


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")


def _apply(cursor: sqlite3.Cursor, key: str, value: object) -> Tuple[str, Optional[str], str]:
    """
    Return (status, before, after) where status is one of:
      - 'unchanged' (admin_value_json zaten istenen deger)
      - 'updated'
      - 'missing'   (settings satiri yok)
    """
    cursor.execute(
        "SELECT admin_value_json, version FROM settings WHERE key = ?",
        (key,),
    )
    row = cursor.fetchone()
    if row is None:
        return ("missing", None, json.dumps(value))

    before, version = row
    after = json.dumps(value)

    if before == after:
        return ("unchanged", before, after)

    cursor.execute(
        """
        UPDATE settings
           SET admin_value_json = ?,
               version = ?,
               updated_at = ?
         WHERE key = ?
        """,
        (after, version + 1, _now_iso(), key),
    )
    return ("updated", before, after)


def _revert(cursor: sqlite3.Cursor, key: str) -> Tuple[str, Optional[str]]:
    cursor.execute(
        "SELECT admin_value_json, version FROM settings WHERE key = ?",
        (key,),
    )
    row = cursor.fetchone()
    if row is None:
        return ("missing", None)
    before, version = row
    if before == "null":
        return ("unchanged", before)
    cursor.execute(
        """
        UPDATE settings
           SET admin_value_json = 'null',
               version = ?,
               updated_at = ?
         WHERE key = ?
        """,
        (version + 1, _now_iso(), key),
    )
    return ("updated", before)


def main() -> int:
    revert = "--revert" in sys.argv[1:]
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        return 1

    conn = sqlite3.connect(str(DB_PATH))
    try:
        cursor = conn.cursor()

        if revert:
            print("[activate_surfaces] REVERT modu: admin_value_json'lari null'a donduruyorum.")
            for key in REVERT_KEYS:
                status, before = _revert(cursor, key)
                print(f"  - {key:38} {status:>10}  before={before}")
        else:
            print("[activate_surfaces] ACTIVATE modu: Canvas (user) + Bridge (admin) aktive ediliyor.")
            for key, value in ACTIVATION_PLAN:
                status, before, after = _apply(cursor, key, value)
                print(
                    f"  - {key:38} {status:>10}  before={before}  after={after}"
                )

        conn.commit()
        print("[activate_surfaces] done.")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
