"""
Pydantic schemas for Wizard Configuration — M32.

Three shapes:
  - WizardConfigCreate  : fields required/allowed when creating
  - WizardConfigUpdate  : all fields optional for partial PATCH
  - WizardConfigResponse: full representation returned to callers

steps_config_json structure:
  [
    {
      "step_key": "source",
      "label": "Kaynak & Haber",
      "order": 0,
      "enabled": true,
      "fields": [
        {
          "field_key": "topic",
          "label": "Konu",
          "field_type": "text",
          "required": true,
          "visible": true,
          "admin_hideable": true,
          "auto_suggest": false,
          "preview_enabled": false,
          "default_value": null,
          "options": null,
          "help_text": null
        }
      ]
    }
  ]
"""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class WizardStepFieldConfig(BaseModel):
    """Tek bir wizard alaninin yapilandirmasi."""

    field_key: str = Field(..., min_length=1, max_length=100)
    label: str = Field(..., min_length=1, max_length=200)
    field_type: str = Field("text", max_length=50)  # text, textarea, select, number, blueprint_selector, template_selector, subtitle_style, composition_direction, thumbnail_direction, lower_third_style, trust_level
    required: bool = False
    visible: bool = True
    admin_hideable: bool = True
    auto_suggest: bool = False
    preview_enabled: bool = False
    default_value: Any = None
    options: Optional[list] = None  # for select fields
    help_text: Optional[str] = None
    writes_to_backend: bool = True
    affects_snapshot: bool = True
    affects_pipeline: bool = True


class WizardStepConfig(BaseModel):
    """Tek bir wizard adiminin yapilandirmasi."""

    step_key: str = Field(..., min_length=1, max_length=50)
    label: str = Field(..., min_length=1, max_length=200)
    order: int = Field(0, ge=0)
    enabled: bool = True
    fields: list[WizardStepFieldConfig] = []


class WizardConfigCreate(BaseModel):
    wizard_type: str = Field(..., min_length=1, max_length=100)
    display_name: str = Field(..., min_length=1, max_length=200)
    enabled: bool = True
    steps_config: list[WizardStepConfig] = []
    field_defaults: Optional[dict] = None
    module_scope: Optional[str] = Field(None, max_length=100)
    status: str = Field("active", max_length=50)
    notes: Optional[str] = None


class WizardConfigUpdate(BaseModel):
    """All fields optional — PATCH semantics."""

    display_name: Optional[str] = Field(None, min_length=1, max_length=200)
    enabled: Optional[bool] = None
    steps_config: Optional[list[WizardStepConfig]] = None
    field_defaults: Optional[dict] = None
    module_scope: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None


class WizardConfigResponse(BaseModel):
    id: str
    wizard_type: str
    display_name: str
    enabled: bool
    steps_config: list[WizardStepConfig]
    field_defaults: Optional[dict]
    module_scope: Optional[str]
    status: str
    version: int
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
