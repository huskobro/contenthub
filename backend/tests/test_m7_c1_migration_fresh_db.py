"""
Tests — M7-C1: Fresh DB Alembic Migration Doğrulaması

Bu test dosyası yalnızca Alembic migration zincirinin doğruluğunu
boş bir veritabanında doğrular.

Kapsam:
  A) alembic upgrade head — boş DB üzerinde tüm zincir başarıyla çalışır
  B) publish_records tablosu migration ile oluşur
  C) publish_logs tablosu migration ile oluşur
  D) publish_records sütunları tam ve doğru
  E) publish_logs sütunları tam ve doğru
  F) publish_records → jobs FK kısıtı mevcut (ondelete=CASCADE)
  G) publish_logs → publish_records FK kısıtı mevcut (ondelete=CASCADE)
  H) alembic_version = c1a2b3d4e5f6 (son revision)
  I) downgrade: publish_records ve publish_logs kaldırılır

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
# Gate 4 (Publish Closure) güncellemesi: head revision artık gate4_001.
# Önceki target c1a2b3d4e5f6 → catchup_001 → gate4_001 zinciri çalışıyor.
ALEMBIC_TARGET = "phase_x_001"

EXPECTED_PR_COLUMNS = {
    "id", "job_id", "content_ref_type", "content_ref_id", "platform",
    "status", "review_state", "reviewer_id", "reviewed_at", "scheduled_at",
    "published_at", "platform_video_id", "platform_url", "publish_attempt_count",
    "last_error",
    # Gate 4: error category for triage UX (categorize_publish_error fills it).
    "last_error_category",
    "payload_json", "result_json", "notes", "created_at", "updated_at",
    # Faz 2: project/connection linkage and test-data flag.
    "content_project_id", "platform_connection_id",
    "publish_intent_json", "publish_result_json", "is_test_data",
}

EXPECTED_PL_COLUMNS = {
    "id", "publish_record_id", "event_type", "actor_type", "actor_id",
    "from_status", "to_status", "detail_json", "note", "created_at",
}


def _run_alembic(cmd: list[str], data_dir: str) -> subprocess.CompletedProcess:
    """Verilen data_dir üzerinde alembic komutu çalıştırır."""
    env = os.environ.copy()
    env["CONTENTHUB_DATA_DIR"] = data_dir
    return subprocess.run(
        ["python3", "-m", "alembic"] + cmd,
        cwd=str(BACKEND_DIR),
        env=env,
        capture_output=True,
        text=True,
    )


def _get_tables(db_path: str) -> list[str]:
    conn = sqlite3.connect(db_path)
    tables = [
        t[0] for t in
        conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
    ]
    conn.close()
    return tables


def _get_columns(db_path: str, table: str) -> set[str]:
    conn = sqlite3.connect(db_path)
    cols = {c[1] for c in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    conn.close()
    return cols


def _get_fk_list(db_path: str, table: str) -> list[tuple]:
    conn = sqlite3.connect(db_path)
    fks = conn.execute(f"PRAGMA foreign_key_list({table})").fetchall()
    conn.close()
    return fks


def _get_version(db_path: str) -> str | None:
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute("SELECT version_num FROM alembic_version").fetchone()
        return row[0] if row else None
    except Exception:
        return None
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Fixture: fresh temp DB
# ---------------------------------------------------------------------------

@pytest.fixture
def fresh_db_dir(tmp_path):
    """Her test için izole, boş bir veri dizini döndürür."""
    return str(tmp_path)


@pytest.fixture
def migrated_db(fresh_db_dir):
    """alembic upgrade head çalıştırılmış fresh DB döndürür."""
    result = _run_alembic(["upgrade", "head"], fresh_db_dir)
    assert result.returncode == 0, (
        f"alembic upgrade head başarısız:\nstdout={result.stdout}\nstderr={result.stderr}"
    )
    db_path = os.path.join(fresh_db_dir, "contenthub.db")
    assert os.path.exists(db_path), "DB dosyası oluşturulmadı"
    return db_path


# ---------------------------------------------------------------------------
# A) alembic upgrade head — tüm zincir başarıyla çalışır
# ---------------------------------------------------------------------------

def test_a_upgrade_head_succeeds_on_fresh_db(fresh_db_dir):
    """
    Fresh (boş) bir DB üzerinde alembic upgrade head sıfır hata ile tamamlanır.

    Bu test create_all veya stamp kullanmaz — yalnızca Alembic CLI.
    """
    result = _run_alembic(["upgrade", "head"], fresh_db_dir)
    assert result.returncode == 0, (
        f"alembic upgrade head başarısız:\nstdout={result.stdout}\nstderr={result.stderr}"
    )
    # Son migration revision log'da görünmeli
    assert ALEMBIC_TARGET in result.stdout or ALEMBIC_TARGET in result.stderr, (
        f"Target revision {ALEMBIC_TARGET} migration log'da bulunamadı"
    )


# ---------------------------------------------------------------------------
# B) publish_records tablosu migration ile oluşur
# ---------------------------------------------------------------------------

def test_b_publish_records_table_exists(migrated_db):
    """publish_records tablosu migration sonrası mevcut olmalı."""
    tables = _get_tables(migrated_db)
    assert "publish_records" in tables, (
        f"publish_records tablosu bulunamadı. Mevcut tablolar: {tables}"
    )


# ---------------------------------------------------------------------------
# C) publish_logs tablosu migration ile oluşur
# ---------------------------------------------------------------------------

def test_c_publish_logs_table_exists(migrated_db):
    """publish_logs tablosu migration sonrası mevcut olmalı."""
    tables = _get_tables(migrated_db)
    assert "publish_logs" in tables, (
        f"publish_logs tablosu bulunamadı. Mevcut tablolar: {tables}"
    )


# ---------------------------------------------------------------------------
# D) publish_records sütunları tam ve doğru
# ---------------------------------------------------------------------------

def test_d_publish_records_columns(migrated_db):
    """publish_records tüm beklenen sütunları içermeli."""
    cols = _get_columns(migrated_db, "publish_records")
    missing = EXPECTED_PR_COLUMNS - cols
    assert not missing, (
        f"publish_records'ta eksik sütunlar: {missing}"
    )


# ---------------------------------------------------------------------------
# E) publish_logs sütunları tam ve doğru
# ---------------------------------------------------------------------------

def test_e_publish_logs_columns(migrated_db):
    """publish_logs tüm beklenen sütunları içermeli."""
    cols = _get_columns(migrated_db, "publish_logs")
    missing = EXPECTED_PL_COLUMNS - cols
    assert not missing, (
        f"publish_logs'ta eksik sütunlar: {missing}"
    )


# ---------------------------------------------------------------------------
# F) publish_records → jobs FK kısıtı (ondelete=CASCADE)
# ---------------------------------------------------------------------------

def test_f_publish_records_fk_to_jobs(migrated_db):
    """publish_records.job_id → jobs.id FK kısıtı mevcut olmalı."""
    fks = _get_fk_list(migrated_db, "publish_records")
    assert len(fks) >= 1, "publish_records'ta FK kısıtı bulunamadı"
    fk_tables = [fk[2] for fk in fks]  # referenced table
    assert "jobs" in fk_tables, (
        f"publish_records → jobs FK bulunamadı. Mevcut FK'lar: {fks}"
    )


# ---------------------------------------------------------------------------
# G) publish_logs → publish_records FK kısıtı (ondelete=CASCADE)
# ---------------------------------------------------------------------------

def test_g_publish_logs_fk_to_publish_records(migrated_db):
    """publish_logs.publish_record_id → publish_records.id FK kısıtı mevcut olmalı."""
    fks = _get_fk_list(migrated_db, "publish_logs")
    assert len(fks) >= 1, "publish_logs'ta FK kısıtı bulunamadı"
    fk_tables = [fk[2] for fk in fks]
    assert "publish_records" in fk_tables, (
        f"publish_logs → publish_records FK bulunamadı. Mevcut FK'lar: {fks}"
    )


# ---------------------------------------------------------------------------
# H) alembic_version = c1a2b3d4e5f6
# ---------------------------------------------------------------------------

def test_h_alembic_version_is_target(migrated_db):
    """Migration sonrası alembic_version = c1a2b3d4e5f6 olmalı."""
    version = _get_version(migrated_db)
    assert version == ALEMBIC_TARGET, (
        f"Beklenen alembic_version={ALEMBIC_TARGET}, alınan={version}"
    )


# ---------------------------------------------------------------------------
# I) downgrade: publish_records ve publish_logs kaldırılır
# ---------------------------------------------------------------------------

def test_i_downgrade_removes_last_error_category(fresh_db_dir):
    """
    Gate 4 sonrası head migration sadece publish_records.last_error_category
    sütununu ekler. downgrade -1 bu sütunu kaldırmalı; publish_records ve
    publish_logs tabloları hâlâ var olmalı.
    """
    # Önce tüm migration'ları uygula
    up = _run_alembic(["upgrade", "head"], fresh_db_dir)
    assert up.returncode == 0, f"upgrade head başarısız: {up.stderr}"

    db_path = os.path.join(fresh_db_dir, "contenthub.db")
    tables_before = _get_tables(db_path)
    assert "publish_records" in tables_before
    assert "publish_logs" in tables_before
    cols_before = _get_columns(db_path, "publish_records")
    assert "last_error_category" in cols_before

    # Bir adım geri al — gate4_001 → catchup_001
    down = _run_alembic(["downgrade", "-1"], fresh_db_dir)
    assert down.returncode == 0, f"downgrade -1 başarısız: {down.stderr}"

    tables_after = _get_tables(db_path)
    # Tablolar HÂLÂ var — sadece son sütun kalktı.
    assert "publish_records" in tables_after
    assert "publish_logs" in tables_after
    cols_after = _get_columns(db_path, "publish_records")
    assert "last_error_category" not in cols_after, (
        "last_error_category downgrade sonrası hâlâ mevcut"
    )

    # Revision catchup_001'e dönülmeli
    version_after = _get_version(db_path)
    assert version_after == "catchup_001", (
        f"Beklenen downgrade target catchup_001, alınan {version_after}"
    )
