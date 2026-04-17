"""
Notification Center router — Faz 16 + 16a + Phase Final F2 ownership guard.

Endpoints:
  GET    /notifications            — admin-only cross-user list
  GET    /notifications/my         — current user's notifications (+ broadcast system scope)
  GET    /notifications/count      — unread + total count (scope-aware)
  POST   /notifications            — create notification (admin-only; non-admin coerced to self-owned)
  GET    /notifications/{id}       — get single notification (owner or admin)
  PATCH  /notifications/{id}       — update status (owner or admin)
  GET    /notifications/by-entity/{type}/{id} — entity cross-reference (owner-scoped)
  POST   /notifications/mark-all-read — mark all unread as read (scoped to caller)

Phase Final F2 — ownership pattern mirrors AM-2 (platform_connections) and
AN-1 (automation_policies): every endpoint accepts UserContext; admin can
query across users, non-admin is coerced to ctx.user_id. Soft-auth header
(X-ContentHub-User-Id) remains valid via get_current_user (debug-mode only).
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.ownership import UserContext, get_current_user_context, ensure_owner_or_admin
from app.db.session import get_db
from app.notifications import service
from app.notifications.schemas import (
    NotificationCreate,
    NotificationResponse,
    NotificationUpdate,
    NotificationCountResponse,
    NOTIFICATION_STATUSES,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ---------------------------------------------------------------------------
# List (admin-only, full filter)
# ---------------------------------------------------------------------------

@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    owner_user_id: Optional[str] = Query(None),
    scope_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    notification_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    channel_profile_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """
    Admin-facing cross-user notification list.

    Non-admin callers are coerced to their own owner_user_id regardless of
    the value passed in the query string.
    """
    effective_owner = owner_user_id if ctx.is_admin else ctx.user_id

    items = await service.list_notifications(
        session,
        owner_user_id=effective_owner,
        scope_type=scope_type,
        status=status_filter,
        notification_type=notification_type,
        severity=severity,
        related_channel_profile_id=channel_profile_id,
        limit=limit,
        offset=offset,
    )
    return items


# ---------------------------------------------------------------------------
# My notifications (user-facing, scope-aware)
# ---------------------------------------------------------------------------

@router.get("/my", response_model=List[NotificationResponse])
async def my_notifications(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """
    Current user's notifications. Returns:
      - owner_user_id == ctx.user_id (user-scoped), AND
      - scope_type='system' broadcasts.
    """
    user_items = await service.list_notifications(
        session,
        owner_user_id=ctx.user_id,
        scope_type="user",
        status=status_filter,
        limit=limit,
    )
    system_items = await service.list_notifications(
        session,
        scope_type="system",
        status=status_filter,
        limit=20,
    )
    combined = user_items + system_items
    combined.sort(key=lambda x: x.created_at, reverse=True)
    return combined[:limit]


# ---------------------------------------------------------------------------
# Count (scope-aware)
# ---------------------------------------------------------------------------

@router.get("/count", response_model=NotificationCountResponse)
async def count_notifications(
    owner_user_id: Optional[str] = Query(None),
    scope_type: Optional[str] = Query(None),
    mode: Optional[str] = Query(None, description="'my' for current user scope"),
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """
    Get unread and total notification counts.

    mode=my: returns count for current user's notifications only.
    Otherwise: admin can pass arbitrary owner_user_id; non-admin is coerced.
    """
    if mode == "my":
        counts = await service.count_notifications(
            session,
            owner_user_id=ctx.user_id,
            scope_type="user",
        )
        return counts

    effective_owner = owner_user_id if ctx.is_admin else ctx.user_id
    counts = await service.count_notifications(
        session,
        owner_user_id=effective_owner,
        scope_type=scope_type,
    )
    return counts


# ---------------------------------------------------------------------------
# Create (admin-only or self-owned)
# ---------------------------------------------------------------------------

@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    body: NotificationCreate,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """
    Create a notification item.

    Non-admin callers can only create notifications owned by themselves.
    owner_user_id in body is coerced to ctx.user_id for non-admin.
    """
    effective_owner = body.owner_user_id if ctx.is_admin else ctx.user_id

    item = await service.create_notification(
        session,
        notification_type=body.notification_type,
        title=body.title,
        body=body.body,
        severity=body.severity,
        scope_type=body.scope_type,
        owner_user_id=effective_owner,
        related_entity_type=body.related_entity_type,
        related_entity_id=body.related_entity_id,
        related_inbox_item_id=body.related_inbox_item_id,
        related_channel_profile_id=body.related_channel_profile_id,
        action_url=body.action_url,
    )
    if item is None:
        raise HTTPException(status_code=409, detail="Duplicate notification exists")
    await session.commit()
    await session.refresh(item)
    return item


# ---------------------------------------------------------------------------
# Get single (owner or admin)
# ---------------------------------------------------------------------------

@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """Get a single notification by ID — ownership enforced."""
    item = await service.get_notification(session, notification_id)
    if not item:
        raise HTTPException(status_code=404, detail="Notification not found")
    # System/broadcast notifications (owner_user_id=None, scope_type='system')
    # are visible to everyone authenticated.
    if item.owner_user_id is not None:
        ensure_owner_or_admin(ctx, item.owner_user_id, resource_label="notification")
    return item


# ---------------------------------------------------------------------------
# Update status (owner or admin)
# ---------------------------------------------------------------------------

@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: str,
    body: NotificationUpdate,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """Update notification status (read / dismissed). Ownership enforced."""
    if body.status and body.status not in NOTIFICATION_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status: {body.status}. Allowed: {NOTIFICATION_STATUSES}",
        )

    # Pre-fetch to verify ownership before mutating
    existing = await service.get_notification(session, notification_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Notification not found")
    if existing.owner_user_id is not None:
        ensure_owner_or_admin(ctx, existing.owner_user_id, resource_label="notification")

    if body.status == "read":
        item = await service.mark_read(session, notification_id)
    elif body.status == "dismissed":
        item = await service.mark_dismissed(session, notification_id)
    else:
        raise HTTPException(status_code=422, detail="status is required (read | dismissed)")

    if not item:
        raise HTTPException(status_code=404, detail="Notification not found")
    await session.commit()
    await session.refresh(item)
    return item


# ---------------------------------------------------------------------------
# By-entity lookup (owner-scoped)
# ---------------------------------------------------------------------------

@router.get("/by-entity/{entity_type}/{entity_id}", response_model=List[NotificationResponse])
async def get_notifications_by_entity(
    entity_type: str,
    entity_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """
    Get notifications related to a specific entity.

    Non-admin sees only their own notifications for this entity; admin sees all.
    """
    items = await service.list_notifications(
        session,
        owner_user_id=None if ctx.is_admin else ctx.user_id,
        notification_type=None,
        limit=50,
    )
    matched = [
        i for i in items
        if i.related_entity_type == entity_type and i.related_entity_id == entity_id
    ]
    return matched


# ---------------------------------------------------------------------------
# Mark all read (scoped to caller; admin can pass owner_user_id)
# ---------------------------------------------------------------------------

@router.post("/mark-all-read")
async def mark_all_read(
    owner_user_id: Optional[str] = Query(None),
    scope_type: Optional[str] = Query(None),
    ctx: UserContext = Depends(get_current_user_context),
    session=Depends(get_db),
):
    """Mark all unread notifications as read (owner-scoped)."""
    effective_owner = owner_user_id if ctx.is_admin else ctx.user_id

    count = await service.mark_all_read(
        session,
        owner_user_id=effective_owner,
        scope_type=scope_type,
    )
    await session.commit()
    return {"marked_read": count}
