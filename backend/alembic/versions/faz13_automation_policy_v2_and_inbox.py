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


def _has_column(table: str, column: str) -> bool:
    """Return True if column already exists in table (SQLite PRAGMA check)."""
    bind = op.get_bind()
    result = bind.execute(sa.text(f"PRAGMA table_info({table})"))
    return any(row[1] == column for row in result)


def _table_exists(table: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(
        sa.text("SELECT name FROM sqlite_master WHERE type='table' AND name=:t"),
        {"t": table},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    # --- Upgrade automation_policies to V2 schema ---
    # Guard: DB may already have new schema (phase_ac reconcile or prior partial run).
    # Only add columns that are missing; only drop columns that still exist.
    new_cols_needed = [
        c for c in ("owner_user_id", "name", "is_enabled", "source_scan_mode",
                    "draft_generation_mode", "render_mode", "publish_mode",
                    "post_publish_mode", "publish_windows_json", "platform_rules_json")
        if not _has_column("automation_policies", c)
    ]
    old_cols_present = [
        c for c in ("automation_level", "cp_source_scan", "cp_draft_generation",
                    "cp_render", "cp_publish", "cp_post_publish",
                    "publish_windows", "platform_specific_rules", "status")
        if _has_column("automation_policies", c)
    ]

    if new_cols_needed or old_cols_present:
        # ORDER MATTERS:
        #   1. ADD new columns first (so the UPDATE below has somewhere to write)
        #   2. UPDATE old → new (only if old columns are still present)
        #   3. DROP old columns
        #
        # Faz 3 fix: previously the UPDATE ran before add_column, which crashed
        # on a fresh DB with `no such column: source_scan_mode`. The fresh DB
        # path goes through this migration with old cols present (created by
        # 87a789ff3f45) but new cols absent — so the UPDATE must come AFTER
        # the add_column step.

        # ---- Step 1: ADD new columns ----
        _COL_DEFS = {
            "owner_user_id": sa.Column("owner_user_id", sa.String(36), nullable=True),
            "name": sa.Column("name", sa.String(255), nullable=False, server_default="Varsayilan Politika"),
            "is_enabled": sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            "source_scan_mode": sa.Column("source_scan_mode", sa.String(50), nullable=False, server_default="disabled"),
            "draft_generation_mode": sa.Column("draft_generation_mode", sa.String(50), nullable=False, server_default="manual_review"),
            "render_mode": sa.Column("render_mode", sa.String(50), nullable=False, server_default="disabled"),
            "publish_mode": sa.Column("publish_mode", sa.String(50), nullable=False, server_default="manual_review"),
            "post_publish_mode": sa.Column("post_publish_mode", sa.String(50), nullable=False, server_default="disabled"),
            "publish_windows_json": sa.Column("publish_windows_json", sa.Text(), nullable=True),
            "platform_rules_json": sa.Column("platform_rules_json", sa.Text(), nullable=True),
        }
        if new_cols_needed:
            with op.batch_alter_table("automation_policies") as batch_op:
                for col_name in new_cols_needed:
                    batch_op.add_column(_COL_DEFS[col_name])

        # ---- Step 2: UPDATE old → new (only when old cols are still around) ----
        # Data migration only makes sense when old columns are still present.
        if old_cols_present and _has_column("automation_policies", "cp_source_scan"):
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

        # ---- Step 3: DROP old columns ----
        if old_cols_present:
            with op.batch_alter_table("automation_policies") as batch_op:
                for col_name in old_cols_present:
                    batch_op.drop_column(col_name)

    # --- Create operations_inbox_items table (idempotent) ---
    if not _table_exists("operations_inbox_items"):
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
