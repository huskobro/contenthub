"""M41 add image_url to news_items

Revision ID: 6efaa317abdf
Revises: b3c4d5e6f7a8
Create Date: 2026-04-08 00:54:20.811184

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6efaa317abdf'
down_revision: Union[str, Sequence[str], None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """M41: news_items tablosuna image_url kolonu ekle."""
    op.add_column('news_items', sa.Column('image_url', sa.String(length=2000), nullable=True))


def downgrade() -> None:
    """M41: image_url kolonunu kaldir."""
    op.drop_column('news_items', 'image_url')
