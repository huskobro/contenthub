"""Faz 7: add synced_comments table for YouTube comment management

Revision ID: b3e4f5a6c7d8
Revises: 9841ba491fcb
Create Date: 2026-04-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3e4f5a6c7d8'
down_revision: Union[str, Sequence[str], None] = '9841ba491fcb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table: str) -> bool:
    """Check if a table already exists (SQLite safe)."""
    bind = op.get_bind()
    result = bind.execute(
        sa.text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
        {"name": table},
    )
    return result.fetchone() is not None


def _index_exists(index_name: str) -> bool:
    """Check if an index already exists (SQLite safe)."""
    bind = op.get_bind()
    result = bind.execute(sa.text("SELECT name FROM sqlite_master WHERE type='index'"))
    names = [row[0] for row in result]
    return index_name in names


def upgrade() -> None:
    if _table_exists("synced_comments"):
        return

    op.create_table(
        "synced_comments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("platform", sa.String(50), nullable=False, server_default="youtube"),
        sa.Column("platform_connection_id", sa.String(36), nullable=True),
        sa.Column("channel_profile_id", sa.String(36), nullable=True),
        sa.Column("content_project_id", sa.String(36), nullable=True),
        # YouTube IDs
        sa.Column("external_comment_id", sa.String(500), nullable=False),
        sa.Column("external_video_id", sa.String(500), nullable=False),
        sa.Column("external_parent_id", sa.String(500), nullable=True),
        # Comment data
        sa.Column("author_name", sa.String(500), nullable=True),
        sa.Column("author_channel_id", sa.String(500), nullable=True),
        sa.Column("author_avatar_url", sa.String(1000), nullable=True),
        sa.Column("text", sa.Text(), nullable=False, server_default=""),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("like_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reply_count", sa.Integer(), nullable=False, server_default="0"),
        # Status
        sa.Column("is_reply", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("reply_status", sa.String(50), nullable=False, server_default="none"),
        sa.Column("our_reply_text", sa.Text(), nullable=True),
        sa.Column("our_reply_at", sa.DateTime(timezone=True), nullable=True),
        # Sync
        sa.Column("sync_status", sa.String(50), nullable=False, server_default="synced"),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        # Foreign keys
        sa.ForeignKeyConstraint(["platform_connection_id"], ["platform_connections.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["channel_profile_id"], ["channel_profiles.id"], ondelete="SET NULL"),
    )

    # Indexes
    if not _index_exists("ix_synced_comments_platform"):
        op.create_index("ix_synced_comments_platform", "synced_comments", ["platform"])
    if not _index_exists("ix_synced_comments_platform_connection_id"):
        op.create_index("ix_synced_comments_platform_connection_id", "synced_comments", ["platform_connection_id"])
    if not _index_exists("ix_synced_comments_channel_profile_id"):
        op.create_index("ix_synced_comments_channel_profile_id", "synced_comments", ["channel_profile_id"])
    if not _index_exists("ix_synced_comments_content_project_id"):
        op.create_index("ix_synced_comments_content_project_id", "synced_comments", ["content_project_id"])
    if not _index_exists("ix_synced_comments_external_comment_id"):
        op.create_index("ix_synced_comments_external_comment_id", "synced_comments", ["external_comment_id"], unique=True)
    if not _index_exists("ix_synced_comments_external_video_id"):
        op.create_index("ix_synced_comments_external_video_id", "synced_comments", ["external_video_id"])
    if not _index_exists("ix_synced_comments_external_parent_id"):
        op.create_index("ix_synced_comments_external_parent_id", "synced_comments", ["external_parent_id"])


def downgrade() -> None:
    op.drop_table("synced_comments")
