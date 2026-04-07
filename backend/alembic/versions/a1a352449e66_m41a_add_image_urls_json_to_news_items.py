"""m41a_add_image_urls_json_to_news_items

Revision ID: a1a352449e66
Revises: 6efaa317abdf
Create Date: 2026-04-08 01:27:14.821387

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1a352449e66'
down_revision: Union[str, Sequence[str], None] = '6efaa317abdf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """M41a: news_items tablosuna image_urls_json (Text, nullable) kolonu ekle."""
    op.add_column('news_items', sa.Column('image_urls_json', sa.Text(), nullable=True))


def downgrade() -> None:
    """M41a: image_urls_json kolonunu kaldır."""
    op.drop_column('news_items', 'image_urls_json')
