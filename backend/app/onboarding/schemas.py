"""
Pydantic schemas for the Onboarding subsystem.

Shapes:
  - OnboardingStatusResponse: current onboarding status
  - OnboardingCompleteRequest: mark onboarding as completed
  - SetupRequirementItem: single requirement check result
  - SetupRequirementsResponse: all requirement checks
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class OnboardingStatusResponse(BaseModel):
    onboarding_required: bool
    completed_at: Optional[datetime] = None


class SetupRequirementItem(BaseModel):
    key: str
    title: str
    description: str
    status: str  # "completed" | "missing"
    detail: Optional[str] = None


class SetupRequirementsResponse(BaseModel):
    all_completed: bool
    requirements: List[SetupRequirementItem]
