"""gate4: add publish_records.last_error_category column

Adds the `last_error_category` column to `publish_records` so that
failed publish attempts can be categorized (token_error / quota_exceeded
/ network / validation / permission / asset_missing / unknown).

Idempotent: column add + index are guarded so this migration is safe for
both fresh-DB and existing-DB scenarios.

Revision ID: gate4_001
Revises: catchup_001
Create Date: 2026-04-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "gate4_001"
down_revision: Union[str, Sequence[str], None] = "catchup_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    rows = bind.execute(sa.text(f"PRAGMA table_info({table})")).fetchall()
    return any(r[1] == column for r in rows)


def _index_exists(index_name: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(
        sa.text("SELECT name FROM sqlite_master WHERE type='index' AND name=:n"),
        {"n": index_name},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    """Add last_error_category column + lookup index — idempotent."""
    if not _column_exists("publish_records", "last_error_category"):
        op.add_column(
            "publish_records",
            sa.Column("last_error_category", sa.String(length=50), nullable=True),
        )
    if not _index_exists("ix_publish_records_last_error_category"):
        op.create_index(
            "ix_publish_records_last_error_category",
            "publish_records",
            ["last_error_category"],
        )


def downgrade() -> None:
    """Drop index + column."""
    if _index_exists("ix_publish_records_last_error_category"):
        op.drop_index("ix_publish_records_last_error_category", table_name="publish_records")
    # SQLite supports DROP COLUMN since 3.35.0 (2021); guard anyway.
    if _column_exists("publish_records", "last_error_category"):
        with op.batch_alter_table("publish_records") as batch_op:
            batch_op.drop_column("last_error_category")
