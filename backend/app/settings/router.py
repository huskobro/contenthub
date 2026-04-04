"""
Settings Registry API router.

Endpoints (Phase 3 scope):
  GET    /settings              — list all settings (optional ?group_name= filter)
  GET    /settings/{setting_id} — fetch single setting by id
  POST   /settings              — create new setting
  PATCH  /settings/{setting_id} — partial update

Credential endpoints (M9-A):
  GET    /settings/credentials           — list all credential statuses
  GET    /settings/credentials/{key}     — single credential status
  PUT    /settings/credentials/{key}     — save credential value
  POST   /settings/credentials/{key}/validate — basic credential validation

Intentionally absent:
  DELETE, bulk operations, history, admin/user split surfaces.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.settings import service
from app.settings.schemas import SettingCreate, SettingResponse, SettingUpdate
from app.settings.credential_resolver import (
    CREDENTIAL_KEYS,
    get_credential_status,
    list_credential_statuses,
    resolve_credential,
    save_credential,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"])


# ---------------------------------------------------------------------------
# Credential request/response schemas (router-local)
# ---------------------------------------------------------------------------

class CredentialSaveRequest(BaseModel):
    value: str


class CredentialStatusResponse(BaseModel):
    key: str
    status: str
    source: str
    masked_value: Optional[str] = None
    updated_at: Optional[str] = None
    label: str = ""
    help_text: str = ""
    group: str = ""
    capability: str = ""


# ---------------------------------------------------------------------------
# Credential endpoints — MUST be before /{setting_id} to avoid path conflicts
# ---------------------------------------------------------------------------

@router.get("/credentials", response_model=List[CredentialStatusResponse])
async def list_credentials(
    db: AsyncSession = Depends(get_db),
) -> List[CredentialStatusResponse]:
    """Tum bilinen credential key'leri icin durum listesi doner."""
    statuses = await list_credential_statuses(db)
    return [CredentialStatusResponse(**s) for s in statuses]


@router.get("/credentials/{key}", response_model=CredentialStatusResponse)
async def get_credential(
    key: str,
    db: AsyncSession = Depends(get_db),
) -> CredentialStatusResponse:
    """Tek credential icin durum raporu doner."""
    if key not in CREDENTIAL_KEYS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bilinmeyen credential key: {key}",
        )
    s = await get_credential_status(key, db)
    return CredentialStatusResponse(**s)


@router.put("/credentials/{key}")
async def save_credential_endpoint(
    key: str,
    body: CredentialSaveRequest,
    db: AsyncSession = Depends(get_db),
):
    """Credential degerini DB'ye kaydeder ve ilgili provider'i yeniden baslatir."""
    if key not in CREDENTIAL_KEYS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bilinmeyen credential key: {key}",
        )
    try:
        result = await save_credential(key, body.value, db)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    # Provider reinit — best effort, hata olursa credential yine kaydedilmis olur
    wiring_result = {"key": key, "action": "skipped", "provider_id": None}
    try:
        from app.settings.credential_wiring import reinitialize_provider_for_credential
        wiring_result = await reinitialize_provider_for_credential(key, body.value)
        logger.info("Provider reinit for %s: %s", key, wiring_result)
    except Exception as exc:
        logger.warning("Provider reinit basarisiz for %s: %s", key, exc)

    return {**result, "wiring": wiring_result}


@router.post("/credentials/{key}/validate")
async def validate_credential(
    key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Credential degerinin var olup olmadigini kontrol eder (basic validation)."""
    if key not in CREDENTIAL_KEYS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bilinmeyen credential key: {key}",
        )
    value = await resolve_credential(key, db)
    if value:
        return {"key": key, "valid": True, "message": "Credential degeri mevcut."}
    return {"key": key, "valid": False, "message": "Credential degeri bulunamadi."}


# ---------------------------------------------------------------------------
# Existing settings CRUD endpoints
# ---------------------------------------------------------------------------

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
