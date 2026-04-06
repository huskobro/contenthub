"""M30: add render_mode, subtitle_style, lower_third_style, trust_enforcement_level to news_bulletins

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-06
"""
from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("news_bulletins", sa.Column("render_mode", sa.String(30), nullable=True, server_default="combined"))
    op.add_column("news_bulletins", sa.Column("subtitle_style", sa.String(50), nullable=True))
    op.add_column("news_bulletins", sa.Column("lower_third_style", sa.String(50), nullable=True))
    op.add_column("news_bulletins", sa.Column("trust_enforcement_level", sa.String(20), nullable=True, server_default="warn"))


def downgrade() -> None:
    op.drop_column("news_bulletins", "trust_enforcement_level")
    op.drop_column("news_bulletins", "lower_third_style")
    op.drop_column("news_bulletins", "subtitle_style")
    op.drop_column("news_bulletins", "render_mode")
