from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.audit.service import write_audit_log
from app.visibility.dependencies import require_visible
from .schemas import StyleBlueprintCreate, StyleBlueprintUpdate, StyleBlueprintResponse
from . import service

router = APIRouter(prefix="/style-blueprints", tags=["style-blueprints"], dependencies=[Depends(require_visible("panel:style-blueprints"))])


@router.get("", response_model=List[StyleBlueprintResponse])
async def list_blueprints(
    module_scope: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Blueprint adında arama (case-insensitive)"),
    include_test_data: bool = Query(False, description="Test/demo kayıtlarını dahil et (varsayılan: False)"),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_style_blueprints(db, module_scope=module_scope, status=status, search=search, include_test_data=include_test_data)


@router.get("/{blueprint_id}", response_model=StyleBlueprintResponse)
async def get_blueprint(blueprint_id: str, db: AsyncSession = Depends(get_db)):
    blueprint = await service.get_style_blueprint(db, blueprint_id)
    if blueprint is None:
        raise HTTPException(status_code=404, detail="Style blueprint not found")
    return blueprint


@router.post("", response_model=StyleBlueprintResponse, status_code=201)
async def create_blueprint(
    payload: StyleBlueprintCreate, db: AsyncSession = Depends(get_db)
):
    result = await service.create_style_blueprint(db, payload)
    await write_audit_log(db, action="style_blueprint.create", entity_type="style_blueprint", entity_id=str(result.id))
    return result


@router.patch("/{blueprint_id}", response_model=StyleBlueprintResponse)
async def update_blueprint(
    blueprint_id: str,
    payload: StyleBlueprintUpdate,
    db: AsyncSession = Depends(get_db),
):
    blueprint = await service.update_style_blueprint(db, blueprint_id, payload)
    if blueprint is None:
        raise HTTPException(status_code=404, detail="Style blueprint not found")
    await write_audit_log(db, action="style_blueprint.update", entity_type="style_blueprint", entity_id=blueprint_id)
    return blueprint
