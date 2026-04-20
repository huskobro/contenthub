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

M22-B additions:
  DELETE /settings/{setting_id}      — soft-delete (status → deleted)
  POST   /settings/bulk-update       — bulk admin_value update
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
from sqlalchemy import select

from app.auth.dependencies import require_admin
from app.db.models import Setting
from app.settings.settings_seed import (
    compute_drift_report,
    mark_orphan_settings,
    seed_known_settings,
)
from app.audit.service import write_audit_log
from app.visibility.dependencies import get_effective_role, get_active_user_id, require_visible
from app.settings.validation import validate_setting_value, SettingValidationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"], dependencies=[Depends(require_visible("panel:settings"))])


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
    # `wired` registry kontrati geregi her ayar icin daimi True;
    # alan eski API consumer'lari icin korunur.
    wired: bool = True
    wired_to: str = ""
    builtin_default: Any = None
    env_var: Optional[str] = ""
    has_admin_override: bool = False
    has_db_row: bool = False
    db_version: Optional[int] = None
    updated_at: Optional[str] = None
    # M40: user override and governance fields
    has_user_override: bool = False
    user_override_value: Any = None
    user_override_allowed: bool = False
    visible_to_user: bool = False
    read_only_for_user: bool = True
    visible_in_wizard: bool = False


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

@router.get(
    "/credentials",
    response_model=List[CredentialStatusResponse],
    dependencies=[Depends(require_admin)],
)
async def list_credentials(
    db: AsyncSession = Depends(get_db),
) -> List[CredentialStatusResponse]:
    """Tum bilinen credential key'leri icin durum listesi doner (admin-only)."""
    statuses = await list_credential_statuses(db)
    return [CredentialStatusResponse(**s) for s in statuses]


@router.get(
    "/credentials/{key}",
    response_model=CredentialStatusResponse,
    dependencies=[Depends(require_admin)],
)
async def get_credential(
    key: str,
    db: AsyncSession = Depends(get_db),
) -> CredentialStatusResponse:
    """Tek credential icin durum raporu doner (admin-only)."""
    if key not in CREDENTIAL_KEYS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bilinmeyen credential key: {key}",
        )
    s = await get_credential_status(key, db)
    return CredentialStatusResponse(**s)


@router.put(
    "/credentials/{key}",
    dependencies=[Depends(require_admin)],
)
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
    # Phase AI: db session threaded through so factories can use resolve() chain
    # (DB admin_value -> DB default -> .env -> builtin) instead of builtin-only.
    wiring_result = {"key": key, "action": "skipped", "provider_id": None}
    try:
        from app.settings.credential_wiring import reinitialize_provider_for_credential
        wiring_result = await reinitialize_provider_for_credential(key, body.value, db=db)
        logger.info("Provider reinit for %s: %s", key, wiring_result)
    except Exception as exc:
        logger.warning("Provider reinit basarisiz for %s: %s", key, exc)

    await write_audit_log(
        db, action="credential.save",
        entity_type="credential", entity_id=key,
    )

    return {**result, "wiring": wiring_result}


@router.post(
    "/credentials/{key}/validate",
    dependencies=[Depends(require_admin)],
)
async def validate_credential(
    key: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Credential icin KAYIT dogrulamasi yapar — provider'a CANLI istek atmaz.

    Phase AI — Onceden "Dogrula / Test Connection" butonu bu endpoint'i cagirip
    sadece DB/env'da bir deger olup olmadigina bakiyordu ama UI'ya "Valid"
    gosteriyordu. Bu yaniltici: kullanici bozuk/expired key'i valid saniyordu.

    Artik yanit explicit:
      - ``valid``        : credential kayitli ve bos degil
      - ``live_tested``  : her zaman False — provider'a gercek cagri yapilmadi
      - ``message``      : kullaniciya yalin dille "kayit dogrulandi / canli test yapilmadi"

    Canli provider ping'i ileriki bir Phase'de eklendiginde ``live_tested``
    True/False olarak dolu gelebilir; API sozlesmesi geriye donuk uyumlu kalir.
    """
    if key not in CREDENTIAL_KEYS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bilinmeyen credential key: {key}",
        )
    value = await resolve_credential(key, db)
    if value:
        return {
            "key": key,
            "valid": True,
            "live_tested": False,
            "message": (
                "Credential kayitli ve bos degil. Provider'a canli istek "
                "atilmadi — gercek dogrulama icin ilgili modulu kullanin."
            ),
        }
    return {
        "key": key,
        "valid": False,
        "live_tested": False,
        "message": "Credential degeri bulunamadi veya bos.",
    }


# ---------------------------------------------------------------------------
# Effective settings endpoints (M10-D) — MUST be before /{setting_id}
# ---------------------------------------------------------------------------

@router.get("/effective", response_model=List[EffectiveSettingResponse])
async def list_effective_settings(
    group: Optional[str] = Query(None, description="Filter by group name"),
    wired_only: bool = Query(False, description="(deprecated, no-op) eski client'lar icin korunur"),
    db: AsyncSession = Depends(get_db),
    role: str = Depends(get_effective_role),
    user_id: Optional[str] = Depends(get_active_user_id),
) -> List[EffectiveSettingResponse]:
    """Tum bilinen ayarlar icin effective deger ve kaynak bilgisi doner."""
    items = await list_effective(db, group=group, wired_only=wired_only, user_id=user_id)
    if role != "admin":
        # Filter out settings not visible to users — prevent leaking hidden settings
        visible_keys = {
            s.key
            for s in await service.list_settings(db, visible_to_user_only=True)
        }
        items = [item for item in items if item.get("key") in visible_keys]
    return [EffectiveSettingResponse(**item) for item in items]


@router.get("/groups", response_model=List[GroupSummaryResponse])
async def get_groups(
    db: AsyncSession = Depends(get_db),
) -> List[GroupSummaryResponse]:
    """Grup bazli ozet bilgi doner (toplam, wired, secret, missing sayilari)."""
    groups = await list_groups(db)
    return [GroupSummaryResponse(**g) for g in groups]


# ---------------------------------------------------------------------------
# Phase AM-4 — Drift report + one-shot repair (admin-only)
# ---------------------------------------------------------------------------


class DriftReport(BaseModel):
    """Seven-line Phase AL drift snapshot plus actionable key lists."""

    registry_total: int
    registry_visible: int
    db_total: int
    db_active_total: int
    db_visible_total: int
    orphan_count: int
    missing_count: int
    orphan_keys: List[str]
    missing_keys: List[str]
    visible_but_hidden_keys: List[str]


class DriftRepairResult(BaseModel):
    marked_orphan: int
    reactivated: int
    report: DriftReport


@router.get(
    "/drift",
    response_model=DriftReport,
    dependencies=[Depends(require_admin)],
)
async def get_drift_report(db: AsyncSession = Depends(get_db)) -> DriftReport:
    """Phase AM-4: live drift snapshot between KNOWN_SETTINGS and the DB.

    Admin-only. Purely read — never mutates rows. The same numbers are
    produced at startup; this endpoint is the in-product inspector so
    operators can verify the drift is closed after a deploy without
    tailing logs.
    """
    result = await db.execute(select(Setting))
    rows = list(result.scalars().all())
    return DriftReport(**compute_drift_report(rows))


@router.post(
    "/drift/repair",
    response_model=DriftRepairResult,
    dependencies=[Depends(require_admin)],
)
async def repair_drift(db: AsyncSession = Depends(get_db)) -> DriftRepairResult:
    """Phase AM-4: run ``mark_orphan_settings`` on demand.

    This is normally invoked automatically during startup; this endpoint is
    provided so operators can re-run the non-destructive repair after
    registry edits without bouncing the process. Admin-only.
    """
    counts = await mark_orphan_settings(db)
    result = await db.execute(select(Setting))
    rows = list(result.scalars().all())
    report = DriftReport(**compute_drift_report(rows))
    return DriftRepairResult(**counts, report=report)


@router.get("/effective/{key}", response_model=EffectiveSettingResponse)
async def get_effective_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Depends(get_active_user_id),
) -> EffectiveSettingResponse:
    """Tek ayar icin tam effective durum raporu doner."""
    if key not in KNOWN_SETTINGS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bilinmeyen ayar key: {key}",
        )
    item = await settings_explain(key, db, user_id=user_id)
    return EffectiveSettingResponse(**item)


@router.put("/effective/{key}")
async def update_effective_setting(
    key: str,
    body: SettingAdminValueRequest,
    db: AsyncSession = Depends(get_db),
    caller_role: str = Depends(get_effective_role),
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
        # Phase AI: db threaded so provider settings (model/temperature/voice_id)
        # actually reach the new provider instance.
        wiring_result = {"key": key, "action": "skipped", "provider_id": None}
        try:
            from app.settings.credential_wiring import reinitialize_provider_for_credential
            wiring_result = await reinitialize_provider_for_credential(key, str(body.value), db=db)
        except Exception as exc:
            logger.warning("Provider reinit basarisiz for %s: %s", key, exc)
        return {**result, "wiring": wiring_result}

    # Normal setting — admin_value_json guncelle
    from sqlalchemy import select as sa_select
    from app.db.models import Setting as SettingModel
    from app.settings.settings_resolver import KNOWN_VALIDATION_RULES
    stmt = sa_select(SettingModel).where(SettingModel.key == key)
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()

    # user_override_allowed enforcement
    if caller_role == "user" and row is not None and not row.user_override_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Bu ayar kullanici tarafindan degistirilemez: {key}",
        )

    meta = KNOWN_SETTINGS[key]
    setting_type = meta.get("type", "string")

    # Validation — once plaintext deger uzerinden kontrol.
    plaintext_json = json.dumps(body.value)
    rules_json = None
    if row is not None:
        rules_json = row.validation_rules_json
    else:
        rules_json = KNOWN_VALIDATION_RULES.get(key)
    if rules_json and rules_json != "{}":
        try:
            validate_setting_value(
                key=key,
                value_json=plaintext_json,
                rules_json=rules_json,
                setting_type=setting_type,
            )
        except SettingValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_UNPROCESSABLE_ENTITY,
                detail=exc.message,
            )

    # At-rest encryption — secret tipi non-credential ayarlar da SettingCipher
    # uzerinden sifrelenir (credential.* zaten save_credential'da sifrelenir).
    value_to_persist: Any = body.value
    if (
        setting_type == "secret"
        and isinstance(value_to_persist, str)
        and value_to_persist
    ):
        from app.core.crypto import get_setting_cipher
        value_to_persist = get_setting_cipher().encrypt(value_to_persist)
    admin_json = json.dumps(value_to_persist)

    if row is not None:
        row.admin_value_json = admin_json
        row.version = row.version + 1
    else:
        # Seed etmemis olabilir — yeni satir olustur
        builtin = meta.get("builtin_default")
        row = SettingModel(
            key=key,
            group_name=meta.get("group", "general"),
            type=setting_type,
            default_value_json=json.dumps(builtin) if builtin is not None else "null",
            admin_value_json=admin_json,
            user_override_allowed=False,
            visible_to_user=False,
            visible_in_wizard=False,
            read_only_for_user=True,
            module_scope=meta.get("module_scope"),
            help_text=meta.get("help_text", ""),
            validation_rules_json=KNOWN_VALIDATION_RULES.get(key, "{}"),
            status="active",
        )
        db.add(row)

    await db.commit()
    await db.refresh(row)

    # Audit log — secret tipli ayarlarda deger sizmasin, sadece maskeli ozet.
    if setting_type == "secret":
        audit_details = {"value": "\u25cf\u25cf\u25cf\u25cf (secret)"}
    else:
        audit_details = {"value": str(body.value)[:100]}
    await write_audit_log(
        db, action="settings.effective.update",
        entity_type="setting", entity_id=key,
        details=audit_details,
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
    role: str = Depends(get_effective_role),
) -> List[SettingResponse]:
    visible_to_user_only = role != "admin"
    rows = await service.list_settings(db, group_name=group_name, visible_to_user_only=visible_to_user_only)
    return [SettingResponse.model_validate(r) for r in rows]


@router.get("/{setting_id}", response_model=SettingResponse)
async def get_setting(
    setting_id: str,
    db: AsyncSession = Depends(get_db),
    role: str = Depends(get_effective_role),
) -> SettingResponse:
    row = await service.get_setting(db, setting_id)
    if role != "admin" and not row.visible_to_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This setting is not visible to users.",
        )
    return SettingResponse.model_validate(row)


@router.post(
    "",
    response_model=SettingResponse,
    status_code=201,
    dependencies=[Depends(require_admin)],
)
async def create_setting(
    payload: SettingCreate,
    db: AsyncSession = Depends(get_db),
) -> SettingResponse:
    """Yeni ayar kaydi olustur (admin-only)."""
    row = await service.create_setting(db, payload)
    return SettingResponse.model_validate(row)


@router.patch("/{setting_id}", response_model=SettingResponse)
async def update_setting(
    setting_id: str,
    payload: SettingUpdate,
    db: AsyncSession = Depends(get_db),
    caller_role: str = Depends(get_effective_role),
) -> SettingResponse:
    # user_override_allowed enforcement
    if caller_role == "user":
        existing = await service.get_setting(db, setting_id)
        if not existing.user_override_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu ayar kullanici tarafindan degistirilemez.",
            )
    row = await service.update_setting(db, setting_id, payload)
    return SettingResponse.model_validate(row)


@router.delete(
    "/{setting_id}",
    response_model=SettingResponse,
    dependencies=[Depends(require_admin)],
)
async def delete_setting(
    setting_id: str,
    db: AsyncSession = Depends(get_db),
) -> SettingResponse:
    """Soft-delete: status → deleted (admin-only). Ayar silinmez, devre disi birakilir."""
    row = await service.delete_setting(db, setting_id)
    return SettingResponse.model_validate(row)


@router.post(
    "/{setting_id}/restore",
    response_model=SettingResponse,
    dependencies=[Depends(require_admin)],
)
async def restore_setting(
    setting_id: str,
    db: AsyncSession = Depends(get_db),
) -> SettingResponse:
    """M23-D: Soft-delete edilmis ayari geri yukle (admin-only)."""
    row = await service.restore_setting(db, setting_id)
    return SettingResponse.model_validate(row)


@router.get(
    "/{setting_id}/history",
    dependencies=[Depends(require_admin)],
)
async def get_setting_history(
    setting_id: str,
    db: AsyncSession = Depends(get_db),
):
    """M23-D: Ayarin audit gecmisi (admin-only)."""
    return await service.get_setting_history(db, setting_id)


class BulkUpdateRequest(BaseModel):
    updates: List[dict]


@router.post(
    "/bulk-update",
    response_model=List[SettingResponse],
    dependencies=[Depends(require_admin)],
)
async def bulk_update_settings(
    body: BulkUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> List[SettingResponse]:
    """Toplu admin_value guncelleme (admin-only). Body: { "updates": [{"key": "...", "value": ...}] }"""
    rows = await service.bulk_update_admin_values(db, body.updates)
    return [SettingResponse.model_validate(r) for r in rows]
