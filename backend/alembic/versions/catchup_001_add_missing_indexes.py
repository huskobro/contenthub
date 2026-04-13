"""catchup: add missing indexes for FK columns

Adds indexes that the SQLAlchemy models define but were missed during
the stamp-based migration catch-up.  All operations are idempotent
(guarded by _index_exists) so this migration is safe for both fresh-DB
and existing-DB scenarios.

Revision ID: catchup_001
Revises: full_auto_001
Create Date: 2026-04-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "catchup_001"
down_revision: Union[str, Sequence[str], None] = "full_auto_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _index_exists(index_name: str) -> bool:
    """Check if an index already exists (SQLite safe)."""
    bind = op.get_bind()
    result = bind.execute(
        sa.text("SELECT name FROM sqlite_master WHERE type='index' AND name=:n"),
        {"n": index_name},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    """Add missing FK indexes — idempotent."""

    # jobs
    if not _index_exists("ix_jobs_channel_profile_id"):
        op.create_index("ix_jobs_channel_profile_id", "jobs", ["channel_profile_id"])
    if not _index_exists("ix_jobs_content_project_id"):
        op.create_index("ix_jobs_content_project_id", "jobs", ["content_project_id"])
    if not _index_exists("ix_jobs_is_test_data"):
        op.create_index("ix_jobs_is_test_data", "jobs", ["is_test_data"])

    # news_bulletins
    if not _index_exists("ix_news_bulletins_channel_profile_id"):
        op.create_index("ix_news_bulletins_channel_profile_id", "news_bulletins", ["channel_profile_id"])
    if not _index_exists("ix_news_bulletins_content_project_id"):
        op.create_index("ix_news_bulletins_content_project_id", "news_bulletins", ["content_project_id"])

    # publish_records
    if not _index_exists("ix_publish_records_content_project_id"):
        op.create_index("ix_publish_records_content_project_id", "publish_records", ["content_project_id"])
    if not _index_exists("ix_publish_records_platform_connection_id"):
        op.create_index("ix_publish_records_platform_connection_id", "publish_records", ["platform_connection_id"])

    # standard_videos
    if not _index_exists("ix_standard_videos_channel_profile_id"):
        op.create_index("ix_standard_videos_channel_profile_id", "standard_videos", ["channel_profile_id"])
    if not _index_exists("ix_standard_videos_content_project_id"):
        op.create_index("ix_standard_videos_content_project_id", "standard_videos", ["content_project_id"])

    # video_stats_snapshots
    if not _index_exists("ix_video_stats_snapshots_platform_connection_id"):
        op.create_index("ix_video_stats_snapshots_platform_connection_id", "video_stats_snapshots", ["platform_connection_id"])


def downgrade() -> None:
    """Remove indexes added by this migration."""
    for idx in [
        "ix_video_stats_snapshots_platform_connection_id",
        "ix_standard_videos_content_project_id",
        "ix_standard_videos_channel_profile_id",
        "ix_publish_records_platform_connection_id",
        "ix_publish_records_content_project_id",
        "ix_news_bulletins_content_project_id",
        "ix_news_bulletins_channel_profile_id",
        "ix_jobs_is_test_data",
        "ix_jobs_content_project_id",
        "ix_jobs_channel_profile_id",
    ]:
        op.drop_index(idx)
