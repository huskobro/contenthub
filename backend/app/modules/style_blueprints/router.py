from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from .schemas import StyleBlueprintCreate, StyleBlueprintUpdate, StyleBlueprintResponse
from . import service

router = APIRouter(prefix="/style-blueprints", tags=["style-blueprints"])


@router.get("", response_model=List[StyleBlueprintResponse])
async def list_blueprints(
    module_scope: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_style_blueprints(db, module_scope=module_scope, status=status)


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
    return await service.create_style_blueprint(db, payload)


@router.patch("/{blueprint_id}", response_model=StyleBlueprintResponse)
async def update_blueprint(
    blueprint_id: str,
    payload: StyleBlueprintUpdate,
    db: AsyncSession = Depends(get_db),
):
    blueprint = await service.update_style_blueprint(db, blueprint_id, payload)
    if blueprint is None:
        raise HTTPException(status_code=404, detail="Style blueprint not found")
    return blueprint
