"""Faz 9: add platform_posts table for community post management

Revision ID: d5g6h7i8j9k0
Revises: c4f5g6h7i8j9
Create Date: 2026-04-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd5g6h7i8j9k0'
down_revision: Union[str, Sequence[str], None] = 'c4f5g6h7i8j9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(
        sa.text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
        {"name": table},
    )
    return result.fetchone() is not None


def _index_exists(index_name: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(sa.text("SELECT name FROM sqlite_master WHERE type='index'"))
    names = [row[0] for row in result]
    return index_name in names


def upgrade() -> None:
    if _table_exists("platform_posts"):
        return

    op.create_table(
        "platform_posts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("platform", sa.String(50), nullable=False, server_default="youtube"),
        sa.Column("platform_connection_id", sa.String(36), nullable=True),
        sa.Column("channel_profile_id", sa.String(36), nullable=True),
        sa.Column("content_project_id", sa.String(36), nullable=True),
        sa.Column("publish_record_id", sa.String(36), nullable=True),
        sa.Column("external_post_id", sa.String(500), nullable=True),
        sa.Column("post_type", sa.String(100), nullable=False, server_default="community_post"),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=True),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivery_status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("delivery_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["platform_connection_id"], ["platform_connections.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["channel_profile_id"], ["channel_profiles.id"], ondelete="SET NULL"),
    )

    for idx_name, cols, unique in [
        ("ix_platform_posts_platform", ["platform"], False),
        ("ix_platform_posts_platform_connection_id", ["platform_connection_id"], False),
        ("ix_platform_posts_channel_profile_id", ["channel_profile_id"], False),
        ("ix_platform_posts_content_project_id", ["content_project_id"], False),
        ("ix_platform_posts_publish_record_id", ["publish_record_id"], False),
        ("ix_platform_posts_external_post_id", ["external_post_id"], True),
        ("ix_platform_posts_post_type", ["post_type"], False),
        ("ix_platform_posts_status", ["status"], False),
    ]:
        if not _index_exists(idx_name):
            op.create_index(idx_name, "platform_posts", cols, unique=unique)


def downgrade() -> None:
    op.drop_table("platform_posts")
