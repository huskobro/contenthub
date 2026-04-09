"""m7_c1_add_publish_records_and_logs

Revision ID: c1a2b3d4e5f6
Revises: b1c2d3e4f5a6
Create Date: 2026-04-04 18:00:00.000000

Publish Center — M7-C1
  - publish_records: birincil publish kayıt objesi
  - publish_logs: append-only denetim izi

Zorunlu akış (Tier A review gate):
  draft → pending_review → approved → [scheduled →] publishing → published
  draft'tan doğrudan approved veya scheduled geçişi durum makinesinde YASAK.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Publish Center tablolarını oluştur."""
    op.create_table(
        'publish_records',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('job_id', sa.String(length=36), nullable=False),
        sa.Column('content_ref_type', sa.String(length=100), nullable=False),
        sa.Column('content_ref_id', sa.String(length=36), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('review_state', sa.String(length=50), nullable=False),
        sa.Column('reviewer_id', sa.String(length=36), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('platform_video_id', sa.String(length=500), nullable=True),
        sa.Column('platform_url', sa.String(length=1000), nullable=True),
        sa.Column('publish_attempt_count', sa.Integer(), nullable=False),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('payload_json', sa.Text(), nullable=True),
        sa.Column('result_json', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_publish_records_job_id', 'publish_records', ['job_id'])
    op.create_index('ix_publish_records_content_ref_type', 'publish_records', ['content_ref_type'])
    op.create_index('ix_publish_records_content_ref_id', 'publish_records', ['content_ref_id'])
    op.create_index('ix_publish_records_platform', 'publish_records', ['platform'])
    op.create_index('ix_publish_records_status', 'publish_records', ['status'])

    op.create_table(
        'publish_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('publish_record_id', sa.String(length=36), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('actor_type', sa.String(length=50), nullable=False),
        sa.Column('actor_id', sa.String(length=36), nullable=True),
        sa.Column('from_status', sa.String(length=50), nullable=True),
        sa.Column('to_status', sa.String(length=50), nullable=True),
        sa.Column('detail_json', sa.Text(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['publish_record_id'], ['publish_records.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_publish_logs_publish_record_id', 'publish_logs', ['publish_record_id'])
    op.create_index('ix_publish_logs_event_type', 'publish_logs', ['event_type'])


def downgrade() -> None:
    """Publish Center tablolarını kaldır."""
    op.drop_index('ix_publish_logs_event_type', table_name='publish_logs')
    op.drop_index('ix_publish_logs_publish_record_id', table_name='publish_logs')
    op.drop_table('publish_logs')

    op.drop_index('ix_publish_records_status', table_name='publish_records')
    op.drop_index('ix_publish_records_platform', table_name='publish_records')
    op.drop_index('ix_publish_records_content_ref_id', table_name='publish_records')
    op.drop_index('ix_publish_records_content_ref_type', table_name='publish_records')
    op.drop_index('ix_publish_records_job_id', table_name='publish_records')
    op.drop_table('publish_records')
