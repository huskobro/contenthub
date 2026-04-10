"""standard_video production pipeline fields parity with news_bulletin

Adds columns to standard_videos so the Standard Video wizard and production
pipeline can persist and pass full configuration to executors — matching the
schema completeness already enjoyed by news_bulletins.

New columns:
  - channel_profile_id      (link to ChannelProfile — same shape as bulletins)
  - composition_direction   (layout direction hint)
  - thumbnail_direction     (thumbnail style hint)
  - lower_third_style       (lower-third preset id)
  - motion_level            ('minimal' | 'moderate' | 'dynamic')
  - render_format           ('landscape' | 'portrait')
  - karaoke_enabled         (bool, optional — nullable)
  - template_id             (link to templates.id)
  - style_blueprint_id      (link to style_blueprints.id)

Revision ID: sv_prod_001
Revises: faz16_notif_001
Create Date: 2026-04-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'sv_prod_001'
down_revision: Union[str, Sequence[str], None] = 'faz16_notif_001'
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
    # --- standard_videos: add production/wizard fields ---
    if not _column_exists("standard_videos", "channel_profile_id"):
        op.add_column("standard_videos", sa.Column("channel_profile_id", sa.String(36), nullable=True))
    if not _index_exists("ix_standard_videos_channel_profile_id"):
        op.create_index("ix_standard_videos_channel_profile_id", "standard_videos", ["channel_profile_id"])

    if not _column_exists("standard_videos", "composition_direction"):
        op.add_column("standard_videos", sa.Column("composition_direction", sa.String(50), nullable=True))

    if not _column_exists("standard_videos", "thumbnail_direction"):
        op.add_column("standard_videos", sa.Column("thumbnail_direction", sa.String(50), nullable=True))

    if not _column_exists("standard_videos", "lower_third_style"):
        op.add_column("standard_videos", sa.Column("lower_third_style", sa.String(50), nullable=True))

    if not _column_exists("standard_videos", "motion_level"):
        op.add_column("standard_videos", sa.Column("motion_level", sa.String(30), nullable=True))

    if not _column_exists("standard_videos", "render_format"):
        op.add_column("standard_videos", sa.Column("render_format", sa.String(20), nullable=True))

    if not _column_exists("standard_videos", "karaoke_enabled"):
        op.add_column("standard_videos", sa.Column("karaoke_enabled", sa.Boolean(), nullable=True))

    if not _column_exists("standard_videos", "template_id"):
        op.add_column("standard_videos", sa.Column("template_id", sa.String(36), nullable=True))

    if not _column_exists("standard_videos", "style_blueprint_id"):
        op.add_column("standard_videos", sa.Column("style_blueprint_id", sa.String(36), nullable=True))


def downgrade() -> None:
    # SQLite prior to 3.35 doesn't support DROP COLUMN; keep downgrade as no-op
    # for safety. Columns remain as nullable.
    pass
