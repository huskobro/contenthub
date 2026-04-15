"""gate_sources_001: Gate Sources Closure schema cleanup

Normalizes legacy shell values and adds data-integrity constraints:

  1. news_items.status: ``reviewed`` → ``new`` (orphan status removed from product).
  2. news_sources.scan_mode: ``curated`` → ``manual`` (curated was never wired).
  3. news_sources.source_type: ``manual_url`` / ``api`` → ``rss``
     (both shells had no working scan path).
  4. Adds unique index on news_sources.feed_url for non-null values —
     prevents duplicate feed registration. SQLite partial index.
  5. Adds composite index news_items.(created_at, status) to back the new
     retention + rolling soft-dedupe window queries cheaply.

Idempotent: each step is guarded by a presence / value check so re-running
the migration is safe for both fresh-DB and existing-DB scenarios.

Revision ID: gate_sources_001
Revises: gate4_001
Create Date: 2026-04-15
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "gate_sources_001"
down_revision: Union[str, Sequence[str], None] = "gate4_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _index_exists(index_name: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(
        sa.text("SELECT name FROM sqlite_master WHERE type='index' AND name=:n"),
        {"n": index_name},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    bind = op.get_bind()

    # 1. news_items.status normalization
    bind.execute(
        sa.text("UPDATE news_items SET status='new' WHERE status='reviewed'")
    )

    # 2. scan_mode normalization
    bind.execute(
        sa.text("UPDATE news_sources SET scan_mode='manual' WHERE scan_mode='curated'")
    )

    # 3. source_type normalization (legacy shells → rss)
    bind.execute(
        sa.text(
            "UPDATE news_sources SET source_type='rss' "
            "WHERE source_type IN ('manual_url','api')"
        )
    )

    # 4. Unique index on non-null feed_url — partial to allow multiple NULLs.
    if not _index_exists("ux_news_sources_feed_url"):
        op.execute(
            "CREATE UNIQUE INDEX ux_news_sources_feed_url "
            "ON news_sources(feed_url) WHERE feed_url IS NOT NULL"
        )

    # 5. Composite index for retention + rolling soft-dedupe window queries
    if not _index_exists("ix_news_items_created_at_status"):
        op.create_index(
            "ix_news_items_created_at_status",
            "news_items",
            ["created_at", "status"],
        )

    # 6. Index on source_scans.created_at for retention sweep
    if not _index_exists("ix_source_scans_created_at"):
        op.create_index(
            "ix_source_scans_created_at",
            "source_scans",
            ["created_at"],
        )


def downgrade() -> None:
    """Drop the indexes. Data normalizations are NOT reverted — 'reviewed',
    'curated', 'manual_url', and 'api' are shell values that no longer have
    any wiring. Restoring them would resurrect dead branches."""
    if _index_exists("ix_source_scans_created_at"):
        op.drop_index("ix_source_scans_created_at", table_name="source_scans")
    if _index_exists("ix_news_items_created_at_status"):
        op.drop_index("ix_news_items_created_at_status", table_name="news_items")
    if _index_exists("ux_news_sources_feed_url"):
        op.execute("DROP INDEX ux_news_sources_feed_url")
