"""
Onboarding API router.

Endpoints:
  GET   /onboarding/status       — check if onboarding is required
  GET   /onboarding/requirements — check setup requirements against real data
  POST  /onboarding/complete     — mark onboarding as completed
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.onboarding import service
from app.onboarding.schemas import OnboardingStatusResponse, SetupRequirementsResponse

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.get("/status", response_model=OnboardingStatusResponse)
async def get_status(db: AsyncSession = Depends(get_db)):
    """Check whether onboarding/setup is required."""
    return await service.get_onboarding_status(db)


@router.get("/requirements", response_model=SetupRequirementsResponse)
async def get_requirements(db: AsyncSession = Depends(get_db)):
    """Check setup requirements against real domain data."""
    return await service.get_setup_requirements(db)


@router.post("/complete", response_model=OnboardingStatusResponse)
async def complete_onboarding(db: AsyncSession = Depends(get_db)):
    """Mark onboarding as completed."""
    return await service.mark_onboarding_completed(db)
