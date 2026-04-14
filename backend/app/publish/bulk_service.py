"""
Publish bulk action service — Gate 4 (Publish Closure).

Provides per-record-transactional bulk wrappers around the existing
single-record service functions:

    bulk_approve(record_ids, reviewer_id, note) -> BulkActionResponse
    bulk_reject(record_ids, reviewer_id, rejection_reason, note) -> BulkActionResponse
    bulk_cancel(record_ids, actor_id, note) -> BulkActionResponse
    bulk_retry(record_ids, actor_id, note) -> BulkActionResponse

Design rules (Gate 4 mandate):
  - NEVER one giant transaction. Each record gets its own session via the
    provided session factory so a single bad record cannot poison the
    whole batch.
  - Per-record result is returned. Partial failure is the norm, not an
    exception path.
  - The state machine is NOT bypassed — each record goes through the
    normal service.review_action / cancel_publish / retry_publish so
    review-gate and publish-gate guarantees still hold.
  - Bulk-level audit log is written once at the end of the batch and
    explicitly committed (write_audit_log only flushes — see Gate 3A bug).
  - Limits enforced here, not in the router, so callers can't bypass.

Concurrency: this runs inside the request loop. For the in-process
async queue model used in ContentHub, sequential per-record processing
is intentional (tens of records per call max) and avoids interleaving
log writes that would confuse the audit trail.
"""

from __future__ import annotations

import logging
from typing import Awaitable, Callable, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit_log
from app.publish import service as publish_service
from app.publish.exceptions import (
    InvalidPublishTransitionError,
    PublishAlreadyTerminalError,
    PublishGateViolationError,
    PublishRecordNotFoundError,
    ReviewGateViolationError,
)
from app.publish.schemas import BulkActionItemResult, BulkActionResponse

logger = logging.getLogger(__name__)


# Router enforces basic limits, but service is the last line of defence.
MAX_BULK_RECORDS = 100


SessionFactory = Callable[[], AsyncSession]


# ---------------------------------------------------------------------------
# Public bulk entry points
# ---------------------------------------------------------------------------

async def bulk_approve(
    *,
    session_factory: SessionFactory,
    record_ids: list[str],
    reviewer_id: Optional[str],
    note: Optional[str] = None,
) -> BulkActionResponse:
    """Bulk approve: per-record review_action(decision='approve')."""
    return await _run_bulk(
        action="approve",
        session_factory=session_factory,
        record_ids=record_ids,
        actor_id=reviewer_id,
        per_record=lambda s, rid: publish_service.review_action(
            session=s,
            record_id=rid,
            decision="approve",
            reviewer_id=reviewer_id,
            note=note,
        ),
    )


async def bulk_reject(
    *,
    session_factory: SessionFactory,
    record_ids: list[str],
    reviewer_id: Optional[str],
    rejection_reason: str,
    note: Optional[str] = None,
) -> BulkActionResponse:
    """Bulk reject: rejection_reason is required upstream."""
    if not rejection_reason or not rejection_reason.strip():
        raise ValueError("rejection_reason is required for bulk reject")
    return await _run_bulk(
        action="reject",
        session_factory=session_factory,
        record_ids=record_ids,
        actor_id=reviewer_id,
        per_record=lambda s, rid: publish_service.review_action(
            session=s,
            record_id=rid,
            decision="reject",
            reviewer_id=reviewer_id,
            note=note,
            rejection_reason=rejection_reason,
        ),
    )


async def bulk_cancel(
    *,
    session_factory: SessionFactory,
    record_ids: list[str],
    actor_id: Optional[str],
    note: Optional[str] = None,
) -> BulkActionResponse:
    """Bulk cancel: per-record cancel_publish."""
    return await _run_bulk(
        action="cancel",
        session_factory=session_factory,
        record_ids=record_ids,
        actor_id=actor_id,
        per_record=lambda s, rid: publish_service.cancel_publish(
            session=s,
            record_id=rid,
            actor_id=actor_id,
            note=note,
        ),
    )


async def bulk_retry(
    *,
    session_factory: SessionFactory,
    record_ids: list[str],
    actor_id: Optional[str],
    note: Optional[str] = None,
) -> BulkActionResponse:
    """Bulk retry: per-record retry_publish (failed → publishing only)."""
    return await _run_bulk(
        action="retry",
        session_factory=session_factory,
        record_ids=record_ids,
        actor_id=actor_id,
        per_record=lambda s, rid: publish_service.retry_publish(
            session=s,
            record_id=rid,
            actor_id=actor_id,
            note=note,
        ),
    )


# ---------------------------------------------------------------------------
# Internals
# ---------------------------------------------------------------------------

async def _run_bulk(
    *,
    action: str,
    session_factory: SessionFactory,
    record_ids: list[str],
    actor_id: Optional[str],
    per_record: Callable[[AsyncSession, str], Awaitable],
) -> BulkActionResponse:
    """
    Execute `per_record(session, record_id)` for each id with its own
    session/transaction. Aggregate results into a BulkActionResponse and
    emit a single bulk-level audit row at the end (committed).
    """
    if not record_ids:
        raise ValueError("record_ids is empty")
    # Dedupe while preserving order — operators often paste the same id twice.
    seen: set[str] = set()
    deduped: list[str] = []
    for rid in record_ids:
        if rid in seen:
            continue
        seen.add(rid)
        deduped.append(rid)
    if len(deduped) > MAX_BULK_RECORDS:
        raise ValueError(
            f"Bulk request exceeds limit ({len(deduped)} > {MAX_BULK_RECORDS})"
        )

    results: list[BulkActionItemResult] = []
    succeeded = 0

    for rid in deduped:
        item = await _run_one(
            session_factory=session_factory,
            record_id=rid,
            per_record=per_record,
        )
        if item.ok:
            succeeded += 1
        results.append(item)

    failed = len(deduped) - succeeded

    # One bulk-level audit row, committed in its own session so it
    # cannot disappear if a per-record session was rolled back.
    try:
        async with session_factory() as audit_session:
            await write_audit_log(
                audit_session,
                action=f"publish.bulk.{action}",
                entity_type="publish_record",
                entity_id=None,
                actor_id=actor_id,
                details={
                    "requested": len(deduped),
                    "succeeded": succeeded,
                    "failed": failed,
                    "record_ids": deduped,
                },
            )
            # Gate 3A lesson: write_audit_log only flushes — caller must commit.
            await audit_session.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("publish.bulk.%s audit log write failed: %s", action, exc)

    logger.info(
        "publish.bulk.%s: requested=%d succeeded=%d failed=%d",
        action, len(deduped), succeeded, failed,
    )

    return BulkActionResponse(
        action=action,
        requested=len(deduped),
        succeeded=succeeded,
        failed=failed,
        results=results,
    )


async def _run_one(
    *,
    session_factory: SessionFactory,
    record_id: str,
    per_record: Callable[[AsyncSession, str], Awaitable],
) -> BulkActionItemResult:
    """
    Execute the per-record callable inside its own session.

    Catches the well-known publish exception family and maps to a stable
    `error_code` enum string so the UI can render category-aware messaging.
    Any other exception is mapped to `internal` and logged.
    """
    try:
        async with session_factory() as session:
            record = await per_record(session, record_id)
            # Service layer commits internally; status is current.
            return BulkActionItemResult(
                record_id=record_id,
                ok=True,
                status_after=getattr(record, "status", None),
            )
    except PublishRecordNotFoundError as exc:
        return BulkActionItemResult(
            record_id=record_id, ok=False,
            error_code="not_found", error_message=str(exc),
        )
    except ReviewGateViolationError as exc:
        return BulkActionItemResult(
            record_id=record_id, ok=False,
            error_code="review_gate", error_message=str(exc),
        )
    except PublishGateViolationError as exc:
        return BulkActionItemResult(
            record_id=record_id, ok=False,
            error_code="publish_gate", error_message=str(exc),
        )
    except PublishAlreadyTerminalError as exc:
        return BulkActionItemResult(
            record_id=record_id, ok=False,
            error_code="terminal", error_message=str(exc),
        )
    except InvalidPublishTransitionError as exc:
        return BulkActionItemResult(
            record_id=record_id, ok=False,
            error_code="invalid_transition", error_message=str(exc),
        )
    except ValueError as exc:
        return BulkActionItemResult(
            record_id=record_id, ok=False,
            error_code="invalid_request", error_message=str(exc),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("publish.bulk: unexpected error on record %s", record_id)
        return BulkActionItemResult(
            record_id=record_id, ok=False,
            error_code="internal", error_message=str(exc),
        )
