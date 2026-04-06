"""
Wizard Configuration API router — M32.

Endpoints:
  GET    /wizard-configs                   — list all configs
  GET    /wizard-configs/by-type/{type}    — get active config by wizard_type (frontend)
  GET    /wizard-configs/{id}              — get by id
  POST   /wizard-configs                   — create new config
  PATCH  /wizard-configs/{id}              — partial update
  DELETE /wizard-configs/{id}              — soft-delete
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.wizard_configs import service
from app.wizard_configs.schemas import (
    WizardConfigCreate,
    WizardConfigUpdate,
    WizardConfigResponse,
    WizardStepConfig,
)
from app.wizard_configs.helpers import config_to_response

router = APIRouter(prefix="/wizard-configs", tags=["wizard-configs"])


@router.get("", response_model=List[WizardConfigResponse])
async def list_wizard_configs(
    module_scope: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    rows = await service.list_configs(db, module_scope=module_scope, status_filter=status)
    return [config_to_response(r) for r in rows]


@router.get("/by-type/{wizard_type}", response_model=Optional[WizardConfigResponse])
async def get_wizard_config_by_type(
    wizard_type: str,
    db: AsyncSession = Depends(get_db),
):
    """Frontend kullanimi — wizard_type'a gore aktif config doner. Yoksa null."""
    row = await service.get_by_wizard_type(db, wizard_type)
    if row is None:
        return None
    return config_to_response(row)


@router.get("/{config_id}", response_model=WizardConfigResponse)
async def get_wizard_config(
    config_id: str,
    db: AsyncSession = Depends(get_db),
):
    row = await service.get_config(db, config_id)
    return config_to_response(row)


@router.post("", response_model=WizardConfigResponse, status_code=201)
async def create_wizard_config(
    payload: WizardConfigCreate,
    db: AsyncSession = Depends(get_db),
):
    row = await service.create_config(db, payload)
    return config_to_response(row)


@router.patch("/{config_id}", response_model=WizardConfigResponse)
async def update_wizard_config(
    config_id: str,
    payload: WizardConfigUpdate,
    db: AsyncSession = Depends(get_db),
):
    row = await service.update_config(db, config_id, payload)
    return config_to_response(row)


@router.delete("/{config_id}", response_model=WizardConfigResponse)
async def delete_wizard_config(
    config_id: str,
    db: AsyncSession = Depends(get_db),
):
    row = await service.delete_config(db, config_id)
    return config_to_response(row)
