"""
Platform Connection service — Faz 2.

Business logic for platform connection CRUD.
"""

import logging
from typing import Optional

from sqlalchemy import select, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PlatformConnection
from app.platform_connections.schemas import (
    PlatformConnectionCreate,
    PlatformConnectionUpdate,
)

logger = logging.getLogger(__name__)


async def list_platform_connections(
    db: AsyncSession,
    channel_profile_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[PlatformConnection]:
    q = select(PlatformConnection).order_by(PlatformConnection.created_at.desc())
    if channel_profile_id:
        q = q.where(PlatformConnection.channel_profile_id == channel_profile_id)
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_platform_connection(
    db: AsyncSession, connection_id: str
) -> Optional[PlatformConnection]:
    return await db.get(PlatformConnection, connection_id)


async def create_platform_connection(
    db: AsyncSession, payload: PlatformConnectionCreate
) -> PlatformConnection:
    conn = PlatformConnection(
        channel_profile_id=payload.channel_profile_id,
        platform=payload.platform,
        external_account_id=payload.external_account_id,
        external_account_name=payload.external_account_name,
        external_avatar_url=payload.external_avatar_url,
        auth_state=payload.auth_state,
        token_state=payload.token_state,
        scopes_granted=payload.scopes_granted,
        scopes_required=payload.scopes_required,
        scope_status=payload.scope_status,
        features_available=payload.features_available,
        connection_status=payload.connection_status,
        requires_reauth=payload.requires_reauth,
        is_primary=payload.is_primary,
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    logger.info(
        "PlatformConnection created: id=%s platform=%s", conn.id, conn.platform
    )
    return conn


async def update_platform_connection(
    db: AsyncSession, connection_id: str, payload: PlatformConnectionUpdate
) -> Optional[PlatformConnection]:
    conn = await db.get(PlatformConnection, connection_id)
    if not conn:
        return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(conn, field, value)
    await db.commit()
    await db.refresh(conn)
    return conn


async def delete_platform_connection(
    db: AsyncSession, connection_id: str
) -> bool:
    """Hard delete."""
    conn = await db.get(PlatformConnection, connection_id)
    if not conn:
        return False
    await db.delete(conn)
    await db.commit()
    return True
