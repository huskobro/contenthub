"""
Platform Connection service — Faz 2 + Faz 17 (Connection Center).

Business logic for platform connection CRUD + capability/health queries.
"""

import logging
from typing import Optional

from sqlalchemy import select, func, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import UserContext
from app.db.models import PlatformConnection, ChannelProfile, User
from app.platform_connections.schemas import (
    PlatformConnectionCreate,
    PlatformConnectionUpdate,
    PlatformConnectionResponse,
    ConnectionWithHealth,
    HealthSummary,
    ConnectionHealthKPIs,
    ConnectionCenterListResponse,
)
from app.platform_connections.capability import (
    compute_capability_matrix,
    compute_health_summary,
    CAPABILITY_SUPPORTED,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Basic CRUD (Faz 2 — preserved)
# ---------------------------------------------------------------------------

async def list_platform_connections(
    db: AsyncSession,
    channel_profile_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    *,
    user_context: Optional[UserContext] = None,
) -> list[PlatformConnection]:
    """List platform connections with mandatory ownership scoping.

    PHASE AM (security fix): legacy Faz 2 endpoint previously returned ALL
    connections globally. Now every caller MUST provide a `UserContext`; the
    query is joined with `ChannelProfile` so non-admin users receive only
    connections whose channel belongs to them. Admin callers see everything.

    Back-compat: internal callers that still pass no context will receive an
    empty list (fail-closed). Routes are expected to always pass `ctx`.
    """
    q = select(PlatformConnection).order_by(PlatformConnection.created_at.desc())
    if channel_profile_id:
        q = q.where(PlatformConnection.channel_profile_id == channel_profile_id)

    # Fail-closed: no context -> empty result. Callers must pass ctx.
    if user_context is None:
        return []

    if not user_context.is_admin:
        # Join ChannelProfile to enforce ownership at query level.
        q = q.join(
            ChannelProfile,
            ChannelProfile.id == PlatformConnection.channel_profile_id,
        ).where(ChannelProfile.user_id == user_context.user_id)

    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_platform_connection(
    db: AsyncSession,
    connection_id: str,
    *,
    user_context: Optional[UserContext] = None,
) -> Optional[PlatformConnection]:
    """Get a single connection, ownership-checked.

    PHASE AM: if `user_context` is provided and the caller is not admin, we
    return None when the connection's channel profile is not owned by the
    caller. Missing context -> returns as before (router-layer guards may
    still enforce). Callers are expected to pass `user_context` for any
    user-facing route.
    """
    conn = await db.get(PlatformConnection, connection_id)
    if conn is None:
        return None
    if user_context is None or user_context.is_admin:
        return conn
    # Non-admin: verify channel ownership at service layer too.
    profile = await db.get(ChannelProfile, conn.channel_profile_id)
    if profile is None or profile.user_id != user_context.user_id:
        return None
    return conn


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
    db: AsyncSession,
    connection_id: str,
    payload: PlatformConnectionUpdate,
    *,
    user_context: Optional[UserContext] = None,
) -> Optional[PlatformConnection]:
    """Update a connection, ownership-checked.

    PHASE AM: non-admin callers may only mutate connections belonging to their
    own channel profiles. Missing context -> treated as not-found (fail-closed)
    so a stray caller cannot mutate arbitrary rows.
    """
    conn = await db.get(PlatformConnection, connection_id)
    if not conn:
        return None
    if user_context is None:
        return None
    if not user_context.is_admin:
        profile = await db.get(ChannelProfile, conn.channel_profile_id)
        if profile is None or profile.user_id != user_context.user_id:
            return None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(conn, field, value)
    await db.commit()
    await db.refresh(conn)
    return conn


async def delete_platform_connection(
    db: AsyncSession,
    connection_id: str,
    *,
    user_context: Optional[UserContext] = None,
) -> bool:
    """Hard delete, ownership-checked.

    PHASE AM: non-admin callers may only delete connections belonging to their
    own channel profiles. Missing context -> treated as not-found (fail-closed).
    """
    conn = await db.get(PlatformConnection, connection_id)
    if not conn:
        return False
    if user_context is None:
        return False
    if not user_context.is_admin:
        profile = await db.get(ChannelProfile, conn.channel_profile_id)
        if profile is None or profile.user_id != user_context.user_id:
            return False
    await db.delete(conn)
    await db.commit()
    return True


# ---------------------------------------------------------------------------
# Faz 17 — Connection Center queries
# ---------------------------------------------------------------------------

def _enrich_connection(
    conn: PlatformConnection,
    channel_name: Optional[str] = None,
    user_id: Optional[str] = None,
    user_display_name: Optional[str] = None,
) -> ConnectionWithHealth:
    """Convert a PlatformConnection ORM row to ConnectionWithHealth schema."""
    health_raw = compute_health_summary(conn)
    health = HealthSummary(**health_raw)

    resp = PlatformConnectionResponse.model_validate(conn)
    return ConnectionWithHealth(
        **resp.model_dump(),
        health=health,
        channel_profile_name=channel_name,
        user_id=user_id,
        user_display_name=user_display_name,
    )


async def get_connection_with_health(
    db: AsyncSession,
    connection_id: str,
    *,
    user_context: Optional[UserContext] = None,
) -> Optional[ConnectionWithHealth]:
    """Get a single connection with computed health/capability.

    PHASE AM: non-admin callers may only view connections belonging to their
    own channel profiles. Missing context -> returns as before (router-layer
    guards may still enforce).
    """
    conn = await db.get(PlatformConnection, connection_id)
    if not conn:
        return None

    # Fetch channel profile name
    ch = await db.get(ChannelProfile, conn.channel_profile_id)
    if user_context is not None and not user_context.is_admin:
        if ch is None or ch.user_id != user_context.user_id:
            return None
    ch_name = ch.profile_name if ch else None
    uid = ch.user_id if ch else None
    u_name: Optional[str] = None
    if uid:
        u = await db.get(User, uid)
        u_name = u.display_name if u else None

    return _enrich_connection(conn, ch_name, uid, u_name)


async def list_connections_for_user(
    db: AsyncSession,
    user_id: str,
    platform: Optional[str] = None,
    health_level: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> ConnectionCenterListResponse:
    """List all connections belonging to a user's channel profiles, enriched."""
    # Find user's channel profile IDs
    cp_q = select(ChannelProfile.id, ChannelProfile.profile_name).where(
        ChannelProfile.user_id == user_id
    )
    cp_result = await db.execute(cp_q)
    cp_rows = cp_result.all()
    if not cp_rows:
        return ConnectionCenterListResponse(items=[], total=0)

    cp_map = {row[0]: row[1] for row in cp_rows}
    cp_ids = list(cp_map.keys())

    # Query connections
    q = select(PlatformConnection).where(
        PlatformConnection.channel_profile_id.in_(cp_ids)
    )
    if platform:
        q = q.where(PlatformConnection.platform == platform)
    q = q.order_by(PlatformConnection.is_primary.desc(), PlatformConnection.created_at.desc())

    # Count total
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    connections = list(result.scalars().all())

    # Fetch user display name once
    u = await db.get(User, user_id)
    u_name = u.display_name if u else None

    items: list[ConnectionWithHealth] = []
    for c in connections:
        enriched = _enrich_connection(c, cp_map.get(c.channel_profile_id), user_id, u_name)
        if health_level and enriched.health.health_level != health_level:
            continue
        items.append(enriched)

    return ConnectionCenterListResponse(items=items, total=total)


async def list_connections_admin(
    db: AsyncSession,
    user_id: Optional[str] = None,
    channel_profile_id: Optional[str] = None,
    platform: Optional[str] = None,
    health_level: Optional[str] = None,
    requires_reauth: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
) -> ConnectionCenterListResponse:
    """Admin: list all connections with health, KPIs, and enrichment."""
    q = select(PlatformConnection)

    # User filter: need channel profile IDs
    if user_id:
        cp_ids_q = select(ChannelProfile.id).where(ChannelProfile.user_id == user_id)
        cp_ids_result = await db.execute(cp_ids_q)
        cp_ids = [r[0] for r in cp_ids_result.all()]
        if not cp_ids:
            return ConnectionCenterListResponse(items=[], total=0, kpis=ConnectionHealthKPIs())
        q = q.where(PlatformConnection.channel_profile_id.in_(cp_ids))

    if channel_profile_id:
        q = q.where(PlatformConnection.channel_profile_id == channel_profile_id)
    if platform:
        q = q.where(PlatformConnection.platform == platform)
    if requires_reauth is not None:
        q = q.where(PlatformConnection.requires_reauth == requires_reauth)

    q = q.order_by(PlatformConnection.created_at.desc())

    # Count total
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Fetch all for KPI computation (limited to a reasonable batch)
    all_q = q.limit(500)
    all_result = await db.execute(all_q)
    all_connections = list(all_result.scalars().all())

    # Pre-fetch channel profiles and users for enrichment
    cp_ids_set = {c.channel_profile_id for c in all_connections}
    cp_map: dict[str, tuple[str, str]] = {}  # cp_id → (profile_name, user_id)
    if cp_ids_set:
        cp_q2 = select(ChannelProfile).where(ChannelProfile.id.in_(cp_ids_set))
        cp_result2 = await db.execute(cp_q2)
        for cp in cp_result2.scalars().all():
            cp_map[cp.id] = (cp.profile_name, cp.user_id)

    user_ids = {uid for _, uid in cp_map.values()}
    user_map: dict[str, str] = {}
    if user_ids:
        u_q = select(User).where(User.id.in_(user_ids))
        u_result = await db.execute(u_q)
        for u in u_result.scalars().all():
            user_map[u.id] = u.display_name or u.slug or u.id

    # Enrich all and compute KPIs
    kpis = ConnectionHealthKPIs(total=len(all_connections))
    enriched_all: list[ConnectionWithHealth] = []

    for c in all_connections:
        cp_info = cp_map.get(c.channel_profile_id, (None, None))
        ch_name, uid = cp_info
        u_name = user_map.get(uid) if uid else None
        enriched = _enrich_connection(c, ch_name, uid, u_name)

        # KPI accumulation
        hl = enriched.health.health_level
        if hl == "healthy":
            kpis.healthy += 1
        elif hl == "partial":
            kpis.partial += 1
        elif hl == "disconnected":
            kpis.disconnected += 1
        elif hl == "reauth_required":
            kpis.reauth_required += 1
        elif hl == "token_issue":
            kpis.token_issue += 1

        matrix = enriched.health.capability_matrix
        if matrix.get("can_publish") == CAPABILITY_SUPPORTED:
            kpis.can_publish_ok += 1
        if matrix.get("can_read_comments") == CAPABILITY_SUPPORTED:
            kpis.can_read_comments_ok += 1
        if matrix.get("can_reply_comments") == CAPABILITY_SUPPORTED:
            kpis.can_reply_comments_ok += 1
        if matrix.get("can_read_playlists") == CAPABILITY_SUPPORTED:
            kpis.can_read_playlists_ok += 1
        if matrix.get("can_write_playlists") == CAPABILITY_SUPPORTED:
            kpis.can_write_playlists_ok += 1
        if matrix.get("can_create_posts") == CAPABILITY_SUPPORTED:
            kpis.can_create_posts_ok += 1
        if matrix.get("can_read_analytics") == CAPABILITY_SUPPORTED:
            kpis.can_read_analytics_ok += 1
        if matrix.get("can_sync_channel_info") == CAPABILITY_SUPPORTED:
            kpis.can_sync_channel_info_ok += 1

        # Health level filter (post-computation)
        if health_level and hl != health_level:
            continue
        enriched_all.append(enriched)

    # Paginate the filtered list
    page = enriched_all[skip : skip + limit]

    return ConnectionCenterListResponse(items=page, total=total, kpis=kpis)
