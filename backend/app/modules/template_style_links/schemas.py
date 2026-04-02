from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TemplateStyleLinkCreate(BaseModel):
    template_id: str
    style_blueprint_id: str
    link_role: Optional[str] = None
    status: Optional[str] = "active"
    notes: Optional[str] = None


class TemplateStyleLinkUpdate(BaseModel):
    link_role: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class TemplateStyleLinkResponse(BaseModel):
    id: str
    template_id: str
    style_blueprint_id: str
    link_role: Optional[str]
    status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
