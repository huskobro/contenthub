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
from sqlalchemy import inspect

revision: str = "full_auto_001"
down_revision: Union[str, Sequence[str], None] = "yt_analytics_002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    """Partial-migration recovery guard.

    Some rows in production/dev DBs have been partially upgraded via prior
    runs that crashed mid-batch. Column-existence guards make the migration
    idempotent so a second run can complete what the first did not.
    """
    bind = op.get_bind()
    insp = inspect(bind)
    try:
        cols = [c["name"] for c in insp.get_columns(table_name)]
    except Exception:
        return False
    return column_name in cols


def upgrade() -> None:
    # --- jobs: run_mode + auto_advanced + scheduled_run_id ------------------
    missing_jobs_cols = [
        (name, ctor) for name, ctor in (
            ("run_mode", lambda: sa.Column("run_mode", sa.String(50), nullable=True)),
            ("auto_advanced", lambda: sa.Column(
                "auto_advanced",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            )),
            ("scheduled_run_id", lambda: sa.Column("scheduled_run_id", sa.String(36), nullable=True)),
        )
        if not _column_exists("jobs", name)
    ]
    if missing_jobs_cols:
        with op.batch_alter_table("jobs") as batch_op:
            for _, ctor in missing_jobs_cols:
                batch_op.add_column(ctor())

    # --- content_projects: per-project automation config -------------------
    cp_cols = [
        ("automation_enabled", lambda: sa.Column(
            "automation_enabled", sa.Boolean(), nullable=False,
            server_default=sa.text("0"),
        )),
        ("automation_run_mode", lambda: sa.Column(
            "automation_run_mode", sa.String(50), nullable=False,
            server_default="manual",
        )),
        ("automation_schedule_enabled", lambda: sa.Column(
            "automation_schedule_enabled", sa.Boolean(), nullable=False,
            server_default=sa.text("0"),
        )),
        ("automation_cron_expression", lambda: sa.Column(
            "automation_cron_expression", sa.String(100), nullable=True,
        )),
        ("automation_timezone", lambda: sa.Column(
            "automation_timezone", sa.String(50), nullable=False,
            server_default="UTC",
        )),
        ("automation_default_template_id", lambda: sa.Column(
            "automation_default_template_id", sa.String(36), nullable=True,
        )),
        ("automation_default_blueprint_id", lambda: sa.Column(
            "automation_default_blueprint_id", sa.String(36), nullable=True,
        )),
        ("automation_require_review_gate", lambda: sa.Column(
            "automation_require_review_gate", sa.Boolean(), nullable=False,
            server_default=sa.text("1"),
        )),
        ("automation_publish_policy", lambda: sa.Column(
            "automation_publish_policy", sa.String(50), nullable=False,
            server_default="draft",
        )),
        ("automation_fallback_on_error", lambda: sa.Column(
            "automation_fallback_on_error", sa.String(50), nullable=False,
            server_default="pause",
        )),
        ("automation_max_runs_per_day", lambda: sa.Column(
            "automation_max_runs_per_day", sa.Integer(), nullable=True,
        )),
        ("automation_last_run_at", lambda: sa.Column(
            "automation_last_run_at", sa.DateTime(timezone=True), nullable=True,
        )),
        ("automation_next_run_at", lambda: sa.Column(
            "automation_next_run_at", sa.DateTime(timezone=True), nullable=True,
        )),
        ("automation_runs_today", lambda: sa.Column(
            "automation_runs_today", sa.Integer(), nullable=False,
            server_default="0",
        )),
        ("automation_runs_today_date", lambda: sa.Column(
            "automation_runs_today_date", sa.String(10), nullable=True,
        )),
    ]
    missing_cp_cols = [
        (name, ctor) for name, ctor in cp_cols
        if not _column_exists("content_projects", name)
    ]
    if missing_cp_cols:
        with op.batch_alter_table("content_projects") as batch_op:
            for _, ctor in missing_cp_cols:
                batch_op.add_column(ctor())


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
