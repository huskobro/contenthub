"""Add step_scope column to prompt_blocks table.

Revision ID: a2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-04-07
"""

from alembic import op
import sqlalchemy as sa

revision = "a2b3c4d5e6f7"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "prompt_blocks",
        sa.Column("step_scope", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("prompt_blocks", "step_scope")
