"""
Notification Center router — Faz 16.

Endpoints:
  GET    /notifications            — list notifications (filter by owner/scope/status/type)
  GET    /notifications/count      — unread + total count
  POST   /notifications            — create notification (internal/admin)
  GET    /notifications/{id}       — get single notification
  PATCH  /notifications/{id}       — update status (read/dismissed)
  POST   /notifications/mark-all-read — mark all unread as read
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status

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
# List
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
    """List notifications with optional filters."""
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
# Count
# ---------------------------------------------------------------------------

@router.get("/count", response_model=NotificationCountResponse)
async def count_notifications(
    owner_user_id: Optional[str] = Query(None),
    scope_type: Optional[str] = Query(None),
    session=Depends(get_db),
):
    """Get unread and total notification counts."""
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
# Mark all read
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
    # Filter in Python (simple; entity columns not directly filterable in service yet)
    matched = [
        i for i in items
        if i.related_entity_type == entity_type and i.related_entity_id == entity_id
    ]
    return matched


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
