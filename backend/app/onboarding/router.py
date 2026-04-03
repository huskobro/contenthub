"""
Onboarding API router.

Endpoints:
  GET   /onboarding/status   — check if onboarding is required
  POST  /onboarding/complete — mark onboarding as completed
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.onboarding import service
from app.onboarding.schemas import OnboardingStatusResponse

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.get("/status", response_model=OnboardingStatusResponse)
async def get_status(db: AsyncSession = Depends(get_db)):
    """Check whether onboarding/setup is required."""
    return await service.get_onboarding_status(db)


@router.post("/complete", response_model=OnboardingStatusResponse)
async def complete_onboarding(db: AsyncSession = Depends(get_db)):
    """Mark onboarding as completed."""
    return await service.mark_onboarding_completed(db)
