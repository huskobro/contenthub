from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from .schemas import TemplateCreate, TemplateResponse, TemplateUpdate
from . import service

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=List[TemplateResponse])
async def list_templates(
    template_type: Optional[str] = Query(None),
    owner_scope: Optional[str] = Query(None),
    module_scope: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_templates_with_style_link_summary(
        db,
        template_type=template_type,
        owner_scope=owner_scope,
        module_scope=module_scope,
        status=status,
    )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: str, db: AsyncSession = Depends(get_db)):
    template = await service.get_template(db, template_id)
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("", response_model=TemplateResponse, status_code=201)
async def create_template(payload: TemplateCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_template(db, payload)


@router.patch("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str, payload: TemplateUpdate, db: AsyncSession = Depends(get_db)
):
    template = await service.update_template(db, template_id, payload)
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return template
