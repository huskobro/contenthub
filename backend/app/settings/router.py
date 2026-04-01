"""
Settings Registry API router.

Endpoints (Phase 3 scope):
  GET    /settings              — list all settings (optional ?group_name= filter)
  GET    /settings/{setting_id} — fetch single setting by id
  POST   /settings              — create new setting
  PATCH  /settings/{setting_id} — partial update

Intentionally absent:
  DELETE, bulk operations, history, admin/user split surfaces.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.settings import service
from app.settings.schemas import SettingCreate, SettingResponse, SettingUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=List[SettingResponse])
async def list_settings(
    group_name: Optional[str] = Query(None, description="Filter by group_name"),
    db: AsyncSession = Depends(get_db),
) -> List[SettingResponse]:
    rows = await service.list_settings(db, group_name=group_name)
    return [SettingResponse.model_validate(r) for r in rows]


@router.get("/{setting_id}", response_model=SettingResponse)
async def get_setting(
    setting_id: str,
    db: AsyncSession = Depends(get_db),
) -> SettingResponse:
    row = await service.get_setting(db, setting_id)
    return SettingResponse.model_validate(row)


@router.post("", response_model=SettingResponse, status_code=201)
async def create_setting(
    payload: SettingCreate,
    db: AsyncSession = Depends(get_db),
) -> SettingResponse:
    row = await service.create_setting(db, payload)
    return SettingResponse.model_validate(row)


@router.patch("/{setting_id}", response_model=SettingResponse)
async def update_setting(
    setting_id: str,
    payload: SettingUpdate,
    db: AsyncSession = Depends(get_db),
) -> SettingResponse:
    row = await service.update_setting(db, setting_id, payload)
    return SettingResponse.model_validate(row)
