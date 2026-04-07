"""m41a_add_render_format_karaoke_to_bulletins

Revision ID: 221401c433cc
Revises: a1a352449e66
Create Date: 2026-04-08 01:34:54.192549

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '221401c433cc'
down_revision: Union[str, Sequence[str], None] = 'a1a352449e66'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """M41a: news_bulletins tablosuna render_format ve karaoke_enabled ekle."""
    op.add_column('news_bulletins', sa.Column('render_format', sa.String(20), nullable=True))
    op.add_column('news_bulletins', sa.Column('karaoke_enabled', sa.Boolean(), nullable=True))


def downgrade() -> None:
    """M41a: render_format ve karaoke_enabled kolonlarını kaldır."""
    op.drop_column('news_bulletins', 'karaoke_enabled')
    op.drop_column('news_bulletins', 'render_format')
