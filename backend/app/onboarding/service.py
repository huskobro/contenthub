"""
Onboarding service — reads/writes onboarding state from the app_state table.

Uses the existing AppState key-value store with key "onboarding_completed".
"""

import json
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import AppState

ONBOARDING_KEY = "onboarding_completed"


async def get_onboarding_status(db: AsyncSession) -> dict:
    """Return onboarding status: whether setup is required and when it was completed."""
    stmt = select(AppState).where(AppState.key == ONBOARDING_KEY)
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()

    if row is None:
        return {"onboarding_required": True, "completed_at": None}

    try:
        data = json.loads(row.value_json)
    except (json.JSONDecodeError, TypeError):
        return {"onboarding_required": True, "completed_at": None}

    if data.get("completed") is True:
        return {
            "onboarding_required": False,
            "completed_at": data.get("completed_at"),
        }

    return {"onboarding_required": True, "completed_at": None}


async def mark_onboarding_completed(db: AsyncSession) -> dict:
    """Mark onboarding as completed by writing to app_state."""
    now = datetime.now(timezone.utc).isoformat()
    value = json.dumps({"completed": True, "completed_at": now})

    stmt = select(AppState).where(AppState.key == ONBOARDING_KEY)
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()

    if row is None:
        row = AppState(key=ONBOARDING_KEY, value_json=value)
        db.add(row)
    else:
        row.value_json = value

    await db.commit()
    await db.refresh(row)

    return {"onboarding_required": False, "completed_at": now}
