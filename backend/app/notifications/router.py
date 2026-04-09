"""
Notification Center router — Faz 16 + 16a scope closure.

Endpoints:
  GET    /notifications            — list notifications (filter by owner/scope/status/type)
  GET    /notifications/my         — current user's notifications (scope-aware)
  GET    /notifications/count      — unread + total count (scope-aware if user header present)
  POST   /notifications            — create notification (internal/admin)
  GET    /notifications/{id}       — get single notification
  PATCH  /notifications/{id}       — update status (read/dismissed)
  GET    /notifications/by-entity/{type}/{id} — entity cross-reference
  POST   /notifications/mark-all-read — mark all unread as read
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Header, Query, status

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
# Helper: extract current user ID from header (soft auth)
# ---------------------------------------------------------------------------

def _extract_user_id(header_val: Optional[str]) -> Optional[str]:
    """Extract user ID from X-ContentHub-User-Id header if valid."""
    if header_val and len(header_val.strip()) >= 32:
        return header_val.strip()
    return None


# ---------------------------------------------------------------------------
# List (admin-facing, full filter)
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
    session=Depends(get_db),
):
    """List notifications with optional filters (admin-facing)."""
    items = await service.list_notifications(
        session,
        owner_user_id=owner_user_id,
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
    x_contenthub_user_id: Optional[str] = Header(None, alias="X-ContentHub-User-Id"),
    session=Depends(get_db),
):
    """
    Current user's notifications. Faz 16a scope closure.

    Returns notifications where:
    - owner_user_id matches the current user, OR
    - scope_type is 'user' and owner_user_id is NULL (broadcast)

    Admin-scoped notifications are excluded.
    """
    user_id = _extract_user_id(x_contenthub_user_id)

    # Fetch user-scoped notifications for this user
    user_items = await service.list_notifications(
        session,
        owner_user_id=user_id,
        scope_type="user",
        status=status_filter,
        limit=limit,
    )
    # Also include system-wide broadcasts (no owner, scope=system)
    system_items = await service.list_notifications(
        session,
        scope_type="system",
        status=status_filter,
        limit=20,
    )
    # Merge and sort by created_at desc
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
    x_contenthub_user_id: Optional[str] = Header(None, alias="X-ContentHub-User-Id"),
    session=Depends(get_db),
):
    """
    Get unread and total notification counts.

    mode=my: returns count for current user's notifications only.
    Otherwise: returns count with explicit filters.
    """
    if mode == "my":
        user_id = _extract_user_id(x_contenthub_user_id)
        counts = await service.count_notifications(
            session,
            owner_user_id=user_id,
            scope_type="user",
        )
        return counts

    counts = await service.count_notifications(
        session,
        owner_user_id=owner_user_id,
        scope_type=scope_type,
    )
    return counts


# ---------------------------------------------------------------------------
# Create (internal / admin)
# ---------------------------------------------------------------------------

@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    body: NotificationCreate,
    session=Depends(get_db),
):
    """Create a notification item."""
    item = await service.create_notification(
        session,
        notification_type=body.notification_type,
        title=body.title,
        body=body.body,
        severity=body.severity,
        scope_type=body.scope_type,
        owner_user_id=body.owner_user_id,
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
# Get single
# ---------------------------------------------------------------------------

@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: str,
    session=Depends(get_db),
):
    """Get a single notification by ID."""
    item = await service.get_notification(session, notification_id)
    if not item:
        raise HTTPException(status_code=404, detail="Notification not found")
    return item


# ---------------------------------------------------------------------------
# Update status
# ---------------------------------------------------------------------------

@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: str,
    body: NotificationUpdate,
    session=Depends(get_db),
):
    """Update notification status (read / dismissed)."""
    if body.status and body.status not in NOTIFICATION_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status: {body.status}. Allowed: {NOTIFICATION_STATUSES}",
        )

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
# By-entity lookup
# ---------------------------------------------------------------------------

@router.get("/by-entity/{entity_type}/{entity_id}", response_model=List[NotificationResponse])
async def get_notifications_by_entity(
    entity_type: str,
    entity_id: str,
    session=Depends(get_db),
):
    """Get notifications related to a specific entity (for cross-referencing)."""
    items = await service.list_notifications(
        session,
        notification_type=None,
        limit=20,
    )
    matched = [
        i for i in items
        if i.related_entity_type == entity_type and i.related_entity_id == entity_id
    ]
    return matched


# ---------------------------------------------------------------------------
# Mark all read
# ---------------------------------------------------------------------------

@router.post("/mark-all-read")
async def mark_all_read(
    owner_user_id: Optional[str] = Query(None),
    scope_type: Optional[str] = Query(None),
    session=Depends(get_db),
):
    """Mark all unread notifications as read."""
    count = await service.mark_all_read(
        session,
        owner_user_id=owner_user_id,
        scope_type=scope_type,
    )
    await session.commit()
    return {"marked_read": count}
