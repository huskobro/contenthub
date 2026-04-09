"""Faz 8: add synced_playlists and synced_playlist_items tables

Revision ID: c4f5g6h7i8j9
Revises: b3e4f5a6c7d8
Create Date: 2026-04-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4f5g6h7i8j9'
down_revision: Union[str, Sequence[str], None] = 'b3e4f5a6c7d8'
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
    # --- synced_playlists ---
    if not _table_exists("synced_playlists"):
        op.create_table(
            "synced_playlists",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("platform", sa.String(50), nullable=False, server_default="youtube"),
            sa.Column("platform_connection_id", sa.String(36), nullable=True),
            sa.Column("channel_profile_id", sa.String(36), nullable=True),
            sa.Column("external_playlist_id", sa.String(500), nullable=False),
            sa.Column("title", sa.String(500), nullable=False, server_default=""),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("privacy_status", sa.String(50), nullable=False, server_default="private"),
            sa.Column("item_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("thumbnail_url", sa.String(1000), nullable=True),
            sa.Column("sync_status", sa.String(50), nullable=False, server_default="synced"),
            sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["platform_connection_id"], ["platform_connections.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["channel_profile_id"], ["channel_profiles.id"], ondelete="SET NULL"),
        )
        for idx_name, cols, unique in [
            ("ix_synced_playlists_platform", ["platform"], False),
            ("ix_synced_playlists_platform_connection_id", ["platform_connection_id"], False),
            ("ix_synced_playlists_channel_profile_id", ["channel_profile_id"], False),
            ("ix_synced_playlists_external_playlist_id", ["external_playlist_id"], True),
        ]:
            if not _index_exists(idx_name):
                op.create_index(idx_name, "synced_playlists", cols, unique=unique)

    # --- synced_playlist_items ---
    if not _table_exists("synced_playlist_items"):
        op.create_table(
            "synced_playlist_items",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("playlist_id", sa.String(36), nullable=False),
            sa.Column("external_video_id", sa.String(500), nullable=False),
            sa.Column("external_playlist_item_id", sa.String(500), nullable=True),
            sa.Column("content_project_id", sa.String(36), nullable=True),
            sa.Column("publish_record_id", sa.String(36), nullable=True),
            sa.Column("title", sa.String(500), nullable=True),
            sa.Column("thumbnail_url", sa.String(1000), nullable=True),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("synced_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["playlist_id"], ["synced_playlists.id"], ondelete="CASCADE"),
        )
        for idx_name, cols, unique in [
            ("ix_synced_playlist_items_playlist_id", ["playlist_id"], False),
            ("ix_synced_playlist_items_external_video_id", ["external_video_id"], False),
            ("ix_synced_playlist_items_content_project_id", ["content_project_id"], False),
            ("ix_synced_playlist_items_publish_record_id", ["publish_record_id"], False),
            ("ix_synced_playlist_items_external_playlist_item_id", ["external_playlist_item_id"], True),
        ]:
            if not _index_exists(idx_name):
                op.create_index(idx_name, "synced_playlist_items", cols, unique=unique)


def downgrade() -> None:
    op.drop_table("synced_playlist_items")
    op.drop_table("synced_playlists")
