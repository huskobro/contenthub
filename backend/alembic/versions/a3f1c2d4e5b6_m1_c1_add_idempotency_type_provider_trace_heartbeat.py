"""m1_c1_add_idempotency_type_provider_trace_heartbeat

Revision ID: a3f1c2d4e5b6
Revises: 9d97ec750399
Create Date: 2026-04-04 00:00:00.000000

Adds three new columns as part of M1-C1 contracts extension:
  - job_steps.idempotency_type  : String(50), not null, default 're_executable'
  - job_steps.provider_trace_json : Text, nullable
  - jobs.heartbeat_at           : DateTime(timezone=True), nullable
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f1c2d4e5b6'
down_revision: Union[str, Sequence[str], None] = '9d97ec750399'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add idempotency_type and provider_trace_json to job_steps; heartbeat_at to jobs."""
    op.add_column(
        'job_steps',
        sa.Column('idempotency_type', sa.String(length=50), nullable=False, server_default='re_executable')
    )
    op.add_column(
        'job_steps',
        sa.Column('provider_trace_json', sa.Text(), nullable=True)
    )
    op.add_column(
        'jobs',
        sa.Column('heartbeat_at', sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    """Remove the three columns added in upgrade."""
    op.drop_column('jobs', 'heartbeat_at')
    op.drop_column('job_steps', 'provider_trace_json')
    op.drop_column('job_steps', 'idempotency_type')
