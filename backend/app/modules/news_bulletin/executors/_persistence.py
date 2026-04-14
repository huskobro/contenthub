"""
Persistence helpers for bulletin script + metadata executors.

Executors already write ``bulletin_script.json`` and ``metadata.json`` as
workspace artifacts.  The enrichment helper (``_enrich_bulletin``) and
any future publish/read-side surfaces rely on the DB rows being present
so that ``has_script`` / ``has_metadata`` stay truthful.

These helpers open a short-lived session (independent from the session
that owns the running Job) so an insert failure cannot poison the
pipeline's transaction — a persistence warning is logged but the
pipeline keeps running.  Idempotency: if a row already exists for the
bulletin we UPDATE and bump ``version``; otherwise we INSERT at
``version=1``.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select

from app.db.models import NewsBulletinMetadata, NewsBulletinScript
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)


async def persist_script_row(
    *,
    bulletin_id: str,
    script_data: Dict[str, Any],
    notes: Optional[str] = None,
) -> bool:
    """Upsert NewsBulletinScript for the given bulletin.

    Returns True when a row was created or updated, False when we could
    not persist (logged but not raised — pipeline continues).
    """
    if not bulletin_id:
        return False
    try:
        payload = json.dumps(script_data, ensure_ascii=False)
    except (TypeError, ValueError) as exc:
        logger.warning(
            "persist_script_row: script_data JSON serialize failed "
            "(bulletin=%s): %s", bulletin_id, exc,
        )
        return False

    try:
        async with AsyncSessionLocal() as session:
            row = (
                await session.execute(
                    select(NewsBulletinScript)
                    .where(NewsBulletinScript.news_bulletin_id == bulletin_id)
                    .limit(1)
                )
            ).scalar_one_or_none()

            if row is None:
                row = NewsBulletinScript(
                    news_bulletin_id=bulletin_id,
                    content=payload,
                    version=1,
                    source_type="generated",
                    generation_status="ready",
                    notes=notes,
                )
                session.add(row)
            else:
                row.content = payload
                row.version = (row.version or 0) + 1
                row.source_type = "generated"
                row.generation_status = "ready"
                row.updated_at = datetime.now(timezone.utc)
                if notes:
                    row.notes = notes
            await session.commit()
            return True
    except Exception as exc:  # pragma: no cover — persistence is best-effort
        logger.warning(
            "persist_script_row failed for bulletin=%s: %s", bulletin_id, exc,
        )
        return False


async def persist_metadata_row(
    *,
    bulletin_id: str,
    title: Optional[str],
    description: Optional[str],
    tags: Optional[Any],
    category: Optional[str],
    language: Optional[str],
    notes: Optional[str] = None,
) -> bool:
    """Upsert NewsBulletinMetadata for the given bulletin.

    ``tags`` may be a list or an already-serialized JSON string; both
    are normalized to a JSON-encoded string before persistence.
    """
    if not bulletin_id:
        return False

    tags_json: Optional[str] = None
    if tags is None:
        tags_json = None
    elif isinstance(tags, str):
        # Trust the caller — but if it isn't valid JSON, wrap it as a
        # single-item list so the column stays a JSON string.
        stripped = tags.strip()
        if stripped:
            try:
                json.loads(stripped)
                tags_json = stripped
            except ValueError:
                tags_json = json.dumps([stripped], ensure_ascii=False)
    else:
        try:
            tags_json = json.dumps(list(tags), ensure_ascii=False)
        except (TypeError, ValueError) as exc:
            logger.warning(
                "persist_metadata_row: tags JSON serialize failed "
                "(bulletin=%s): %s", bulletin_id, exc,
            )
            tags_json = None

    try:
        async with AsyncSessionLocal() as session:
            row = (
                await session.execute(
                    select(NewsBulletinMetadata)
                    .where(NewsBulletinMetadata.news_bulletin_id == bulletin_id)
                    .limit(1)
                )
            ).scalar_one_or_none()

            if row is None:
                row = NewsBulletinMetadata(
                    news_bulletin_id=bulletin_id,
                    title=title,
                    description=description,
                    tags_json=tags_json,
                    category=category,
                    language=language,
                    version=1,
                    source_type="generated",
                    generation_status="ready",
                    notes=notes,
                )
                session.add(row)
            else:
                row.title = title
                row.description = description
                row.tags_json = tags_json
                row.category = category
                row.language = language
                row.version = (row.version or 0) + 1
                row.source_type = "generated"
                row.generation_status = "ready"
                row.updated_at = datetime.now(timezone.utc)
                if notes:
                    row.notes = notes
            await session.commit()
            return True
    except Exception as exc:  # pragma: no cover
        logger.warning(
            "persist_metadata_row failed for bulletin=%s: %s", bulletin_id, exc,
        )
        return False
