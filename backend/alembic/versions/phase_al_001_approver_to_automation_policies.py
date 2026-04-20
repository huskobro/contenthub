"""Phase AL (REV-2 P3.2): Approver assignment — automation_policies.approver_user_id

Adds nullable approver_user_id column (FK -> users.id, ondelete=SET NULL) to
automation_policies. NULL = use owner as approver (backward compatible — mevcut
kayitlar degismez). Admin/user UI ileride bu alani doldurur; bu dalgada
yalnizca **kolonun kendisi** ve nullable semantigi ekleniyor. Publish-gate
enforcement ve approver-only visibility filtreleri sonraki fazlara birakilabilir.

Karsilik gelen KNOWN_SETTINGS:
  - automation.approver_assignment.enabled (admin-only bool, default=False)
    → MVP'de declarative; runtime read-through bu dalgada yok.

Revision ID: phase_al_001
Revises: phase_ag_001
Create Date: 2026-04-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "phase_al_001"
down_revision: Union[str, Sequence[str], None] = "phase_ag_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


FK_NAME = "fk_automation_policies_approver_user_id"
IX_NAME = "ix_automation_policies_approver_user_id"


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(sa.text(f"PRAGMA table_info({table})"))
    return any(row[1] == column for row in result)


def _index_exists(index_name: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(sa.text("SELECT name FROM sqlite_master WHERE type='index' AND name=:n"), {"n": index_name})
    return result.fetchone() is not None


def upgrade() -> None:
    # batch_alter_table required for SQLite FK add.
    # SQLite batch mode enforces NAMED constraints — FK explicitly named below.
    if not _has_column("automation_policies", "approver_user_id"):
        with op.batch_alter_table("automation_policies") as batch_op:
            batch_op.add_column(
                sa.Column(
                    "approver_user_id",
                    sa.String(36),
                    sa.ForeignKey("users.id", name=FK_NAME, ondelete="SET NULL"),
                    nullable=True,
                )
            )
    # Index: approver bazli listeleme icin ileride 'filter by assigned approver'
    # senaryosunu ucuzlastirir.
    if not _index_exists(IX_NAME):
        op.create_index(
            IX_NAME,
            "automation_policies",
            ["approver_user_id"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index(IX_NAME, table_name="automation_policies")
    with op.batch_alter_table("automation_policies") as batch_op:
        batch_op.drop_constraint(FK_NAME, type_="foreignkey")
        batch_op.drop_column("approver_user_id")
