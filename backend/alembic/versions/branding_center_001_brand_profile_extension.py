"""Branding Center: BrandProfile extension (channel link + identity/messaging/platform output)

Adds the columns that Branding Center needs on top of the existing BrandProfile row:

  - channel_profile_id   : optional FK -> channel_profiles(id) ON DELETE SET NULL
  - brand_summary        : Text (single-line identity summary)
  - audience_profile_json: Text (JSON; persona, demographics, interests)
  - messaging_pillars_json: Text (JSON list of 3-5 pillars)
  - tone_of_voice        : String(255)
  - positioning_statement: Text
  - channel_description  : Text (platform channel description output)
  - channel_keywords_json: Text (JSON list of keywords)
  - banner_prompt        : Text
  - logo_prompt          : Text
  - apply_status_json    : Text (JSON: per-surface apply status)

Notes:
  * All columns are nullable so that existing BrandProfile rows remain valid.
  * SQLite batch_alter_table is used for FK addition and constraint naming.
  * `_has_column` / `_index_exists` guards make the migration idempotent across
    restarts and re-runs on developer machines.

Revision ID: branding_center_001
Revises: phase_al_001
Create Date: 2026-04-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "branding_center_001"
down_revision: Union[str, Sequence[str], None] = "phase_al_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


FK_NAME = "fk_brand_profiles_channel_profile_id"
IX_NAME = "ix_brand_profiles_channel_profile_id"


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(sa.text(f"PRAGMA table_info({table})"))
    return any(row[1] == column for row in result)


def _index_exists(index_name: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(
        sa.text("SELECT name FROM sqlite_master WHERE type='index' AND name=:n"),
        {"n": index_name},
    )
    return result.fetchone() is not None


# Column definitions kept in one place so upgrade/downgrade stay in sync.
_TEXT_COLUMNS = (
    "brand_summary",
    "audience_profile_json",
    "messaging_pillars_json",
    "positioning_statement",
    "channel_description",
    "channel_keywords_json",
    "banner_prompt",
    "logo_prompt",
    "apply_status_json",
)
_TONE_COLUMN = "tone_of_voice"
_CHANNEL_FK_COLUMN = "channel_profile_id"


def upgrade() -> None:
    # SQLite: add columns inside a single batch_alter_table. FK constraint must
    # be explicitly named because batch mode requires named constraints.
    with op.batch_alter_table("brand_profiles") as batch_op:
        if not _has_column("brand_profiles", _CHANNEL_FK_COLUMN):
            batch_op.add_column(
                sa.Column(
                    _CHANNEL_FK_COLUMN,
                    sa.String(36),
                    sa.ForeignKey(
                        "channel_profiles.id",
                        name=FK_NAME,
                        ondelete="SET NULL",
                    ),
                    nullable=True,
                )
            )
        if not _has_column("brand_profiles", _TONE_COLUMN):
            batch_op.add_column(sa.Column(_TONE_COLUMN, sa.String(255), nullable=True))
        for col in _TEXT_COLUMNS:
            if not _has_column("brand_profiles", col):
                batch_op.add_column(sa.Column(col, sa.Text(), nullable=True))

    # Index on the FK accelerates "branding for this channel" lookups.
    if not _index_exists(IX_NAME):
        op.create_index(
            IX_NAME,
            "brand_profiles",
            [_CHANNEL_FK_COLUMN],
            unique=False,
        )


def downgrade() -> None:
    if _index_exists(IX_NAME):
        op.drop_index(IX_NAME, table_name="brand_profiles")
    with op.batch_alter_table("brand_profiles") as batch_op:
        # Drop FK first, then column.
        try:
            batch_op.drop_constraint(FK_NAME, type_="foreignkey")
        except Exception:
            # On fresh DBs where the FK name differs across SQLite versions,
            # drop_column is still safe below.
            pass
        for col in (_CHANNEL_FK_COLUMN, _TONE_COLUMN, *_TEXT_COLUMNS):
            if _has_column("brand_profiles", col):
                batch_op.drop_column(col)
