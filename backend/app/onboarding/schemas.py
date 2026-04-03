"""
Pydantic schemas for the Onboarding subsystem.

Shapes:
  - OnboardingStatusResponse: current onboarding status
  - OnboardingCompleteRequest: mark onboarding as completed
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class OnboardingStatusResponse(BaseModel):
    onboarding_required: bool
    completed_at: Optional[datetime] = None
