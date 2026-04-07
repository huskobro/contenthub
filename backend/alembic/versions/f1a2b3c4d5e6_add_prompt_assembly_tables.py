"""Add prompt assembly tables: prompt_blocks, prompt_assembly_runs, prompt_assembly_block_traces.

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-04-07
"""

from alembic import op
import sqlalchemy as sa

revision = "f1a2b3c4d5e6"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── prompt_blocks ──
    op.create_table(
        "prompt_blocks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("key", sa.String(255), unique=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("module_scope", sa.String(100), nullable=True),
        sa.Column("provider_scope", sa.String(100), nullable=True),
        sa.Column("group_name", sa.String(100), nullable=False, server_default="core"),
        sa.Column("kind", sa.String(50), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("enabled_by_default", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("condition_type", sa.String(50), nullable=False, server_default="always"),
        sa.Column("condition_config_json", sa.Text(), nullable=True),
        sa.Column("content_template", sa.Text(), nullable=False),
        sa.Column("admin_override_template", sa.Text(), nullable=True),
        sa.Column("help_text", sa.Text(), nullable=True),
        sa.Column("visible_in_admin", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("source_kind", sa.String(50), nullable=False, server_default="builtin_default"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_prompt_blocks_key", "prompt_blocks", ["key"])
    op.create_index("ix_prompt_blocks_module_scope", "prompt_blocks", ["module_scope"])
    op.create_index("ix_prompt_blocks_status", "prompt_blocks", ["status"])

    # ── prompt_assembly_runs ──
    op.create_table(
        "prompt_assembly_runs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("job_id", sa.String(36), sa.ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("step_key", sa.String(100), nullable=True),
        sa.Column("module_scope", sa.String(100), nullable=False),
        sa.Column("provider_name", sa.String(100), nullable=False),
        sa.Column("provider_type", sa.String(50), nullable=False, server_default="llm"),
        sa.Column("final_prompt_text", sa.Text(), nullable=False),
        sa.Column("final_payload_json", sa.Text(), nullable=False),
        sa.Column("provider_response_json", sa.Text(), nullable=True),
        sa.Column("provider_error_json", sa.Text(), nullable=True),
        sa.Column("settings_snapshot_json", sa.Text(), nullable=False),
        sa.Column("prompt_snapshot_json", sa.Text(), nullable=False),
        sa.Column("data_snapshot_json", sa.Text(), nullable=False),
        sa.Column("included_block_keys_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("skipped_block_keys_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("block_count_included", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("block_count_skipped", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_dry_run", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("data_source", sa.String(50), nullable=False, server_default="job_context"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_prompt_assembly_runs_job_id", "prompt_assembly_runs", ["job_id"])

    # ── prompt_assembly_block_traces ──
    op.create_table(
        "prompt_assembly_block_traces",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "assembly_run_id",
            sa.String(36),
            sa.ForeignKey("prompt_assembly_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("block_key", sa.String(255), nullable=False),
        sa.Column("block_title", sa.String(255), nullable=False),
        sa.Column("block_kind", sa.String(50), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("included", sa.Boolean(), nullable=False),
        sa.Column("reason_code", sa.String(100), nullable=False),
        sa.Column("reason_text", sa.Text(), nullable=False),
        sa.Column("evaluated_condition_type", sa.String(50), nullable=False),
        sa.Column("evaluated_condition_key", sa.String(255), nullable=True),
        sa.Column("evaluated_condition_value", sa.Text(), nullable=True),
        sa.Column("rendered_text", sa.Text(), nullable=True),
        sa.Column("used_variables_json", sa.Text(), nullable=True),
        sa.Column("missing_variables_json", sa.Text(), nullable=True),
        sa.Column("data_dependencies_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_prompt_assembly_block_traces_run_id",
        "prompt_assembly_block_traces",
        ["assembly_run_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_prompt_assembly_block_traces_run_id", table_name="prompt_assembly_block_traces")
    op.drop_table("prompt_assembly_block_traces")
    op.drop_index("ix_prompt_assembly_runs_job_id", table_name="prompt_assembly_runs")
    op.drop_table("prompt_assembly_runs")
    op.drop_index("ix_prompt_blocks_status", table_name="prompt_blocks")
    op.drop_index("ix_prompt_blocks_module_scope", table_name="prompt_blocks")
    op.drop_index("ix_prompt_blocks_key", table_name="prompt_blocks")
    op.drop_table("prompt_blocks")
