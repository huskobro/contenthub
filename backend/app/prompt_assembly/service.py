"""PromptBlock CRUD service and query helpers."""

import logging
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.prompt_assembly.models import PromptBlock
from app.prompt_assembly.schemas import PromptBlockCreate, PromptBlockUpdate
from app.audit.service import write_audit_log

logger = logging.getLogger(__name__)

# Kinds that cannot be disabled or deleted
PROTECTED_KINDS = {"core_system", "output_contract"}


async def list_blocks(
    db: AsyncSession,
    module_scope: Optional[str] = None,
    provider_scope: Optional[str] = None,
    status_filter: str = "active",
) -> List[PromptBlock]:
    """List prompt blocks with optional filters, ordered by order_index."""
    stmt = select(PromptBlock).order_by(PromptBlock.order_index, PromptBlock.key)

    if module_scope is not None:
        stmt = stmt.where(
            (PromptBlock.module_scope == module_scope) | (PromptBlock.module_scope.is_(None))
        )
    if provider_scope is not None:
        stmt = stmt.where(
            (PromptBlock.provider_scope == provider_scope) | (PromptBlock.provider_scope.is_(None))
        )
    if status_filter:
        stmt = stmt.where(PromptBlock.status == status_filter)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_block(db: AsyncSession, block_id: str) -> PromptBlock:
    """Fetch a single block by ID. Raises 404 if not found."""
    result = await db.execute(select(PromptBlock).where(PromptBlock.id == block_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PromptBlock '{block_id}' not found.",
        )
    return row


async def get_block_by_key(db: AsyncSession, key: str) -> Optional[PromptBlock]:
    """Fetch a single block by key. Returns None if not found."""
    result = await db.execute(select(PromptBlock).where(PromptBlock.key == key))
    return result.scalar_one_or_none()


async def create_block(db: AsyncSession, payload: PromptBlockCreate) -> PromptBlock:
    """Create a new prompt block."""
    row = PromptBlock(**payload.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)

    await write_audit_log(
        db,
        action="prompt_block.create",
        entity_type="prompt_block",
        entity_id=row.id,
        details={"key": row.key, "kind": row.kind, "module_scope": row.module_scope},
    )
    return row


async def update_block(
    db: AsyncSession, block_id: str, payload: PromptBlockUpdate
) -> PromptBlock:
    """Update a prompt block (PATCH semantics)."""
    row = await get_block(db, block_id)
    changes = payload.model_dump(exclude_unset=True)

    if not changes:
        return row

    # Enforce protection rules
    _enforce_protection(row, changes)

    for field_name, value in changes.items():
        setattr(row, field_name, value)

    # Track admin override
    if "admin_override_template" in changes and changes["admin_override_template"] is not None:
        row.source_kind = "admin_override"
    elif "admin_override_template" in changes and changes["admin_override_template"] is None:
        row.source_kind = "builtin_default"

    row.version = row.version + 1

    await db.commit()
    await db.refresh(row)

    await write_audit_log(
        db,
        action="prompt_block.update",
        entity_type="prompt_block",
        entity_id=row.id,
        details={"key": row.key, "changed_fields": list(changes.keys())},
    )
    return row


async def get_effective_blocks(
    db: AsyncSession, module_scope: str
) -> List[PromptBlock]:
    """Get all active blocks applicable to a module (for snapshot)."""
    stmt = (
        select(PromptBlock)
        .where(PromptBlock.status == "active")
        .where(
            (PromptBlock.module_scope == module_scope) | (PromptBlock.module_scope.is_(None))
        )
        .order_by(PromptBlock.order_index, PromptBlock.key)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


def _enforce_protection(block: PromptBlock, changes: dict) -> None:
    """Prevent disabling/deleting core_system and output_contract blocks."""
    if block.kind not in PROTECTED_KINDS:
        return

    new_status = changes.get("status")
    if new_status and new_status in ("disabled", "deleted"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"'{block.kind}' turundeki bloklar devre disi birakilamaz veya silinemez.",
        )
