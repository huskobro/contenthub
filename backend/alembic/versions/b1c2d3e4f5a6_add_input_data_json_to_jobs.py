"""add_input_data_json_to_jobs

Revision ID: b1c2d3e4f5a6
Revises: a3f1c2d4e5b6
Create Date: 2026-04-04 00:01:00.000000

M2-C3: jobs tablosuna input_data_json (TEXT, nullable) sütunu ekler.
Bu alan, executor'ların job input parametrelerine (topic, language,
duration_seconds vb.) erişmesini sağlar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a3f1c2d4e5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """jobs tablosuna input_data_json sütunu ekle."""
    op.add_column(
        'jobs',
        sa.Column('input_data_json', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """input_data_json sütununu kaldır."""
    op.drop_column('jobs', 'input_data_json')
