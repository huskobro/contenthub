"""
Automation Policy + Operations Inbox router — Faz 13.

Phase AN-1: router-level ownership guard. Her endpoint `UserContext` alir
ve service katmanina `caller_ctx` olarak gecirir. Service icinde:
  - list'ler `apply_user_scope` ile owner_user_id == caller.user_id zorlar
    (non-admin icin); admin serbest.
  - single-resource GET/PATCH'ler `ensure_owner_or_admin` ile 403 firlatir.
  - create'te non-admin, payload'in owner_user_id'sini caller.user_id'ye
    sabitler (spoof engeli).
Auth zaten api/router.py'de `Depends(require_user)` ile mount edildigi icin
unauth cagrilar 401 doner.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import UserContext, get_current_user_context
from app.db.session import get_db
from app.automation import service
from app.automation.schemas import (
    AutomationPolicyCreate,
    AutomationPolicyUpdate,
    AutomationPolicyResponse,
    CheckpointDecision,
    InboxItemCreate,
    InboxItemUpdate,
    InboxItemResponse,
)

router = APIRouter(prefix="/automation-policies", tags=["Automation Policies"])


# ---------------------------------------------------------------------------
# AutomationPolicy endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=List[AutomationPolicyResponse])
async def list_automation_policies(
    channel_profile_id: Optional[str] = Query(None),
    owner_user_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_automation_policies(
        db, channel_profile_id=channel_profile_id,
        owner_user_id=owner_user_id, skip=skip, limit=limit,
        caller_ctx=ctx,
    )


@router.post(
    "", response_model=AutomationPolicyResponse, status_code=status.HTTP_201_CREATED
)
async def create_automation_policy(
    payload: AutomationPolicyCreate,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await service.create_automation_policy(db, payload, caller_ctx=ctx)
    except Exception as exc:
        if "UNIQUE" in str(exc).upper():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bu kanal profili icin zaten bir otomasyon politikasi mevcut.",
            )
        raise


@router.get("/by-channel/{channel_profile_id}", response_model=Optional[AutomationPolicyResponse])
async def get_policy_for_channel(
    channel_profile_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Get the automation policy for a specific channel profile."""
    result = await service.get_policy_for_channel(db, channel_profile_id, caller_ctx=ctx)
    if not result:
        raise HTTPException(status_code=404, detail="Bu kanal profili icin politika bulunamadi.")
    return result


@router.get("/{policy_id}", response_model=AutomationPolicyResponse)
async def get_automation_policy(
    policy_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_automation_policy(db, policy_id, caller_ctx=ctx)
    if not result:
        raise HTTPException(status_code=404, detail="Otomasyon politikasi bulunamadi.")
    return result


@router.patch("/{policy_id}", response_model=AutomationPolicyResponse)
async def update_automation_policy(
    policy_id: str,
    payload: AutomationPolicyUpdate,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    result = await service.update_automation_policy(db, policy_id, payload, caller_ctx=ctx)
    if not result:
        raise HTTPException(status_code=404, detail="Otomasyon politikasi bulunamadi.")
    return result


@router.get("/{policy_id}/evaluate", response_model=List[CheckpointDecision])
async def evaluate_policy_checkpoints(
    policy_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    """Evaluate all checkpoints for a policy — returns decisions, not executions."""
    policy = await service.get_automation_policy(db, policy_id, caller_ctx=ctx)
    if not policy:
        raise HTTPException(status_code=404, detail="Politika bulunamadi.")
    return service.evaluate_all_checkpoints(policy)


# ---------------------------------------------------------------------------
# Operations Inbox endpoints
# ---------------------------------------------------------------------------

inbox_router = APIRouter(prefix="/operations-inbox", tags=["Operations Inbox"])


@inbox_router.get("", response_model=List[InboxItemResponse])
async def list_inbox_items(
    owner_user_id: Optional[str] = Query(None),
    channel_profile_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    item_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_inbox_items(
        db, owner_user_id=owner_user_id,
        channel_profile_id=channel_profile_id,
        status=status, item_type=item_type,
        skip=skip, limit=limit,
        caller_ctx=ctx,
    )


@inbox_router.post(
    "", response_model=InboxItemResponse, status_code=status.HTTP_201_CREATED
)
async def create_inbox_item(
    payload: InboxItemCreate,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_inbox_item(db, payload, caller_ctx=ctx)


@inbox_router.get("/count", response_model=dict)
async def count_open_items(
    owner_user_id: Optional[str] = Query(None),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    count = await service.count_open_inbox_items(
        db, owner_user_id=owner_user_id, caller_ctx=ctx,
    )
    return {"count": count}


@inbox_router.get("/{item_id}", response_model=InboxItemResponse)
async def get_inbox_item(
    item_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_inbox_item(db, item_id, caller_ctx=ctx)
    if not result:
        raise HTTPException(status_code=404, detail="Inbox ogesi bulunamadi.")
    return result


@inbox_router.patch("/{item_id}", response_model=InboxItemResponse)
async def update_inbox_item(
    item_id: str,
    payload: InboxItemUpdate,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
):
    result = await service.update_inbox_item(db, item_id, payload, caller_ctx=ctx)
    if not result:
        raise HTTPException(status_code=404, detail="Inbox ogesi bulunamadi.")
    return result
