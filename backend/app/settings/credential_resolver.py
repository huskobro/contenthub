"""
Credential Resolver — M9-A.

Credential degerleri icin DB -> .env oncelik zinciri cozumlemesi.

Sorumluluklar:
  - resolve_credential  : DB admin_value_json -> .env -> None
  - get_credential_status : tek credential durum raporu
  - save_credential     : upsert credential into settings table
  - list_credential_statuses : tum bilinen credential durumlari

Credential'lar settings tablosunda group_name="credentials" ile saklanir.
admin_value_json alani JSON string olarak deger tutar (ornek: '"sk-abc123"').
"""

import json
import logging
import os
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Setting

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Bilinen credential tanimlari
# ---------------------------------------------------------------------------

CREDENTIAL_KEYS: dict[str, dict] = {
    "credential.kie_ai_api_key": {
        "env_var": "CONTENTHUB_KIE_AI_API_KEY",
        "label": "Kie.ai API Key",
        "help_text": "Kie.ai uzerinden Gemini LLM erisimi icin API anahtari.",
        "group": "ai_providers",
        "capability": "llm",
    },
    "credential.openai_api_key": {
        "env_var": "CONTENTHUB_OPENAI_API_KEY",
        "label": "OpenAI API Key",
        "help_text": "OpenAI uyumlu LLM fallback icin API anahtari. Bos birakilirsa fallback devre disi kalir.",
        "group": "ai_providers",
        "capability": "llm",
    },
    "credential.pexels_api_key": {
        "env_var": "CONTENTHUB_PEXELS_API_KEY",
        "label": "Pexels API Key",
        "help_text": "Pexels gorsel arama ve indirme API anahtari.",
        "group": "visual_providers",
        "capability": "visuals",
    },
    "credential.pixabay_api_key": {
        "env_var": "CONTENTHUB_PIXABAY_API_KEY",
        "label": "Pixabay API Key",
        "help_text": "Pixabay gorsel arama ve indirme API anahtari.",
        "group": "visual_providers",
        "capability": "visuals",
    },
    "credential.youtube_client_id": {
        "env_var": "",
        "label": "YouTube OAuth Client ID",
        "help_text": "Google API Console'dan alinan YouTube OAuth2 Client ID.",
        "group": "youtube",
        "capability": "youtube",
    },
    "credential.youtube_client_secret": {
        "env_var": "",
        "label": "YouTube OAuth Client Secret",
        "help_text": "Google API Console'dan alinan YouTube OAuth2 Client Secret.",
        "group": "youtube",
        "capability": "youtube",
    },
}


# ---------------------------------------------------------------------------
# Yardimci: maskeleme
# ---------------------------------------------------------------------------

def _mask_value(value: str) -> str:
    """Son 4 karakter gorunur, geri kalani maskelenir. 5'ten kisa ise tamami maskelenir."""
    if len(value) < 5:
        return "\u25cf" * len(value)
    return "\u25cf" * (len(value) - 4) + value[-4:]


def _parse_admin_value(raw: Optional[str]) -> Optional[str]:
    """admin_value_json alanindan credential string'ini cikarir."""
    if raw is None or raw in ("", "null"):
        return None
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None
    if isinstance(parsed, str) and parsed.strip():
        return parsed
    return None


def _env_value(key: str) -> Optional[str]:
    """Credential key icin .env/ortam degiskeninden deger okur."""
    meta = CREDENTIAL_KEYS.get(key)
    if not meta:
        return None
    env_var = meta.get("env_var", "")
    if not env_var:
        return None
    return os.environ.get(env_var) or None


# ---------------------------------------------------------------------------
# Resolver fonksiyonlari
# ---------------------------------------------------------------------------

async def resolve_credential(key: str, db: AsyncSession) -> Optional[str]:
    """
    Credential degerini cozer.

    Oncelik: DB admin_value_json -> .env -> None
    """
    # 1) DB'den oku
    result = await db.execute(select(Setting).where(Setting.key == key))
    row = result.scalar_one_or_none()
    if row is not None:
        db_val = _parse_admin_value(row.admin_value_json)
        if db_val is not None:
            return db_val

    # 2) .env / ortam degiskeni
    env_val = _env_value(key)
    if env_val:
        return env_val

    return None


async def get_credential_status(key: str, db: AsyncSession) -> dict:
    """
    Tek credential icin durum raporu doner.

    Donus:
      {key, status, source, masked_value, updated_at, label, help_text, group, capability}
    """
    meta = CREDENTIAL_KEYS.get(key, {})

    result = await db.execute(select(Setting).where(Setting.key == key))
    row = result.scalar_one_or_none()

    db_val = _parse_admin_value(row.admin_value_json) if row else None
    env_val = _env_value(key)

    if db_val:
        cred_status = "configured"
        source = "db"
        masked = _mask_value(db_val)
        updated_at = row.updated_at if row else None
    elif env_val:
        cred_status = "env_only"
        source = "env"
        masked = _mask_value(env_val)
        updated_at = None
    else:
        cred_status = "missing"
        source = "none"
        masked = None
        updated_at = None

    return {
        "key": key,
        "status": cred_status,
        "source": source,
        "masked_value": masked,
        "updated_at": updated_at.isoformat() if isinstance(updated_at, datetime) else updated_at,
        "label": meta.get("label", key),
        "help_text": meta.get("help_text", ""),
        "group": meta.get("group", ""),
        "capability": meta.get("capability", ""),
    }


_YOUTUBE_CLIENT_ID_SUFFIX = ".apps.googleusercontent.com"


def _normalize_credential_value(key: str, value: str) -> str:
    """
    Bilinen formatlama hatalarını temizler.

    credential.youtube_client_id: kullanıcı tam URL yapıştırırsa
    '.apps.googleusercontent.com' suffix'i otomatik kaldırılır.
    Örnek: '1234-abc.apps.googleusercontent.com' → '1234-abc'
    """
    if key == "credential.youtube_client_id":
        stripped = value.strip()
        if stripped.endswith(_YOUTUBE_CLIENT_ID_SUFFIX):
            stripped = stripped[: -len(_YOUTUBE_CLIENT_ID_SUFFIX)]
        return stripped
    return value.strip()


async def save_credential(key: str, value: str, db: AsyncSession) -> dict:
    """
    Credential degerini settings tablosuna upsert eder.

    group_name="credentials" ile kaydedilir.
    Donus: get_credential_status sonucu.
    """
    if key not in CREDENTIAL_KEYS:
        raise ValueError(f"Bilinmeyen credential key: {key}")

    value = _normalize_credential_value(key, value)

    meta = CREDENTIAL_KEYS[key]
    admin_json = json.dumps(value)  # '"sk-abc123"' seklinde JSON string

    result = await db.execute(select(Setting).where(Setting.key == key))
    row = result.scalar_one_or_none()

    if row is not None:
        row.admin_value_json = admin_json
        row.version = row.version + 1
    else:
        row = Setting(
            key=key,
            group_name="credentials",
            type="secret",
            default_value_json="null",
            admin_value_json=admin_json,
            user_override_allowed=False,
            visible_to_user=False,
            visible_in_wizard=False,
            read_only_for_user=True,
            module_scope=None,
            help_text=meta.get("help_text", ""),
            validation_rules_json="{}",
            status="active",
        )
        db.add(row)

    await db.commit()
    await db.refresh(row)

    return await get_credential_status(key, db)


async def list_credential_statuses(db: AsyncSession) -> list[dict]:
    """Tum bilinen credential key'leri icin durum listesi doner."""
    statuses = []
    for key in CREDENTIAL_KEYS:
        s = await get_credential_status(key, db)
        statuses.append(s)
    return statuses
