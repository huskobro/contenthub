"""Aurora-only cleanup: drop atrium/bridge/canvas surface orphan settings rows

The Aurora-only cleanup wave removed three surface source modules
(Atrium / Bridge / Canvas) and their KNOWN_SETTINGS entries:

  - ui.surface.atrium.enabled
  - ui.surface.bridge.enabled
  - ui.surface.canvas.enabled

The Settings drift repair (`mark_orphan_settings`) flips DB rows whose key
is no longer in KNOWN_SETTINGS to ``status='orphan'`` so the resolver and
the user-visible filter exclude them. But that pass NEVER deletes the
rows — they keep showing up in the admin Settings registry view with an
orphan badge, polluting drift reports and the audit log.

This migration finishes the cleanup by hard-deleting any surviving rows
for those three exact keys, AND it also clears any user_setting_overrides
rows that referenced them (defensive — there should be none).

The migration is idempotent: running it twice is a no-op because the
rows are already gone the second time.

We do NOT touch any other settings keys. We do NOT change schema.

Revision ID: aurora_surface_001
Revises: branding_center_001
Create Date: 2026-04-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "aurora_surface_001"
down_revision: Union[str, Sequence[str], None] = "branding_center_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Hard-coded list of orphan keys we are removing in this wave. Keeping the
# list explicit means a future surface removal cannot accidentally piggy-back
# on this migration — it must add its own migration with its own list.
ORPHAN_KEYS = (
    "ui.surface.atrium.enabled",
    "ui.surface.bridge.enabled",
    "ui.surface.canvas.enabled",
)


def upgrade() -> None:
    bind = op.get_bind()

    # Bind parameters via expanding param so SQLite + the IN clause stay
    # safe (no string concat into raw SQL).
    delete_overrides = sa.text(
        "DELETE FROM user_setting_overrides "
        "WHERE setting_key IN :keys"
    ).bindparams(sa.bindparam("keys", expanding=True))
    delete_settings = sa.text(
        "DELETE FROM settings WHERE key IN :keys"
    ).bindparams(sa.bindparam("keys", expanding=True))

    # 1. Drop any user_setting_overrides rows that reference these keys.
    # Defensive — these keys were never user-overridable, but if a row
    # exists it would dangle after the parent settings row is gone.
    bind.execute(delete_overrides, {"keys": list(ORPHAN_KEYS)})

    # 2. Hard-delete the orphan settings rows themselves.
    bind.execute(delete_settings, {"keys": list(ORPHAN_KEYS)})


def downgrade() -> None:
    # Intentionally empty.
    #
    # The orphan keys do not exist in KNOWN_SETTINGS anymore, so the seed
    # path on the next startup will NOT recreate them (the seeder iterates
    # KNOWN_SETTINGS, not historical keys). A real downgrade would require
    # restoring the surface modules themselves, which is out of scope for
    # a settings cleanup migration. If the surfaces are ever resurrected,
    # the seeder would re-create the rows fresh with default values.
    pass
