"""
Platform Connection router — Faz 2 + Faz 17 (Connection Center).

Endpoints:
  Faz 2 (preserved):
    GET  /platform-connections           — list (basic CRUD)
    POST /platform-connections           — create
    GET  /platform-connections/{id}      — get single
    PATCH /platform-connections/{id}     — update
    DELETE /platform-connections/{id}    — delete

  Faz 17 (Connection Center):
    GET /platform-connections/center/my     — user's connections with health
    GET /platform-connections/center/admin  — admin: all connections with health+KPIs
    GET /platform-connections/{id}/health   — single connection health detail
    GET /platform-connections/{id}/capability — single connection capability matrix
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import (
    OwnershipError,
    UserContext,
    ensure_owner_or_admin,
    get_current_user_context,
)
from app.db.models import ChannelProfile
from app.db.session import get_db
from app.platform_connections import service
from app.platform_connections.schemas import (
    PlatformConnectionCreate,
    PlatformConnectionUpdate,
    PlatformConnectionResponse,
    ConnectionWithHealth,
    ConnectionCenterListResponse,
)

router = APIRouter(prefix="/platform-connections", tags=["Platform Connections"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_user_id(request: Request) -> Optional[str]:
    return request.headers.get("X-ContentHub-User-Id")


# ---------------------------------------------------------------------------
# Faz 17 — Connection Center endpoints (before /{id} to avoid path conflicts)
# ---------------------------------------------------------------------------

@router.get("/center/my", response_model=ConnectionCenterListResponse)
async def my_connections(
    request: Request,
    platform: Optional[str] = Query(None),
    health_level: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """User: list own connections with health & capability matrix."""
    user_id = _extract_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="X-ContentHub-User-Id header gerekli.")
    return await service.list_connections_for_user(
        db, user_id=user_id, platform=platform,
        health_level=health_level, skip=skip, limit=limit,
    )


@router.get("/center/admin", response_model=ConnectionCenterListResponse)
async def admin_connections(
    user_id: Optional[str] = Query(None),
    channel_profile_id: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    health_level: Optional[str] = Query(None),
    requires_reauth: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Admin: list all connections with health, KPIs, and filters."""
    return await service.list_connections_admin(
        db, user_id=user_id, channel_profile_id=channel_profile_id,
        platform=platform, health_level=health_level,
        requires_reauth=requires_reauth, skip=skip, limit=limit,
    )


@router.get("/{connection_id}/health", response_model=ConnectionWithHealth)
async def connection_health(
    connection_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Get a single connection with full health & capability detail.

    PHASE AM: non-admin callers only see their own connections; cross-user
    IDs now return 404 to avoid disclosing existence via distinct error codes.
    """
    result = await service.get_connection_with_health(db, connection_id, user_context=ctx)
    if not result:
        raise HTTPException(status_code=404, detail="Platform baglantisi bulunamadi.")
    return result


@router.get("/{connection_id}/capability")
async def connection_capability(
    connection_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Get capability matrix for a single connection.

    PHASE AM: ownership enforced via service layer; cross-user IDs return 404.
    """
    from app.platform_connections.capability import compute_capability_matrix
    conn = await service.get_platform_connection(db, connection_id, user_context=ctx)
    if not conn:
        raise HTTPException(status_code=404, detail="Platform baglantisi bulunamadi.")
    return compute_capability_matrix(conn)


# ---------------------------------------------------------------------------
# Faz 2 — Basic CRUD (preserved)
# ---------------------------------------------------------------------------

@router.get("", response_model=List[PlatformConnectionResponse])
async def list_platform_connections(
    channel_profile_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """PHASE AM security fix — legacy Faz 2 list endpoint.

    Before: returned all connections globally regardless of caller (critical
    ownership leak). Now:
      - Non-admin: service filters by ChannelProfile.user_id == ctx.user_id.
      - Admin: unfiltered (as before).
      - `channel_profile_id` filter is additionally verified at the channel
        level to prevent cross-user "guess an ID" access.
    Prefer `/center/my` (user) or `/center/admin` (admin) for new code.
    """
    if channel_profile_id and not ctx.is_admin:
        profile = await db.get(ChannelProfile, channel_profile_id)
        if profile is None:
            raise HTTPException(status_code=404, detail="Kanal profili bulunamadi.")
        ensure_owner_or_admin(ctx, profile.user_id, resource_label="Kanal profili")
    return await service.list_platform_connections(
        db,
        channel_profile_id=channel_profile_id,
        skip=skip,
        limit=limit,
        user_context=ctx,
    )


@router.post(
    "", response_model=PlatformConnectionResponse, status_code=status.HTTP_201_CREATED
)
async def create_platform_connection(
    payload: PlatformConnectionCreate,
    db: AsyncSession = Depends(get_db),
):
    return await service.create_platform_connection(db, payload)


@router.get("/{connection_id}", response_model=PlatformConnectionResponse)
async def get_platform_connection(
    connection_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """PHASE AM: ownership enforced at service layer.

    Non-admin callers receive 404 for connections they do not own, matching
    the behaviour of unknown IDs — we intentionally do not distinguish 403
    from 404 to avoid leaking the existence of foreign connections.
    """
    result = await service.get_platform_connection(db, connection_id, user_context=ctx)
    if not result:
        raise HTTPException(status_code=404, detail="Platform baglantisi bulunamadi.")
    return result


@router.patch("/{connection_id}", response_model=PlatformConnectionResponse)
async def update_platform_connection(
    connection_id: str,
    payload: PlatformConnectionUpdate,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """PHASE AM: mutation requires ownership (or admin)."""
    result = await service.update_platform_connection(
        db, connection_id, payload, user_context=ctx
    )
    if not result:
        raise HTTPException(status_code=404, detail="Platform baglantisi bulunamadi.")
    return result


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_platform_connection(
    connection_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Hard delete.

    PHASE AM: non-admin callers can only delete their own connections.
    Cross-user IDs return 404.
    """
    deleted = await service.delete_platform_connection(
        db, connection_id, user_context=ctx
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Platform baglantisi bulunamadi.")
