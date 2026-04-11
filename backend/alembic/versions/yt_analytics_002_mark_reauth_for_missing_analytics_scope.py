"""Sprint 1 (Faz YT-A1): Mark existing YouTube connections as needing re-auth
for the new yt-analytics.readonly scope.

Revision ID: yt_analytics_002
Revises: yt_analytics_001
Create Date: 2026-04-11

Existing YouTube connections were granted only the 'youtube' scope. The new
Analytics API v2 integration requires 'yt-analytics.readonly' as well. This
migration:
  - Flips requires_reauth=1 on YouTube connections missing the new scope
  - Updates scope_status to 'insufficient' so the capability matrix reflects it
  - Does NOT touch connections that already include yt-analytics.readonly

Idempotent: safe to re-run; NOT LIKE filter prevents double-marking.
"""

from alembic import op
import sqlalchemy as sa

revision = "yt_analytics_002"
down_revision = "yt_analytics_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            UPDATE platform_connections
               SET requires_reauth = 1,
                   scope_status = 'insufficient'
             WHERE platform = 'youtube'
               AND (scopes_granted IS NULL
                    OR scopes_granted NOT LIKE '%yt-analytics.readonly%')
            """
        )
    )


def downgrade() -> None:
    # No-op: we don't un-flag re-auth because the old scope state is lost.
    pass
