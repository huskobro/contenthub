"""
Audit Log Service — M11.

Platform-wide append-only audit trail. Writes to the audit_logs table
which existed since Phase 2 but was never written to until M11.

Rules:
  - Never commit — caller owns the transaction (uses db.flush())
  - Never raise — audit failures must not break the calling operation
  - Always log warnings on failure
  - Minimal fields required: action
"""

import json
import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog

logger = logging.getLogger(__name__)


async def write_audit_log(
    db: AsyncSession,
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    actor_type: str = "system",
    actor_id: Optional[str] = None,
    details: Optional[dict] = None,
) -> Optional[str]:
    """
    Write an audit log entry. Returns the audit log ID on success, None on failure.

    This function NEVER raises. All errors are caught and logged as warnings.
    The caller's transaction is not affected by audit failures.
    """
    try:
        entry = AuditLog(
            actor_type=actor_type,
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details_json=json.dumps(details or {}, default=str),
        )
        db.add(entry)
        await db.flush()
        return entry.id
    except Exception as exc:
        logger.warning("Audit log write failed for action=%s: %s", action, exc)
        return None
