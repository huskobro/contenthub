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

Effective settings endpoints (M10-D):
  GET    /settings/effective             — all known settings with effective values
  GET    /settings/effective/{key}       — single setting effective state (explain)
  GET    /settings/groups                — group summary with counts
  PUT    /settings/effective/{key}       — update admin_value for a setting

Intentionally absent:
  DELETE, bulk operations, history, admin/user split surfaces.
"""

import json
import logging
from typing import Any, List, Optional

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
from app.settings.settings_resolver import (
    KNOWN_SETTINGS,
    explain as settings_explain,
    list_effective,
    list_groups,
)
from app.settings.settings_seed import seed_known_settings
from app.audit.service import write_audit_log

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


class EffectiveSettingResponse(BaseModel):
    key: str
    effective_value: Any = None
    source: str = "missing"
    type: str = "string"
    is_secret: bool = False
    group: str = "general"
    label: str = ""
    help_text: str = ""
    module_scope: Optional[str] = None
    wired: bool = False
    wired_to: str = ""
    builtin_default: Any = None
    env_var: str = ""
    has_admin_override: bool = False
    has_db_row: bool = False
    db_version: Optional[int] = None
    updated_at: Optional[str] = None


class GroupSummaryResponse(BaseModel):
    group: str
    label: str
    total: int
    wired: int
    secret: int
    missing: int


class SettingAdminValueRequest(BaseModel):
    value: Any


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

    await write_audit_log(
        db, action="credential.save",
        entity_type="credential", entity_id=key,
    )

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
# Effective settings endpoints (M10-D) — MUST be before /{setting_id}
# ---------------------------------------------------------------------------

@router.get("/effective", response_model=List[EffectiveSettingResponse])
async def list_effective_settings(
    group: Optional[str] = Query(None, description="Filter by group name"),
    wired_only: bool = Query(False, description="Only wired settings"),
    db: AsyncSession = Depends(get_db),
) -> List[EffectiveSettingResponse]:
    """Tum bilinen ayarlar icin effective deger ve kaynak bilgisi doner."""
    items = await list_effective(db, group=group, wired_only=wired_only)
    return [EffectiveSettingResponse(**item) for item in items]


@router.get("/groups", response_model=List[GroupSummaryResponse])
async def get_groups(
    db: AsyncSession = Depends(get_db),
) -> List[GroupSummaryResponse]:
    """Grup bazli ozet bilgi doner (toplam, wired, secret, missing sayilari)."""
    groups = await list_groups(db)
    return [GroupSummaryResponse(**g) for g in groups]


@router.get("/effective/{key}", response_model=EffectiveSettingResponse)
async def get_effective_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
) -> EffectiveSettingResponse:
    """Tek ayar icin tam effective durum raporu doner."""
    if key not in KNOWN_SETTINGS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bilinmeyen ayar key: {key}",
        )
    item = await settings_explain(key, db)
    return EffectiveSettingResponse(**item)


@router.put("/effective/{key}")
async def update_effective_setting(
    key: str,
    body: SettingAdminValueRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Ayarin admin_value degerini gunceller.

    Credential key'leri icin credential resolver'a yonlendirir.
    Diger key'ler icin settings tablosunda admin_value_json guncellenir.
    """
    if key not in KNOWN_SETTINGS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bilinmeyen ayar key: {key}",
        )

    # Credential key'leri icin credential resolver'a devret
    if key.startswith("credential."):
        if key not in CREDENTIAL_KEYS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Credential key credential_resolver'da tanimli degil: {key}",
            )
        result = await save_credential(key, str(body.value), db)
        # Provider reinit — best effort
        wiring_result = {"key": key, "action": "skipped", "provider_id": None}
        try:
            from app.settings.credential_wiring import reinitialize_provider_for_credential
            wiring_result = await reinitialize_provider_for_credential(key, str(body.value))
        except Exception as exc:
            logger.warning("Provider reinit basarisiz for %s: %s", key, exc)
        return {**result, "wiring": wiring_result}

    # Normal setting — admin_value_json guncelle
    from sqlalchemy import select as sa_select
    from app.db.models import Setting as SettingModel
    stmt = sa_select(SettingModel).where(SettingModel.key == key)
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()

    admin_json = json.dumps(body.value)

    if row is not None:
        row.admin_value_json = admin_json
        row.version = row.version + 1
    else:
        # Seed etmemis olabilir — yeni satir olustur
        meta = KNOWN_SETTINGS[key]
        builtin = meta.get("builtin_default")
        row = SettingModel(
            key=key,
            group_name=meta.get("group", "general"),
            type=meta.get("type", "string"),
            default_value_json=json.dumps(builtin) if builtin is not None else "null",
            admin_value_json=admin_json,
            user_override_allowed=False,
            visible_to_user=False,
            visible_in_wizard=False,
            read_only_for_user=True,
            module_scope=meta.get("module_scope"),
            help_text=meta.get("help_text", ""),
            validation_rules_json="{}",
            status="active",
        )
        db.add(row)

    await db.commit()
    await db.refresh(row)

    await write_audit_log(
        db, action="settings.effective.update",
        entity_type="setting", entity_id=key,
        details={"value": str(body.value)[:100]},
    )

    # Return updated effective state
    item = await settings_explain(key, db)
    return item


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
