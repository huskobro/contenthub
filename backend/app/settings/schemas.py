"""
Pydantic schemas for the Settings Registry.

Three shapes:
  - SettingCreate  : fields required/allowed when creating a new setting
  - SettingUpdate  : all fields optional for partial PATCH
  - SettingResponse: full representation returned to callers

Guvenlik notu: ``SettingResponse`` icinde ``type == "secret"`` olan satirlar
icin ``admin_value_json`` ve ``default_value_json`` maskelenir. Boylece API
yaniti ne ciphertext'i ne de plaintext'i sizdirir — sadece ``"***"`` sentinel
doner. Effective/plaintext okumak icin ``GET /settings/effective/{key}``
kullanilmalidir; orada secret degerler zaten son 4 karakter maskeli gosterilir.
"""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field, model_validator


# Secret tipi satirlar icin API yanitinda kullanilan sentinel JSON string.
# Plaintext degeri effective endpoint zaten maskeli donuyor — CRUD endpoint
# ciphertext/plaintext hicbirini sizdirmaz.
_SECRET_SENTINEL_JSON = "\"\u25cf\u25cf\u25cf\u25cf (secret)\""


class SettingCreate(BaseModel):
    key: str = Field(..., min_length=1, max_length=255)
    group_name: str = Field("general", max_length=100)
    type: str = Field("string", max_length=50)
    default_value_json: str = Field("null")
    admin_value_json: str = Field("null")
    user_override_allowed: bool = False
    visible_to_user: bool = False
    visible_in_wizard: bool = False
    read_only_for_user: bool = True
    module_scope: Optional[str] = Field(None, max_length=100)
    help_text: Optional[str] = None
    validation_rules_json: str = Field("{}")
    status: str = Field("active", max_length=50)


class SettingUpdate(BaseModel):
    """All fields optional — PATCH semantics."""

    group_name: Optional[str] = Field(None, max_length=100)
    type: Optional[str] = Field(None, max_length=50)
    default_value_json: Optional[str] = None
    admin_value_json: Optional[str] = None
    user_override_allowed: Optional[bool] = None
    visible_to_user: Optional[bool] = None
    visible_in_wizard: Optional[bool] = None
    read_only_for_user: Optional[bool] = None
    module_scope: Optional[str] = Field(None, max_length=100)
    help_text: Optional[str] = None
    validation_rules_json: Optional[str] = None
    status: Optional[str] = Field(None, max_length=50)


class SettingResponse(BaseModel):
    id: str
    key: str
    group_name: str
    type: str
    default_value_json: str
    admin_value_json: str
    user_override_allowed: bool
    visible_to_user: bool
    visible_in_wizard: bool
    read_only_for_user: bool
    module_scope: Optional[str]
    help_text: Optional[str]
    validation_rules_json: str
    status: str
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def _mask_secret_fields(self) -> "SettingResponse":
        """
        Secret tipi satirlar icin admin_value_json ve default_value_json
        alanlarini sabit sentinel ile degistirir. Ciphertext'in ham haliyle
        client'a gitmesini engeller; plaintext de sizmaz.
        """
        if self.type == "secret":
            if self.admin_value_json and self.admin_value_json != "null":
                self.admin_value_json = _SECRET_SENTINEL_JSON
            if self.default_value_json and self.default_value_json != "null":
                self.default_value_json = _SECRET_SENTINEL_JSON
        return self
