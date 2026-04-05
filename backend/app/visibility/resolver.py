"""
Visibility Resolver — M11.

Runtime visibility resolution. Takes a target_key and context (role, mode, module)
and returns the effective visibility state by querying VisibilityRule rows.

Resolution logic:
  1. Query all active rules matching target_key
  2. Apply scope filters: role_scope (NULL = all), mode_scope (NULL = all), module_scope (NULL = all)
  3. Order by priority DESC — highest priority rule wins
  4. If no matching rule: return defaults (visible=True, read_only=False)

This module is pure read — it never writes rules.
"""

import logging
from typing import Optional

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import VisibilityRule

logger = logging.getLogger(__name__)

# Default when no rule matches
_DEFAULTS = {
    "visible": True,
    "read_only": False,
    "wizard_visible": False,
}


async def resolve_visibility(
    db: AsyncSession,
    target_key: str,
    role: Optional[str] = None,
    mode: Optional[str] = None,
    module_scope: Optional[str] = None,
) -> dict:
    """
    Resolve effective visibility for a target_key in given context.

    Returns dict with keys: visible, read_only, wizard_visible.
    If no matching rule found, returns permissive defaults.
    """
    stmt = (
        select(VisibilityRule)
        .where(
            VisibilityRule.target_key == target_key,
            VisibilityRule.status == "active",
        )
    )

    # Role scope: match specific role OR null (applies to all)
    if role is not None:
        stmt = stmt.where(
            or_(VisibilityRule.role_scope == role, VisibilityRule.role_scope.is_(None))
        )

    # Mode scope: match specific mode OR null
    if mode is not None:
        stmt = stmt.where(
            or_(VisibilityRule.mode_scope == mode, VisibilityRule.mode_scope.is_(None))
        )

    # Module scope: match specific module OR null (platform-wide)
    if module_scope is not None:
        stmt = stmt.where(
            or_(VisibilityRule.module_scope == module_scope, VisibilityRule.module_scope.is_(None))
        )

    # Highest priority first
    stmt = stmt.order_by(VisibilityRule.priority.desc()).limit(1)

    result = await db.execute(stmt)
    rule = result.scalar_one_or_none()

    if rule is None:
        return dict(_DEFAULTS)

    return {
        "visible": rule.visible,
        "read_only": rule.read_only,
        "wizard_visible": rule.wizard_visible,
    }


async def check_visible(
    db: AsyncSession,
    target_key: str,
    role: Optional[str] = None,
    mode: Optional[str] = None,
    module_scope: Optional[str] = None,
) -> bool:
    """Convenience: returns True if target is visible in given context."""
    result = await resolve_visibility(db, target_key, role, mode, module_scope)
    return result["visible"]
