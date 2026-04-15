"""PHASE X — ownership + channel URL-only + project-job hierarchy columns.

Revision ID: phase_x_001
Revises: product_review_001
Create Date: 2026-04-16

Additive-only migration. Sifir kayip:
  * channel_profiles tablosuna URL-only create + auto-import metadata icin
    yeni kolonlar (platform, source_url, normalized_url, external_channel_id,
    handle, title, avatar_url, metadata_json, import_status, import_error,
    last_import_at).
  * UniqueConstraint(user_id, normalized_url) — ayni kullanici ayni URL'i
    iki kez ekleyemesin.
  * Index'ler: channel_profiles.platform, channel_profiles.normalized_url.
  * Job owner backfill: Job.owner_id NULL ise content_project_id ->
    ContentProject.user_id uzerinden doldurulur (varsa). NULL kalan
    orphan job'lar non-admin icin 403 donecek (kod katmaninda).

Downgrade yalniz kolon/index/constraint'leri geri alir.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "phase_x_001"
down_revision = "product_review_001"
branch_labels = None
depends_on = None


def _existing_columns(conn, table_name: str) -> set[str]:
    insp = sa.inspect(conn)
    return {col["name"] for col in insp.get_columns(table_name)}


def _existing_indexes(conn, table_name: str) -> set[str]:
    insp = sa.inspect(conn)
    return {idx["name"] for idx in insp.get_indexes(table_name)}


def _existing_unique_constraints(conn, table_name: str) -> set[str]:
    insp = sa.inspect(conn)
    return {uc["name"] for uc in insp.get_unique_constraints(table_name)}


def upgrade() -> None:
    conn = op.get_bind()
    existing = _existing_columns(conn, "channel_profiles")

    channel_columns = [
        ("platform", sa.Column("platform", sa.String(length=50), nullable=True)),
        ("source_url", sa.Column("source_url", sa.String(length=2000), nullable=True)),
        (
            "normalized_url",
            sa.Column("normalized_url", sa.String(length=2000), nullable=True),
        ),
        (
            "external_channel_id",
            sa.Column("external_channel_id", sa.String(length=500), nullable=True),
        ),
        ("handle", sa.Column("handle", sa.String(length=255), nullable=True)),
        ("title", sa.Column("title", sa.String(length=500), nullable=True)),
        ("avatar_url", sa.Column("avatar_url", sa.String(length=2000), nullable=True)),
        ("metadata_json", sa.Column("metadata_json", sa.Text(), nullable=True)),
        (
            "import_status",
            sa.Column(
                "import_status",
                sa.String(length=50),
                nullable=False,
                server_default="pending",
            ),
        ),
        ("import_error", sa.Column("import_error", sa.Text(), nullable=True)),
        (
            "last_import_at",
            sa.Column(
                "last_import_at",
                sa.DateTime(timezone=True),
                nullable=True,
            ),
        ),
    ]

    with op.batch_alter_table("channel_profiles") as batch:
        for col_name, col in channel_columns:
            if col_name not in existing:
                batch.add_column(col)

    # Indexes — SQLite friendly (create_index outside batch is fine).
    indexes = _existing_indexes(conn, "channel_profiles")
    if "ix_channel_profiles_platform" not in indexes:
        op.create_index(
            "ix_channel_profiles_platform", "channel_profiles", ["platform"],
            unique=False,
        )
    if "ix_channel_profiles_normalized_url" not in indexes:
        op.create_index(
            "ix_channel_profiles_normalized_url",
            "channel_profiles",
            ["normalized_url"],
            unique=False,
        )

    # Unique constraint on (user_id, normalized_url) — ayni kullanici, ayni URL.
    uniques = _existing_unique_constraints(conn, "channel_profiles")
    if "uq_user_normalized_url" not in uniques:
        with op.batch_alter_table("channel_profiles") as batch:
            batch.create_unique_constraint(
                "uq_user_normalized_url",
                ["user_id", "normalized_url"],
            )

    # ---------------------------------------------------------------
    # Job owner backfill: NULL Job.owner_id icin content_project_id ->
    # ContentProject.user_id uzerinden doldur. Orphan'lar NULL kalir.
    # ---------------------------------------------------------------
    conn.execute(
        sa.text(
            """
            UPDATE jobs
               SET owner_id = (
                   SELECT cp.user_id
                     FROM content_projects cp
                    WHERE cp.id = jobs.content_project_id
               )
             WHERE owner_id IS NULL
               AND content_project_id IS NOT NULL
            """
        )
    )
    # Kanal profilinden de doldurabilecegimiz job'lari da toparla.
    conn.execute(
        sa.text(
            """
            UPDATE jobs
               SET owner_id = (
                   SELECT ch.user_id
                     FROM channel_profiles ch
                    WHERE ch.id = jobs.channel_profile_id
               )
             WHERE owner_id IS NULL
               AND channel_profile_id IS NOT NULL
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()

    uniques = _existing_unique_constraints(conn, "channel_profiles")
    if "uq_user_normalized_url" in uniques:
        with op.batch_alter_table("channel_profiles") as batch:
            batch.drop_constraint("uq_user_normalized_url", type_="unique")

    indexes = _existing_indexes(conn, "channel_profiles")
    if "ix_channel_profiles_normalized_url" in indexes:
        op.drop_index("ix_channel_profiles_normalized_url", table_name="channel_profiles")
    if "ix_channel_profiles_platform" in indexes:
        op.drop_index("ix_channel_profiles_platform", table_name="channel_profiles")

    existing = _existing_columns(conn, "channel_profiles")
    columns_to_drop = [
        "last_import_at",
        "import_error",
        "import_status",
        "metadata_json",
        "avatar_url",
        "title",
        "handle",
        "external_channel_id",
        "normalized_url",
        "source_url",
        "platform",
    ]
    with op.batch_alter_table("channel_profiles") as batch:
        for col in columns_to_drop:
            if col in existing:
                batch.drop_column(col)
