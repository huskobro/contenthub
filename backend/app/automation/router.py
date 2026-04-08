"""
Automation Policy router — Faz 2.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.automation import service
from app.automation.schemas import (
    AutomationPolicyCreate,
    AutomationPolicyUpdate,
    AutomationPolicyResponse,
)

router = APIRouter(prefix="/automation-policies", tags=["Automation Policies"])


@router.get("", response_model=List[AutomationPolicyResponse])
async def list_automation_policies(
    channel_profile_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_automation_policies(
        db, channel_profile_id=channel_profile_id, skip=skip, limit=limit
    )


@router.post(
    "", response_model=AutomationPolicyResponse, status_code=status.HTTP_201_CREATED
)
async def create_automation_policy(
    payload: AutomationPolicyCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await service.create_automation_policy(db, payload)
    except Exception as exc:
        if "UNIQUE" in str(exc).upper():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bu kanal profili icin zaten bir otomasyon politikasi mevcut.",
            )
        raise


@router.get("/{policy_id}", response_model=AutomationPolicyResponse)
async def get_automation_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_automation_policy(db, policy_id)
    if not result:
        raise HTTPException(status_code=404, detail="Otomasyon politikasi bulunamadi.")
    return result


@router.patch("/{policy_id}", response_model=AutomationPolicyResponse)
async def update_automation_policy(
    policy_id: str,
    payload: AutomationPolicyUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await service.update_automation_policy(db, policy_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Otomasyon politikasi bulunamadi.")
    return result
