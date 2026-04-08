"""m42_add_karaoke_anim_preset_to_bulletins

Revision ID: dddfc15f2434
Revises: 221401c433cc
Create Date: 2026-04-08 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dddfc15f2434'
down_revision: Union[str, Sequence[str], None] = '221401c433cc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """M42: news_bulletins tablosuna karaoke_anim_preset ekle."""
    op.add_column('news_bulletins', sa.Column('karaoke_anim_preset', sa.String(30), nullable=True))


def downgrade() -> None:
    """M42: karaoke_anim_preset kolonunu kaldır."""
    op.drop_column('news_bulletins', 'karaoke_anim_preset')
