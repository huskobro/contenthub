"""M29: add composition_direction, thumbnail_direction, template_id, style_blueprint_id to news_bulletins

Revision ID: a1b2c3d4e5f6
Revises: 5c6754cd1d40
Create Date: 2026-04-06
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "5c6754cd1d40"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("news_bulletins", sa.Column("composition_direction", sa.String(50), nullable=True))
    op.add_column("news_bulletins", sa.Column("thumbnail_direction", sa.String(50), nullable=True))
    op.add_column("news_bulletins", sa.Column("template_id", sa.String(36), nullable=True))
    op.add_column("news_bulletins", sa.Column("style_blueprint_id", sa.String(36), nullable=True))


def downgrade() -> None:
    op.drop_column("news_bulletins", "style_blueprint_id")
    op.drop_column("news_bulletins", "template_id")
    op.drop_column("news_bulletins", "thumbnail_direction")
    op.drop_column("news_bulletins", "composition_direction")
