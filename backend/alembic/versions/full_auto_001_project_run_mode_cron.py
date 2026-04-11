"""Full-Auto Mode v1: project-level automation config + job.run_mode

Revision ID: full_auto_001
Revises: yt_analytics_002
Create Date: 2026-04-12

Adds:
  jobs.run_mode, jobs.auto_advanced, jobs.scheduled_run_id
  content_projects.automation_* columns (enable / cron / defaults / guardrails
  / state tracking)

Notes:
  - Does NOT touch the existing automation_policies (channel-scope checkpoint
    system). This migration introduces a *project-scope* full-auto layer on
    top of it.
  - All new columns are nullable or have safe server defaults; existing rows
    are unaffected.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "full_auto_001"
down_revision: Union[str, Sequence[str], None] = "yt_analytics_002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- jobs: run_mode + auto_advanced + scheduled_run_id ------------------
    with op.batch_alter_table("jobs") as batch_op:
        batch_op.add_column(
            sa.Column("run_mode", sa.String(50), nullable=True)
        )
        batch_op.add_column(
            sa.Column(
                "auto_advanced",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            )
        )
        batch_op.add_column(
            sa.Column("scheduled_run_id", sa.String(36), nullable=True)
        )

    # --- content_projects: per-project automation config -------------------
    with op.batch_alter_table("content_projects") as batch_op:
        batch_op.add_column(
            sa.Column(
                "automation_enabled",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            )
        )
        batch_op.add_column(
            sa.Column(
                "automation_run_mode",
                sa.String(50),
                nullable=False,
                server_default="manual",
            )
        )
        batch_op.add_column(
            sa.Column(
                "automation_schedule_enabled",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            )
        )
        batch_op.add_column(
            sa.Column("automation_cron_expression", sa.String(100), nullable=True)
        )
        batch_op.add_column(
            sa.Column(
                "automation_timezone",
                sa.String(50),
                nullable=False,
                server_default="UTC",
            )
        )
        batch_op.add_column(
            sa.Column("automation_default_template_id", sa.String(36), nullable=True)
        )
        batch_op.add_column(
            sa.Column("automation_default_blueprint_id", sa.String(36), nullable=True)
        )
        batch_op.add_column(
            sa.Column(
                "automation_require_review_gate",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("1"),
            )
        )
        batch_op.add_column(
            sa.Column(
                "automation_publish_policy",
                sa.String(50),
                nullable=False,
                server_default="draft",
            )
        )
        batch_op.add_column(
            sa.Column(
                "automation_fallback_on_error",
                sa.String(50),
                nullable=False,
                server_default="pause",
            )
        )
        batch_op.add_column(
            sa.Column("automation_max_runs_per_day", sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column(
                "automation_last_run_at",
                sa.DateTime(timezone=True),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "automation_next_run_at",
                sa.DateTime(timezone=True),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "automation_runs_today",
                sa.Integer(),
                nullable=False,
                server_default="0",
            )
        )
        batch_op.add_column(
            sa.Column(
                "automation_runs_today_date",
                sa.String(10),
                nullable=True,
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("content_projects") as batch_op:
        batch_op.drop_column("automation_runs_today_date")
        batch_op.drop_column("automation_runs_today")
        batch_op.drop_column("automation_next_run_at")
        batch_op.drop_column("automation_last_run_at")
        batch_op.drop_column("automation_max_runs_per_day")
        batch_op.drop_column("automation_fallback_on_error")
        batch_op.drop_column("automation_publish_policy")
        batch_op.drop_column("automation_require_review_gate")
        batch_op.drop_column("automation_default_blueprint_id")
        batch_op.drop_column("automation_default_template_id")
        batch_op.drop_column("automation_timezone")
        batch_op.drop_column("automation_cron_expression")
        batch_op.drop_column("automation_schedule_enabled")
        batch_op.drop_column("automation_run_mode")
        batch_op.drop_column("automation_enabled")

    with op.batch_alter_table("jobs") as batch_op:
        batch_op.drop_column("scheduled_run_id")
        batch_op.drop_column("auto_advanced")
        batch_op.drop_column("run_mode")
