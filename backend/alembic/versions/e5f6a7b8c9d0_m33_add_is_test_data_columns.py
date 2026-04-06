"""M33: Add is_test_data column to 7 core tables for data classification.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-06
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None

# Tables that need the is_test_data column.
# Job already has it (added in M31).
TABLES = [
    "standard_videos",
    "templates",
    "style_blueprints",
    "news_sources",
    "news_items",
    "news_bulletins",
    "publish_records",
]


def upgrade() -> None:
    for table in TABLES:
        op.add_column(
            table,
            sa.Column(
                "is_test_data",
                sa.Boolean(),
                nullable=False,
                server_default="0",
            ),
        )
        op.create_index(f"ix_{table}_is_test_data", table, ["is_test_data"])

    # ---------- Data classification ----------
    # Mark known test-pattern data as is_test_data=1.
    # This is a one-time bulk classification based on name/title patterns
    # observed in the current database.

    conn = op.get_bind()

    # news_sources: all test-pattern names
    conn.execute(sa.text("""
        UPDATE news_sources SET is_test_data = 1
        WHERE name LIKE 'Test Source%'
           OR name LIKE 'RSS Source%'
           OR name LIKE 'Manual Source%'
           OR name LIKE 'API Source%'
           OR name LIKE 'Update Test%'
           OR name LIKE 'List Test%'
           OR name LIKE 'Filter Test%'
           OR name LIKE 'Detail Test%'
    """))

    # news_items: items from test sources + test-pattern titles
    conn.execute(sa.text("""
        UPDATE news_items SET is_test_data = 1
        WHERE source_id IN (SELECT id FROM news_sources WHERE is_test_data = 1)
           OR title LIKE 'Breaking News %'
           OR title LIKE 'Update %'
           OR title LIKE 'Test News%'
    """))

    # news_bulletins: bulletins with test-pattern topics
    conn.execute(sa.text("""
        UPDATE news_bulletins SET is_test_data = 1
        WHERE topic LIKE 'Bulletin %'
           OR topic LIKE 'Breaking News %'
           OR topic LIKE 'Test %'
    """))

    # standard_videos: test-pattern titles
    conn.execute(sa.text("""
        UPDATE standard_videos SET is_test_data = 1
        WHERE title LIKE 'Test Video%'
           OR title LIKE 'Orijinal Video%'
    """))

    # templates: test-pattern names
    conn.execute(sa.text("""
        UPDATE templates SET is_test_data = 1
        WHERE name LIKE 'Test Template%'
           OR name LIKE 'style-%'
    """))

    # style_blueprints: test-pattern names
    conn.execute(sa.text("""
        UPDATE style_blueprints SET is_test_data = 1
        WHERE name LIKE 'Test Blueprint%'
    """))

    # publish_records: records linked to test jobs
    conn.execute(sa.text("""
        UPDATE publish_records SET is_test_data = 1
        WHERE job_id IN (SELECT id FROM jobs WHERE is_test_data = 1)
    """))

    # jobs: mark ALL existing jobs as test data (entire DB is test/demo)
    conn.execute(sa.text("""
        UPDATE jobs SET is_test_data = 1
        WHERE is_test_data = 0
    """))


def downgrade() -> None:
    for table in TABLES:
        op.drop_index(f"ix_{table}_is_test_data", table_name=table)
        op.drop_column(table, "is_test_data")
