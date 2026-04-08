"""
Brand Profile schemas — Faz 2.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class BrandProfileCreate(BaseModel):
    owner_user_id: str = Field(..., min_length=1, max_length=36)
    brand_name: str = Field(..., min_length=1, max_length=255)
    palette: Optional[str] = None
    typography: Optional[str] = None
    motion_style: Optional[str] = Field(None, max_length=100)
    logo_path: Optional[str] = None
    watermark_path: Optional[str] = None
    watermark_position: Optional[str] = Field(None, max_length=50)
    intro_template_id: Optional[str] = Field(None, max_length=36)
    outro_template_id: Optional[str] = Field(None, max_length=36)
    lower_third_defaults: Optional[str] = None


class BrandProfileUpdate(BaseModel):
    brand_name: Optional[str] = Field(None, min_length=1, max_length=255)
    palette: Optional[str] = None
    typography: Optional[str] = None
    motion_style: Optional[str] = Field(None, max_length=100)
    logo_path: Optional[str] = None
    watermark_path: Optional[str] = None
    watermark_position: Optional[str] = Field(None, max_length=50)
    intro_template_id: Optional[str] = Field(None, max_length=36)
    outro_template_id: Optional[str] = Field(None, max_length=36)
    lower_third_defaults: Optional[str] = None


class BrandProfileResponse(BaseModel):
    id: str
    owner_user_id: str
    brand_name: str
    palette: Optional[str] = None
    typography: Optional[str] = None
    motion_style: Optional[str] = None
    logo_path: Optional[str] = None
    watermark_path: Optional[str] = None
    watermark_position: Optional[str] = None
    intro_template_id: Optional[str] = None
    outro_template_id: Optional[str] = None
    lower_third_defaults: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
