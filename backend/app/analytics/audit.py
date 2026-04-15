"""
Analytics audit log — Gate 5 F1.

Thin wrapper over app.audit.service.write_audit_log. Records read-only
analytics view events (who looked at which report with which filters).

Fire-and-forget semantics:
  - Never raises (write_audit_log already absorbs errors)
  - Never blocks the response path
  - Skipped if actor_id is None (unauthenticated path won't reach here
    because of visibility guards, but defensive check)
"""

import logging
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit_log

logger = logging.getLogger(__name__)


async def record_analytics_view(
    db: AsyncSession,
    report_kind: str,
    actor_id: Optional[str] = None,
    filters: Optional[dict[str, Any]] = None,
) -> None:
    """
    Record an analytics view event.

    Args:
        db: Active async session (caller owns the transaction).
        report_kind: Short identifier for the report, e.g.
            "overview", "operations", "content", "youtube.channel-totals".
        actor_id: User id; if None the event is skipped.
        filters: Plain-dict of filter parameters (window, date_from, etc.).
            Serialized into details_json by write_audit_log.

    Returns: None. Failures are logged as warnings and absorbed.
    """
    if actor_id is None:
        return
    try:
        await write_audit_log(
            db,
            action=f"analytics.view.{report_kind}",
            entity_type="analytics_report",
            entity_id=report_kind,
            actor_type="user",
            actor_id=actor_id,
            details={"filters": filters or {}},
        )
    except Exception as exc:  # noqa: BLE001 — defensive safety net
        logger.warning("Analytics audit write failed for kind=%s: %s", report_kind, exc)
