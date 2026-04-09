"""Faz 16: notification_items table

Revision ID: faz16_notif_001
Revises: e6f7g8h9i0j1
Create Date: 2026-04-09
"""
from alembic import op
import sqlalchemy as sa

revision = "faz16_notif_001"
down_revision = "e6f7g8h9i0j1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("scope_type", sa.String(50), nullable=False, server_default="user", index=True),
        sa.Column("notification_type", sa.String(100), nullable=False, index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("body", sa.Text, nullable=True),
        sa.Column("severity", sa.String(50), nullable=False, server_default="info"),
        sa.Column("status", sa.String(50), nullable=False, server_default="unread", index=True),
        sa.Column("related_entity_type", sa.String(100), nullable=True),
        sa.Column("related_entity_id", sa.String(36), nullable=True),
        sa.Column("related_inbox_item_id", sa.String(36), sa.ForeignKey("operations_inbox_items.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("related_channel_profile_id", sa.String(36), sa.ForeignKey("channel_profiles.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("action_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("notification_items")
