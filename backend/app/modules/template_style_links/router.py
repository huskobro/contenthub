from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.visibility.dependencies import require_visible
from .schemas import (
    TemplateStyleLinkCreate,
    TemplateStyleLinkUpdate,
    TemplateStyleLinkResponse,
)
from . import service

router = APIRouter(prefix="/template-style-links", tags=["template-style-links"], dependencies=[Depends(require_visible("panel:template-style-links"))])


@router.get("", response_model=List[TemplateStyleLinkResponse])
async def list_template_style_links(
    template_id: Optional[str] = None,
    style_blueprint_id: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    return await service.list_template_style_links(
        db,
        template_id=template_id,
        style_blueprint_id=style_blueprint_id,
        status=status,
    )


@router.get("/{link_id}", response_model=TemplateStyleLinkResponse)
async def get_template_style_link(link_id: str, db: AsyncSession = Depends(get_db)):
    link = await service.get_template_style_link(db, link_id)
    if link is None:
        raise HTTPException(status_code=404, detail="Template style link not found")
    return link


@router.post("", response_model=TemplateStyleLinkResponse, status_code=201)
async def create_template_style_link(
    payload: TemplateStyleLinkCreate, db: AsyncSession = Depends(get_db)
):
    try:
        return await service.create_template_style_link(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="A link between this template and style blueprint already exists",
        )


@router.patch("/{link_id}", response_model=TemplateStyleLinkResponse)
async def update_template_style_link(
    link_id: str,
    payload: TemplateStyleLinkUpdate,
    db: AsyncSession = Depends(get_db),
):
    link = await service.update_template_style_link(db, link_id, payload)
    if link is None:
        raise HTTPException(status_code=404, detail="Template style link not found")
    return link
