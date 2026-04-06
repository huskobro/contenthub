"""M32: Add wizard_configs table for admin-managed wizard governance.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-06
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "wizard_configs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("wizard_type", sa.String(100), nullable=False, unique=True),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("steps_config_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("field_defaults_json", sa.Text(), nullable=True),
        sa.Column("module_scope", sa.String(100), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_wizard_configs_wizard_type", "wizard_configs", ["wizard_type"])


def downgrade() -> None:
    op.drop_index("ix_wizard_configs_wizard_type", table_name="wizard_configs")
    op.drop_table("wizard_configs")
