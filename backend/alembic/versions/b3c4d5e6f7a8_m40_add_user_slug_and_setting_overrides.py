"""M40: add user slug column and user_setting_overrides table

Multi-user foundation: adds slug column to users table for filesystem-safe
user identification, and creates user_setting_overrides table for per-user
setting overrides.

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-04-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, Sequence[str], None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add slug column to users (nullable first for backfill)
    op.add_column("users", sa.Column("slug", sa.String(100), nullable=True))

    # 2. Backfill slug from display_name for existing rows
    conn = op.get_bind()
    users = conn.execute(sa.text("SELECT id, display_name FROM users")).fetchall()
    for user_id, display_name in users:
        slug = _slugify(display_name)
        conn.execute(
            sa.text("UPDATE users SET slug = :slug WHERE id = :uid"),
            {"slug": slug, "uid": user_id},
        )

    # 3. If no rows had slug set, that's fine — column remains nullable in SQLite
    #    but we create the unique index for new rows.
    #    SQLite doesn't support ALTER COLUMN NOT NULL, so we rely on the ORM constraint.
    op.create_index("ix_users_slug", "users", ["slug"], unique=True)

    # 4. Create user_setting_overrides table
    op.create_table(
        "user_setting_overrides",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("setting_key", sa.String(255), nullable=False, index=True),
        sa.Column("value_json", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "setting_key", name="uq_user_setting_key"),
    )


def downgrade() -> None:
    op.drop_table("user_setting_overrides")
    op.drop_index("ix_users_slug", table_name="users")
    op.drop_column("users", "slug")


def _slugify(name: str) -> str:
    """Convert display_name to filesystem-safe slug."""
    import re
    import unicodedata
    slug = unicodedata.normalize("NFKD", name.lower())
    slug = slug.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")
    return slug or "user"
