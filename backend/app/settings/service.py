"""
Settings Registry service layer.

Business logic lives here; routers call these functions and pass
the AsyncSession in. No direct SQLAlchemy imports leak into routers.

Supported operations (Phase 3 scope):
  - list_settings    : all settings, optional group_name filter
  - get_setting      : single setting by id
  - create_setting   : insert new setting; raises 409 on duplicate key
  - update_setting   : partial update by id; raises 404 if missing

Intentionally deferred:
  - delete
  - user override resolution
  - visibility resolution
  - caching
  - audit log enrichment
  - bulk operations
"""

from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Setting
from app.settings.schemas import SettingCreate, SettingUpdate


async def list_settings(
    db: AsyncSession,
    group_name: Optional[str] = None,
) -> List[Setting]:
    stmt = select(Setting).order_by(Setting.group_name, Setting.key)
    if group_name is not None:
        stmt = stmt.where(Setting.group_name == group_name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_setting(db: AsyncSession, setting_id: str) -> Setting:
    result = await db.execute(select(Setting).where(Setting.id == setting_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{setting_id}' not found.",
        )
    return row


async def create_setting(db: AsyncSession, payload: SettingCreate) -> Setting:
    row = Setting(**payload.model_dump())
    db.add(row)
    try:
        await db.commit()
        await db.refresh(row)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A setting with key '{payload.key}' already exists.",
        )
    return row


async def update_setting(
    db: AsyncSession,
    setting_id: str,
    payload: SettingUpdate,
) -> Setting:
    row = await get_setting(db, setting_id)
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return row
    for field, value in changes.items():
        setattr(row, field, value)
    # Bump version on each update so callers can detect change
    row.version = row.version + 1
    await db.commit()
    await db.refresh(row)
    return row
