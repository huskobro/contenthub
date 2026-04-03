"""
Onboarding service — reads/writes onboarding state from the app_state table.

Uses the existing AppState key-value store with key "onboarding_completed".
Also provides setup requirements checks against real domain data.
"""

import json
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import AppState, NewsSource, Template, Setting

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


async def get_setup_requirements(db: AsyncSession) -> dict:
    """Check real setup requirements against domain data."""
    requirements = []

    # 1. Sources: at least one active news source
    source_count_stmt = select(func.count()).select_from(NewsSource).where(NewsSource.status == "active")
    source_result = await db.execute(source_count_stmt)
    source_count = source_result.scalar() or 0
    requirements.append({
        "key": "sources",
        "title": "Haber Kaynagi Ekle",
        "description": "Icerik uretimi icin en az bir aktif haber kaynagi tanimlayin.",
        "status": "completed" if source_count > 0 else "missing",
        "detail": f"{source_count} aktif kaynak" if source_count > 0 else None,
    })

    # 2. Templates: at least one active template
    template_count_stmt = select(func.count()).select_from(Template).where(Template.status == "active")
    template_result = await db.execute(template_count_stmt)
    template_count = template_result.scalar() or 0
    requirements.append({
        "key": "templates",
        "title": "Sablon Olustur",
        "description": "Icerik uretimi icin en az bir aktif sablon tanimlayin.",
        "status": "completed" if template_count > 0 else "missing",
        "detail": f"{template_count} aktif sablon" if template_count > 0 else None,
    })

    # 3. System settings: at least one setting with a configured admin value
    setting_count_stmt = (
        select(func.count())
        .select_from(Setting)
        .where(Setting.status == "active")
        .where(Setting.admin_value_json != "null")
    )
    setting_result = await db.execute(setting_count_stmt)
    setting_count = setting_result.scalar() or 0
    requirements.append({
        "key": "settings",
        "title": "Sistem Ayarlari",
        "description": "Temel calisma ayarlarini yapilandirin.",
        "status": "completed" if setting_count > 0 else "missing",
        "detail": f"{setting_count} yapilandirilmis ayar" if setting_count > 0 else None,
    })

    all_completed = all(r["status"] == "completed" for r in requirements)

    return {
        "all_completed": all_completed,
        "requirements": requirements,
    }
