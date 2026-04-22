"""
Tests — Phase AL / P3.2: approver_user_id migration (fresh-DB + rollback).

Kapsam:
  A) alembic upgrade head boş DB'de phase_al_001 revision'ını uygular
  B) automation_policies.approver_user_id kolonu eklenir (nullable, FK users.id)
  C) ix_automation_policies_approver_user_id index'i olusur
  D) alembic downgrade -1: approver_user_id kolonu + index kaldirilir
  E) downgrade sonrasi re-upgrade (idempotent) calisir
  F) Mevcut automation_policies kayitlarinda NULL default (backward compat)

Doğrulama yöntemi:
  - Geçici dizin + boş SQLite DB
  - CONTENTHUB_DATA_DIR env override ile gerçek alembic komutları
  - create_all veya stamp kullanılmaz — yalnızca alembic CLI
"""
from __future__ import annotations

import os
import subprocess
import sqlite3
import tempfile
from pathlib import Path

import pytest


BACKEND_DIR = Path(__file__).resolve().parents[1]
ALEMBIC_TARGET = "phase_al_001"
PHASE_AG_REVISION = "phase_ag_001"


def _run_alembic(cmd: list[str], data_dir: str) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    env["CONTENTHUB_DATA_DIR"] = data_dir
    return subprocess.run(
        ["python3", "-m", "alembic"] + cmd,
        cwd=str(BACKEND_DIR),
        env=env,
        capture_output=True,
        text=True,
    )


def _db_path(data_dir: str) -> Path:
    return Path(data_dir) / "contenthub.db"


def _fetch_columns(db_path: Path, table: str) -> dict[str, dict]:
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute(f"PRAGMA table_info({table})")
        cols = {row[1]: {"type": row[2], "notnull": row[3], "default": row[4]} for row in cur}
    finally:
        conn.close()
    return cols


def _fetch_indexes(db_path: Path, table: str) -> set[str]:
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.execute(f"PRAGMA index_list({table})")
        names = {row[1] for row in cur}
    finally:
        conn.close()
    return names


# ---------------------------------------------------------------------------
# Test A — upgrade to phase_al_001 succeeds (revision still in history; later
# revisions like branding_center_001 may move the head past it).
# ---------------------------------------------------------------------------

def test_a_fresh_db_upgrades_to_phase_al_001():
    with tempfile.TemporaryDirectory() as tmp:
        # Upgrade to phase_al_001 explicitly — locks coverage on this revision
        # without coupling the test to the global alembic head.
        result = _run_alembic(["upgrade", ALEMBIC_TARGET], tmp)
        assert result.returncode == 0, f"upgrade {ALEMBIC_TARGET} failed:\nSTDOUT:{result.stdout}\nSTDERR:{result.stderr}"

        current = _run_alembic(["current"], tmp)
        assert ALEMBIC_TARGET in current.stdout, (
            f"expected current={ALEMBIC_TARGET}, got:\n{current.stdout}"
        )


# ---------------------------------------------------------------------------
# Test B — approver_user_id column exists after upgrade head
# ---------------------------------------------------------------------------

def test_b_approver_user_id_column_added():
    with tempfile.TemporaryDirectory() as tmp:
        result = _run_alembic(["upgrade", "head"], tmp)
        assert result.returncode == 0

        cols = _fetch_columns(_db_path(tmp), "automation_policies")
        assert "approver_user_id" in cols, (
            f"approver_user_id kolonu yok. Columns: {list(cols.keys())}"
        )
        meta = cols["approver_user_id"]
        assert meta["type"].upper().startswith("VARCHAR") or meta["type"].upper() == "VARCHAR(36)"
        assert meta["notnull"] == 0, "approver_user_id nullable olmali"


# ---------------------------------------------------------------------------
# Test C — index ix_automation_policies_approver_user_id exists
# ---------------------------------------------------------------------------

def test_c_approver_user_id_index_created():
    with tempfile.TemporaryDirectory() as tmp:
        result = _run_alembic(["upgrade", "head"], tmp)
        assert result.returncode == 0

        indexes = _fetch_indexes(_db_path(tmp), "automation_policies")
        assert "ix_automation_policies_approver_user_id" in indexes, (
            f"approver index yok. Indexes: {indexes}"
        )


# ---------------------------------------------------------------------------
# Test D — downgrade -1 drops column + index
# ---------------------------------------------------------------------------

def test_d_downgrade_drops_approver_column_and_index():
    with tempfile.TemporaryDirectory() as tmp:
        # Upgrade to phase_al_001 explicitly so downgrade -1 lands at the
        # immediate predecessor (phase_ag_001), independent of later heads.
        up = _run_alembic(["upgrade", ALEMBIC_TARGET], tmp)
        assert up.returncode == 0

        down = _run_alembic(["downgrade", "-1"], tmp)
        assert down.returncode == 0, (
            f"downgrade -1 basarisiz:\nSTDOUT:{down.stdout}\nSTDERR:{down.stderr}"
        )

        cols = _fetch_columns(_db_path(tmp), "automation_policies")
        assert "approver_user_id" not in cols

        indexes = _fetch_indexes(_db_path(tmp), "automation_policies")
        assert "ix_automation_policies_approver_user_id" not in indexes

        # Revision phase_ag_001 olmali
        current = _run_alembic(["current"], tmp)
        assert PHASE_AG_REVISION in current.stdout, (
            f"downgrade sonrasi revision beklenen={PHASE_AG_REVISION}, got:\n{current.stdout}"
        )


# ---------------------------------------------------------------------------
# Test E — re-upgrade after downgrade is idempotent
# ---------------------------------------------------------------------------

def test_e_reupgrade_after_downgrade():
    with tempfile.TemporaryDirectory() as tmp:
        # Lock the cycle to phase_al_001 so the test stays meaningful even when
        # later revisions move the global head past it.
        assert _run_alembic(["upgrade", ALEMBIC_TARGET], tmp).returncode == 0
        assert _run_alembic(["downgrade", "-1"], tmp).returncode == 0
        re_up = _run_alembic(["upgrade", ALEMBIC_TARGET], tmp)
        assert re_up.returncode == 0, (
            f"re-upgrade basarisiz:\nSTDOUT:{re_up.stdout}\nSTDERR:{re_up.stderr}"
        )

        cols = _fetch_columns(_db_path(tmp), "automation_policies")
        assert "approver_user_id" in cols


# ---------------------------------------------------------------------------
# Test F — backward compat: existing AutomationPolicy rows get NULL approver
# ---------------------------------------------------------------------------

def test_f_existing_rows_have_null_approver():
    """Mevcut automation_policies satirlari (migration oncesi) approver_user_id
    icin NULL default almali. Tam insert chain (user + channel + policy) yerine
    kolon meta-datasini PRAGMA ile + raw INSERT uzerinden dogrula:
      - approver_user_id kolonu PRAGMA'da dflt_value NULL olmali
      - Yeni bir row insert edildiginde (minimal user+channel kurulumuyla)
        approver_user_id otomatik NULL olmali
    """
    with tempfile.TemporaryDirectory() as tmp:
        assert _run_alembic(["upgrade", "head"], tmp).returncode == 0

        conn = sqlite3.connect(str(_db_path(tmp)))
        try:
            # 1) PRAGMA ile kolon default'u NULL mu?
            cur = conn.execute("PRAGMA table_info(automation_policies)")
            meta = {row[1]: row for row in cur}
            assert "approver_user_id" in meta, "Kolon yok"
            # row: (cid, name, type, notnull, dflt_value, pk)
            _, _, _, notnull, dflt_value, _ = meta["approver_user_id"]
            assert notnull == 0, "approver_user_id nullable olmali"
            assert dflt_value is None, f"default NULL beklenir, got={dflt_value!r}"

            # 2) Minimal insert chain: user -> channel_profile -> automation_policy
            conn.execute(
                "INSERT INTO users "
                "(id, email, display_name, slug, role, status, "
                " created_at, updated_at) "
                "VALUES ('u-t1', 'test@example.com', 'Test User', 'test-user', "
                " 'user', 'active', "
                " '2026-04-18 00:00:00', '2026-04-18 00:00:00')"
            )
            conn.execute(
                "INSERT INTO channel_profiles "
                "(id, user_id, profile_name, channel_slug, default_language, "
                " import_status, status, created_at, updated_at) "
                "VALUES ('ch-t1', 'u-t1', 'Test', 'test-slug', 'tr', "
                " 'pending', 'active', "
                " '2026-04-18 00:00:00', '2026-04-18 00:00:00')"
            )
            conn.execute(
                "INSERT INTO automation_policies "
                "(id, channel_profile_id, name, is_enabled, source_scan_mode, "
                " draft_generation_mode, render_mode, publish_mode, post_publish_mode, "
                " max_daily_posts, created_at, updated_at) "
                "VALUES ('pol-t1', 'ch-t1', 'Test', 0, 'disabled', 'manual_review', "
                " 'disabled', 'manual_review', 'disabled', 10, "
                " '2026-04-18 00:00:00', '2026-04-18 00:00:00')"
            )
            conn.commit()

            cur = conn.execute(
                "SELECT approver_user_id FROM automation_policies WHERE id = 'pol-t1'"
            )
            row = cur.fetchone()
            assert row is not None, "Policy insert'i basarisiz"
            assert row[0] is None, f"approver_user_id NULL olmaliydi, got={row[0]}"
        finally:
            conn.close()
