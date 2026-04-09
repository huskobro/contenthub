"""Faz 13: Upgrade automation_policies to V2 checkpoint model + add operations_inbox_items

Revision ID: e6f7g8h9i0j1
Revises: d5g6h7i8j9k0
Create Date: 2026-04-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e6f7g8h9i0j1'
down_revision: Union[str, Sequence[str], None] = 'd5g6h7i8j9k0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Upgrade automation_policies to V2 schema ---
    # Add new columns
    with op.batch_alter_table("automation_policies") as batch_op:
        batch_op.add_column(sa.Column("owner_user_id", sa.String(36), nullable=True))
        batch_op.add_column(sa.Column("name", sa.String(255), nullable=False, server_default="Varsayilan Politika"))
        batch_op.add_column(sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("0")))
        batch_op.add_column(sa.Column("source_scan_mode", sa.String(50), nullable=False, server_default="disabled"))
        batch_op.add_column(sa.Column("draft_generation_mode", sa.String(50), nullable=False, server_default="manual_review"))
        batch_op.add_column(sa.Column("render_mode", sa.String(50), nullable=False, server_default="disabled"))
        batch_op.add_column(sa.Column("publish_mode", sa.String(50), nullable=False, server_default="manual_review"))
        batch_op.add_column(sa.Column("post_publish_mode", sa.String(50), nullable=False, server_default="disabled"))
        batch_op.add_column(sa.Column("publish_windows_json", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("platform_rules_json", sa.Text(), nullable=True))

    # Migrate data from old columns to new
    op.execute("""
        UPDATE automation_policies SET
            source_scan_mode = CASE
                WHEN cp_source_scan = 'auto' THEN 'automatic'
                WHEN cp_source_scan = 'review_required' THEN 'manual_review'
                ELSE 'disabled'
            END,
            draft_generation_mode = CASE
                WHEN cp_draft_generation = 'auto' THEN 'automatic'
                WHEN cp_draft_generation = 'review_required' THEN 'manual_review'
                ELSE 'disabled'
            END,
            render_mode = CASE
                WHEN cp_render = 'auto' THEN 'automatic'
                WHEN cp_render = 'review_required' THEN 'manual_review'
                ELSE 'disabled'
            END,
            publish_mode = CASE
                WHEN cp_publish = 'auto' THEN 'automatic'
                WHEN cp_publish = 'review_required' THEN 'manual_review'
                ELSE 'disabled'
            END,
            post_publish_mode = CASE
                WHEN cp_post_publish = 'auto' THEN 'automatic'
                WHEN cp_post_publish = 'review_required' THEN 'manual_review'
                ELSE 'disabled'
            END,
            is_enabled = CASE WHEN status = 'active' THEN 1 ELSE 0 END,
            publish_windows_json = publish_windows,
            platform_rules_json = platform_specific_rules
    """)

    # Drop old columns
    with op.batch_alter_table("automation_policies") as batch_op:
        batch_op.drop_column("automation_level")
        batch_op.drop_column("cp_source_scan")
        batch_op.drop_column("cp_draft_generation")
        batch_op.drop_column("cp_render")
        batch_op.drop_column("cp_publish")
        batch_op.drop_column("cp_post_publish")
        batch_op.drop_column("publish_windows")
        batch_op.drop_column("platform_specific_rules")
        batch_op.drop_column("status")

    # --- Create operations_inbox_items table ---
    op.create_table(
        "operations_inbox_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("item_type", sa.String(100), nullable=False, index=True),
        sa.Column("channel_profile_id", sa.String(36), sa.ForeignKey("channel_profiles.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("owner_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("related_project_id", sa.String(36), nullable=True),
        sa.Column("related_entity_type", sa.String(100), nullable=True),
        sa.Column("related_entity_id", sa.String(36), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="open", index=True),
        sa.Column("priority", sa.String(50), nullable=False, server_default="normal"),
        sa.Column("action_url", sa.String(500), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("operations_inbox_items")

    with op.batch_alter_table("automation_policies") as batch_op:
        batch_op.add_column(sa.Column("automation_level", sa.String(50), nullable=False, server_default="manual"))
        batch_op.add_column(sa.Column("cp_source_scan", sa.String(50), nullable=False, server_default="disabled"))
        batch_op.add_column(sa.Column("cp_draft_generation", sa.String(50), nullable=False, server_default="review_required"))
        batch_op.add_column(sa.Column("cp_render", sa.String(50), nullable=False, server_default="disabled"))
        batch_op.add_column(sa.Column("cp_publish", sa.String(50), nullable=False, server_default="review_required"))
        batch_op.add_column(sa.Column("cp_post_publish", sa.String(50), nullable=False, server_default="disabled"))
        batch_op.add_column(sa.Column("publish_windows", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("platform_specific_rules", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("status", sa.String(50), nullable=False, server_default="paused"))
        batch_op.drop_column("owner_user_id")
        batch_op.drop_column("name")
        batch_op.drop_column("is_enabled")
        batch_op.drop_column("source_scan_mode")
        batch_op.drop_column("draft_generation_mode")
        batch_op.drop_column("render_mode")
        batch_op.drop_column("publish_mode")
        batch_op.drop_column("post_publish_mode")
        batch_op.drop_column("publish_windows_json")
        batch_op.drop_column("platform_rules_json")
