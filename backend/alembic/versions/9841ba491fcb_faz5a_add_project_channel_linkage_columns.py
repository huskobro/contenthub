"""Faz 5a: add content_project_id and channel_profile_id to standard_videos and news_bulletins

Revision ID: 9841ba491fcb
Revises: 87a789ff3f45
Create Date: 2026-04-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9841ba491fcb'
down_revision: Union[str, Sequence[str], None] = '87a789ff3f45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table: str, column: str) -> bool:
    """Check if a column already exists in the table (SQLite safe)."""
    bind = op.get_bind()
    result = bind.execute(sa.text(f"PRAGMA table_info({table})"))
    columns = [row[1] for row in result]
    return column in columns


def _index_exists(index_name: str) -> bool:
    """Check if an index already exists (SQLite safe)."""
    bind = op.get_bind()
    result = bind.execute(sa.text("SELECT name FROM sqlite_master WHERE type='index'"))
    names = [row[0] for row in result]
    return index_name in names


def upgrade() -> None:
    # --- standard_videos: add content_project_id ---
    if not _column_exists("standard_videos", "content_project_id"):
        op.add_column("standard_videos", sa.Column("content_project_id", sa.String(36), nullable=True))
    if not _index_exists("ix_standard_videos_content_project_id"):
        op.create_index("ix_standard_videos_content_project_id", "standard_videos", ["content_project_id"])

    # --- news_bulletins: add content_project_id and channel_profile_id ---
    if not _column_exists("news_bulletins", "content_project_id"):
        op.add_column("news_bulletins", sa.Column("content_project_id", sa.String(36), nullable=True))
    if not _index_exists("ix_news_bulletins_content_project_id"):
        op.create_index("ix_news_bulletins_content_project_id", "news_bulletins", ["content_project_id"])

    if not _column_exists("news_bulletins", "channel_profile_id"):
        op.add_column("news_bulletins", sa.Column("channel_profile_id", sa.String(36), nullable=True))
    if not _index_exists("ix_news_bulletins_channel_profile_id"):
        op.create_index("ix_news_bulletins_channel_profile_id", "news_bulletins", ["channel_profile_id"])


def downgrade() -> None:
    # SQLite doesn't support DROP COLUMN in older versions.
    # For safety, downgrade is a no-op. Columns remain as nullable.
    pass
