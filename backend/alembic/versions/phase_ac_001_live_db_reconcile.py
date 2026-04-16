"""PHASE AC — Live DB schema reconciliation (drift fix).

Revision ID: phase_ac_001
Revises: phase_x_001
Create Date: 2026-04-16

Arka plan
---------
Canli DB (backend/data/contenthub.db) uzerinde gecmiste SQLAlchemy
`metadata.create_all()` yontemi calistirilmis gorunuyor. Bu davranis:
  - mevcut tablolari DOKUNMAZ (sadece olmayan tablolari yaratir)
  - sonuc olarak, yeni tablolar (channel_profiles, content_projects,
    platform_posts, synced_*, youtube_*, vb.) fiziksel olarak DB'de
    olustu
  - ancak eski tablolara (jobs, news_bulletins, standard_videos, users)
    migration'larin ekledigi yeni kolonlar EKLENMEDI
  - alembic_version kaydi `dddfc15f2434` seviyesinde takili kaldi

Beklenen head: `phase_x_001`.
Canli revision: `dddfc15f2434`.
Arada 15 migration var; tabloya ozel DDL'lerinin COGU fiziksel olarak
zaten uygulanmis durumda; kolon DDL'leri kismen eksik.

Bu migration'in gorevi
----------------------
Canli DB'nin gercek durumu ile ORM modelinin beklentisi arasindaki
dar farki kapatmak. Sadece eksik kolonlari ve index'leri ekler; higbir
drop yapmaz, higbir veri silmez.

Idempotency
-----------
Her islem oncesinde `PRAGMA table_info(...)` ve `sqlite_master` uzerinden
gercek durum sorgulanir. Zaten varsa DDL skip edilir. Bu sayede:
  - fresh DB (phase_x_001 uzerinde temiz) kosusunda: tum kolonlar/indexler
    zaten var olacagi icin migration no-op gibi davranir
  - canli DB kosusunda: yalniz eksik olanlar eklenir
  - migration tekrar calisirsa patlamaz

Stamp stratejisi (uygulama notu — migration'in kendi icinde degil)
-----------------------------------------------------------------
Bu migration uygulanmadan ONCE dis komutla `alembic stamp phase_x_001`
yapilacak. Bu adim dogrudur cunku:
  - phase_x_001 ve oncesi tarafindan eklenen tablolarin fiziksel DDL'leri
    canli DB'de zaten mevcut (channel_profiles, content_projects, vs.)
  - arada kalan kolon-seviyesi DDL'ler bu migration icinde idempotent
    olarak yeniden uygulanir
  - yanlis stamp degildir: DB'nin gercek fiziksel durumu phase_x_001'in
    hedef durumuna cok yakindir, arada kalan fark bu migration ile
    kapatiliyor
  - ALTERNATIF (reddedildi): `alembic upgrade head` ile zincirli kosma
    `IntegrityError: index already exists` hatasi uretir ve sqlite
    transactional DDL desteklemedigi icin kurtarilamaz

Asagi (downgrade)
-----------------
Downgrade no-op. Eklenen kolonlari DB'den dusurmek destructive olur
(veri kaybi riski) ve bu migration'in amaci "mevcut veriyi koruyarak
drift kapat"ti. Downgrade pathway'i ihtiyag halinde ayri bir migration
ile ele alinir.
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "phase_ac_001"
down_revision = "phase_x_001"
branch_labels = None
depends_on = None


# ---------------------------------------------------------------------------
# Idempotent helpers — SQLite-uyumlu existence check'leri
# ---------------------------------------------------------------------------


def _column_exists(conn, table: str, column: str) -> bool:
    rows = conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
    return any(r[1] == column for r in rows)


def _index_exists(conn, name: str) -> bool:
    row = conn.exec_driver_sql(
        "SELECT 1 FROM sqlite_master WHERE type='index' AND name=?",
        (name,),
    ).fetchone()
    return row is not None


def _table_exists(conn, name: str) -> bool:
    row = conn.exec_driver_sql(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (name,),
    ).fetchone()
    return row is not None


def _add_column_if_missing(
    conn,
    table: str,
    column_name: str,
    sql_type: str,
    default_sql: str | None = None,
) -> bool:
    """Kolon yoksa ekler. default_sql verilirse NOT NULL + DEFAULT ile eklenir.

    Returns True if column was added, False if already existed.
    """
    if not _table_exists(conn, table):
        # Tablo yoksa bu migration'in sinirlari disindadir; sessiz gec.
        return False
    if _column_exists(conn, table, column_name):
        return False
    parts = [f"ALTER TABLE {table} ADD COLUMN {column_name} {sql_type}"]
    if default_sql is not None:
        parts.append(f"DEFAULT {default_sql}")
    conn.exec_driver_sql(" ".join(parts))
    return True


def _create_index_if_missing(
    conn,
    name: str,
    table: str,
    columns: list[str],
    unique: bool = False,
) -> bool:
    if not _table_exists(conn, table):
        return False
    if _index_exists(conn, name):
        return False
    uniq = "UNIQUE " if unique else ""
    cols_sql = ", ".join(columns)
    conn.exec_driver_sql(
        f"CREATE {uniq}INDEX {name} ON {table} ({cols_sql})"
    )
    return True


# ---------------------------------------------------------------------------
# Drift kapatma — tablo bazinda
# ---------------------------------------------------------------------------


def _reconcile_jobs(conn) -> list[str]:
    """Model bekliyor: channel_profile_id, content_project_id,
    trigger_source, run_mode, auto_advanced (NOT NULL, default False),
    scheduled_run_id.

    is_test_data zaten var (dddfc15f2434 oncesi migration ile).
    """
    added: list[str] = []

    # channel_profile_id — nullable VARCHAR(36)
    if _add_column_if_missing(conn, "jobs", "channel_profile_id", "VARCHAR(36)"):
        added.append("jobs.channel_profile_id")

    # content_project_id — nullable VARCHAR(36)
    if _add_column_if_missing(conn, "jobs", "content_project_id", "VARCHAR(36)"):
        added.append("jobs.content_project_id")

    # trigger_source — nullable VARCHAR(50)
    if _add_column_if_missing(conn, "jobs", "trigger_source", "VARCHAR(50)"):
        added.append("jobs.trigger_source")

    # run_mode — nullable VARCHAR(50)
    if _add_column_if_missing(conn, "jobs", "run_mode", "VARCHAR(50)"):
        added.append("jobs.run_mode")

    # auto_advanced — model: NOT NULL default=False. Mevcut satirlari
    # bozmamak icin DEFAULT 0 ile ekliyoruz. SQLite'da ADD COLUMN sirasinda
    # NOT NULL + DEFAULT kombinasyonu dogru calisir (mevcut satirlar DEFAULT
    # degerini alir).
    if _add_column_if_missing(
        conn, "jobs", "auto_advanced", "BOOLEAN NOT NULL", default_sql="0"
    ):
        added.append("jobs.auto_advanced")

    # scheduled_run_id — nullable VARCHAR(36)
    if _add_column_if_missing(conn, "jobs", "scheduled_run_id", "VARCHAR(36)"):
        added.append("jobs.scheduled_run_id")

    # Index'ler — model Column(index=True) ile tanimli
    if _create_index_if_missing(
        conn, "ix_jobs_channel_profile_id", "jobs", ["channel_profile_id"]
    ):
        added.append("ix_jobs_channel_profile_id")
    if _create_index_if_missing(
        conn, "ix_jobs_content_project_id", "jobs", ["content_project_id"]
    ):
        added.append("ix_jobs_content_project_id")
    if _create_index_if_missing(
        conn, "ix_jobs_is_test_data", "jobs", ["is_test_data"]
    ):
        added.append("ix_jobs_is_test_data")

    return added


def _reconcile_news_bulletins(conn) -> list[str]:
    """Model bekliyor: content_project_id, channel_profile_id (ikisi de
    nullable).
    """
    added: list[str] = []
    if _add_column_if_missing(
        conn, "news_bulletins", "content_project_id", "VARCHAR(36)"
    ):
        added.append("news_bulletins.content_project_id")
    if _add_column_if_missing(
        conn, "news_bulletins", "channel_profile_id", "VARCHAR(36)"
    ):
        added.append("news_bulletins.channel_profile_id")

    if _create_index_if_missing(
        conn,
        "ix_news_bulletins_content_project_id",
        "news_bulletins",
        ["content_project_id"],
    ):
        added.append("ix_news_bulletins_content_project_id")
    if _create_index_if_missing(
        conn,
        "ix_news_bulletins_channel_profile_id",
        "news_bulletins",
        ["channel_profile_id"],
    ):
        added.append("ix_news_bulletins_channel_profile_id")

    return added


def _reconcile_standard_videos(conn) -> list[str]:
    """Model bekliyor: composition_direction, thumbnail_direction,
    lower_third_style, motion_level, render_format, karaoke_enabled,
    template_id, style_blueprint_id, content_project_id, channel_profile_id.
    """
    added: list[str] = []

    nullable_varchar_cols = [
        ("composition_direction", "VARCHAR(50)"),
        ("thumbnail_direction", "VARCHAR(50)"),
        ("lower_third_style", "VARCHAR(50)"),
        ("motion_level", "VARCHAR(30)"),
        ("render_format", "VARCHAR(20)"),
        ("template_id", "VARCHAR(36)"),
        ("style_blueprint_id", "VARCHAR(36)"),
        ("content_project_id", "VARCHAR(36)"),
        ("channel_profile_id", "VARCHAR(36)"),
    ]
    for name, sql_type in nullable_varchar_cols:
        if _add_column_if_missing(conn, "standard_videos", name, sql_type):
            added.append(f"standard_videos.{name}")

    if _add_column_if_missing(
        conn, "standard_videos", "karaoke_enabled", "BOOLEAN"
    ):
        added.append("standard_videos.karaoke_enabled")

    if _create_index_if_missing(
        conn,
        "ix_standard_videos_content_project_id",
        "standard_videos",
        ["content_project_id"],
    ):
        added.append("ix_standard_videos_content_project_id")
    if _create_index_if_missing(
        conn,
        "ix_standard_videos_channel_profile_id",
        "standard_videos",
        ["channel_profile_id"],
    ):
        added.append("ix_standard_videos_channel_profile_id")

    return added


def _reconcile_users(conn) -> list[str]:
    """Model bekliyor: password_hash (nullable). is_active ORM'de yok —
    eklenmez.
    """
    added: list[str] = []
    if _add_column_if_missing(conn, "users", "password_hash", "VARCHAR(255)"):
        added.append("users.password_hash")
    return added


# ---------------------------------------------------------------------------
# upgrade / downgrade
# ---------------------------------------------------------------------------


def upgrade() -> None:
    bind = op.get_bind()

    all_added: list[str] = []
    all_added += _reconcile_jobs(bind)
    all_added += _reconcile_news_bulletins(bind)
    all_added += _reconcile_standard_videos(bind)
    all_added += _reconcile_users(bind)

    # Migration tekrar kosulursa bile patlamaz; eklenen bir sey yoksa
    # sessizce gecer. Ilk kosuda canli DB'deki drift kolonlari/indexleri
    # doldurulur.
    if all_added:
        # Alembic stdout'a dusmez ama sqlalchemy logger'a yazilabilir;
        # yine de dokumentasyon amacli print kalsin (dev ortaminda goruntu
        # saglar).
        print(
            f"[phase_ac_001] Reconciliation added {len(all_added)} "
            f"schema objects: {all_added}"
        )
    else:
        print(
            "[phase_ac_001] No drift detected — all expected columns and "
            "indexes already present (migration is a no-op on this DB)."
        )


def downgrade() -> None:
    # Destructive downgrade bu migration icin aktif olarak reddedildi.
    # Drift kapatildiktan sonra bu kolonlar/index'ler modelin bekledigi
    # gercek surumun parcasi; dusurmek veri kaybi uretir ve diger
    # migration'lar (fresh DB'de phase_x_001 zaten bunlari olusturur)
    # ile celisir.
    raise NotImplementedError(
        "phase_ac_001 is a forward-only reconciliation migration; "
        "downgrade is intentionally not implemented. To roll back, "
        "restore from backup (backend/data/contenthub.db.pre-migration-*)."
    )
