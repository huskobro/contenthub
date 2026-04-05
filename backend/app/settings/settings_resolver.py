"""
Settings Resolver — M10.

Merkezi ayar cozumleme katmani. Tum runtime bilesenler ayar degerlerini
bu modul uzerinden okur.

Oncelik zinciri:
  1. DB admin_value_json (yonetici tarafindan girilmis deger)
  2. DB default_value_json (tanimda belirtilmis varsayilan)
  3. .env / ortam degiskeni (varsa)
  4. KNOWN_SETTINGS builtin default (kod icinde tanimlanmis son cayir)

Sorumluluklar:
  - resolve(key) -> effective value (typed)
  - explain(key) -> effective value + source + metadata
  - resolve_group(group) -> grup icerigindeki tum ayarlar
  - list_effective() -> tum bilinen ayarlar, effective deger ve kaynak ile
  - Credential resolver'i tamamlar ama ikame etmez.
    Credential'lar icin mevcut credential_resolver kullanilmaya devam eder.

Tasarim:
  - Read-only servis. Yazma islemi settings service ve credential resolver'da.
  - KNOWN_SETTINGS registry'si tum bilinen ayarlarin master tanimini tutar.
  - Bilinmeyen key icin None doner, hata firlatmaz.
  - Secret tipi icin maskeleme bilgisi explain'de verilir.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Setting

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Type coercion
# ---------------------------------------------------------------------------

def _coerce(raw: Any, expected_type: str) -> Any:
    """Deterministic type coercion. Gecersiz deger icin None doner."""
    if raw is None:
        return None
    try:
        if expected_type == "string":
            return str(raw)
        elif expected_type == "secret":
            return str(raw)
        elif expected_type == "boolean":
            if isinstance(raw, bool):
                return raw
            if isinstance(raw, str):
                return raw.lower() in ("true", "1", "yes", "on")
            return bool(raw)
        elif expected_type == "integer":
            return int(float(raw))
        elif expected_type == "float":
            return float(raw)
        elif expected_type == "json":
            if isinstance(raw, (dict, list)):
                return raw
            if isinstance(raw, str):
                return json.loads(raw)
            return raw
        else:
            return raw
    except (ValueError, TypeError, json.JSONDecodeError) as e:
        logger.warning("Type coercion failed for type=%s, value=%r: %s", expected_type, raw, e)
        return None


def _parse_json_field(raw: Optional[str]) -> Any:
    """JSON-encoded DB field'dan Python degerini cikarir."""
    if raw is None or raw in ("", "null"):
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None


def _mask_value(value: str) -> str:
    """Son 4 karakter gorunur, geri kalan maskelenir."""
    if len(value) < 5:
        return "\u25cf" * len(value)
    return "\u25cf" * (len(value) - 4) + value[-4:]


# ---------------------------------------------------------------------------
# Known Settings Registry — master definition of all settings
# ---------------------------------------------------------------------------

KNOWN_SETTINGS: Dict[str, Dict[str, Any]] = {
    # --- Credentials (delegated to credential_resolver for write, but listed here) ---
    "credential.kie_ai_api_key": {
        "group": "credentials",
        "type": "secret",
        "label": "Kie.ai API Key",
        "help_text": "Kie.ai uzerinden Gemini LLM erisimi icin API anahtari.",
        "module_scope": None,
        "env_var": "CONTENTHUB_KIE_AI_API_KEY",
        "builtin_default": None,
        "wired": True,
        "wired_to": "LLM provider (KieAiProvider) — startup + runtime reinit",
    },
    "credential.openai_api_key": {
        "group": "credentials",
        "type": "secret",
        "label": "OpenAI API Key",
        "help_text": "OpenAI uyumlu LLM fallback icin API anahtari.",
        "module_scope": None,
        "env_var": "CONTENTHUB_OPENAI_API_KEY",
        "builtin_default": None,
        "wired": True,
        "wired_to": "LLM fallback provider (OpenAICompatProvider) — startup + runtime reinit",
    },
    "credential.pexels_api_key": {
        "group": "credentials",
        "type": "secret",
        "label": "Pexels API Key",
        "help_text": "Pexels gorsel arama API anahtari.",
        "module_scope": None,
        "env_var": "CONTENTHUB_PEXELS_API_KEY",
        "builtin_default": None,
        "wired": True,
        "wired_to": "Visuals provider (PexelsProvider) — startup + runtime reinit",
    },
    "credential.pixabay_api_key": {
        "group": "credentials",
        "type": "secret",
        "label": "Pixabay API Key",
        "help_text": "Pixabay gorsel arama API anahtari.",
        "module_scope": None,
        "env_var": "CONTENTHUB_PIXABAY_API_KEY",
        "builtin_default": None,
        "wired": True,
        "wired_to": "Visuals fallback provider (PixabayProvider) — startup + runtime reinit",
    },
    "credential.youtube_client_id": {
        "group": "credentials",
        "type": "secret",
        "label": "YouTube OAuth Client ID",
        "help_text": "Google API Console'dan alinan YouTube OAuth2 Client ID.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": None,
        "wired": True,
        "wired_to": "YouTube OAuth auth-url + token exchange",
    },
    "credential.youtube_client_secret": {
        "group": "credentials",
        "type": "secret",
        "label": "YouTube OAuth Client Secret",
        "help_text": "Google API Console'dan alinan YouTube OAuth2 Client Secret.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": None,
        "wired": True,
        "wired_to": "YouTube OAuth token exchange",
    },

    # --- Provider Settings ---
    # NOT: Asagidaki provider ayarlari tanimlanmis ve UI'da gorunur.
    # "wired: True" olan ayarlar gercekten resolve() ile runtime'da okunuyor.
    # "wired: False" olanlar tanimlanmis ama provider kodu henuz bu degeri
    # settings resolver'dan okumuyor — kendi hardcoded default'larini kullaniyor.
    # Bu durum durustce "DEFINED" olarak isaretlenmistir.
    "provider.llm.kie_model": {
        "group": "providers",
        "type": "string",
        "label": "Kie.ai LLM Model",
        "help_text": "Kie.ai uzerinden kullanilacak LLM model adi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": "gemini-2.5-flash",
        "wired": True,
        "wired_to": "KieAiProvider constructor — startup + credential reinit",
    },
    "provider.llm.kie_temperature": {
        "group": "providers",
        "type": "float",
        "label": "Kie.ai LLM Temperature",
        "help_text": "LLM yaraticilik seviyesi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 0.7,
        "wired": True,
        "wired_to": "KieAiProvider constructor — startup + credential reinit",
    },
    "provider.llm.openai_model": {
        "group": "providers",
        "type": "string",
        "label": "OpenAI Fallback Model",
        "help_text": "OpenAI uyumlu fallback icin model adi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": "gpt-4o-mini",
        "wired": True,
        "wired_to": "main.py startup + credential_wiring factory — resolve() ile okunuyor",
    },
    "provider.llm.openai_temperature": {
        "group": "providers",
        "type": "float",
        "label": "OpenAI Fallback Temperature",
        "help_text": "OpenAI fallback LLM yaraticilik seviyesi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 0.7,
        "wired": True,
        "wired_to": "OpenAICompatProvider constructor — startup + credential reinit",
    },
    "provider.llm.timeout_seconds": {
        "group": "providers",
        "type": "float",
        "label": "LLM HTTP Timeout (saniye)",
        "help_text": "LLM API cagrilarinda HTTP timeout suresi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 60.0,
        "wired": True,
        "wired_to": "_openai_compat_base timeout — startup + credential reinit",
    },
    "provider.tts.edge_default_voice": {
        "group": "providers",
        "type": "string",
        "label": "Edge TTS Varsayilan Ses",
        "help_text": "Edge TTS icin varsayilan ses profili.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "tr-TR-AhmetNeural",
        "wired": True,
        "wired_to": "EdgeTTSProvider constructor — startup",
    },
    "provider.visuals.pexels_default_count": {
        "group": "providers",
        "type": "integer",
        "label": "Pexels Varsayilan Gorsel Sayisi",
        "help_text": "Pexels aramasinda varsayilan sonuc sayisi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 5,
        "wired": True,
        "wired_to": "PexelsProvider constructor — startup + credential reinit",
    },
    "provider.visuals.pixabay_default_count": {
        "group": "providers",
        "type": "integer",
        "label": "Pixabay Varsayilan Gorsel Sayisi",
        "help_text": "Pixabay aramasinda varsayilan sonuc sayisi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 5,
        "wired": True,
        "wired_to": "PixabayProvider constructor — startup + credential reinit",
    },
    "provider.visuals.search_timeout_seconds": {
        "group": "providers",
        "type": "float",
        "label": "Gorsel Arama Timeout (saniye)",
        "help_text": "Gorsel provider HTTP arama timeout suresi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 30.0,
        "wired": True,
        "wired_to": "Pexels/Pixabay provider constructor — startup + credential reinit",
    },
    "provider.whisper.model_size": {
        "group": "providers",
        "type": "string",
        "label": "Whisper Model Boyutu",
        "help_text": "Yerel Whisper transkripsiyon model boyutu.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "base",
        "wired": True,
        "wired_to": "LocalWhisperProvider constructor — main.py startup",
    },

    # --- Execution Settings ---
    "execution.render_still_timeout_seconds": {
        "group": "execution",
        "type": "integer",
        "label": "Render Still Timeout (saniye)",
        "help_text": "Remotion still frame render isleminde maksimum bekleme suresi.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": 120,
        "wired": True,
        "wired_to": "RenderStillExecutor._resolve_timeout() — runtime lazy resolve",
    },

    # --- Source Scan Settings ---
    "source_scans.soft_dedupe_threshold": {
        "group": "source_scans",
        "type": "float",
        "label": "Soft Dedupe Esigi",
        "help_text": "Baslik benzerlik esigi (0.0-1.0). scan_engine → dedupe_service soft_threshold olarak kullanilir.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": 0.65,
        "wired": True,
        "wired_to": "scan_engine.execute_rss_scan → build_dedupe_context(soft_threshold=...)",
    },

    # --- YouTube / Publish Settings ---
    "publish.youtube.upload_timeout_seconds": {
        "group": "publish",
        "type": "float",
        "label": "YouTube Upload Timeout (saniye)",
        "help_text": "YouTube video yukleme isleminde HTTP timeout suresi.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": 60.0,
        "wired": True,
        "wired_to": "YouTubeAdapter constructor (upload_timeout) — main.py startup",
    },
    "publish.youtube.default_category_id": {
        "group": "publish",
        "type": "string",
        "label": "YouTube Varsayilan Kategori ID",
        "help_text": "Payload'da category_id yoksa kullanilacak YouTube kategori ID'si. 22=People & Blogs, 24=Entertainment, 25=News & Politics, 27=Education, 28=Science & Technology.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": "22",
        "wired": True,
        "wired_to": "YouTubeAdapter.upload() — payload'da category_id yoksa settings'ten okunur",
    },
    "publish.youtube.default_description": {
        "group": "publish",
        "type": "string",
        "label": "YouTube Varsayilan Aciklama",
        "help_text": "Payload'da description yoksa kullanilacak varsayilan video aciklamasi.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": "",
        "wired": True,
        "wired_to": "YouTubeAdapter.upload() — payload'da description yoksa settings'ten okunur",
    },
    "publish.youtube.default_tags": {
        "group": "publish",
        "type": "string",
        "label": "YouTube Varsayilan Etiketler (virgul ayirmali)",
        "help_text": "Payload'da tags yoksa kullanilacak varsayilan etiketler. Virgul ile ayirilmis liste.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": "",
        "wired": True,
        "wired_to": "YouTubeAdapter.upload() — payload'da tags yoksa settings'ten okunur",
    },
}

# Group labels for UI
GROUP_LABELS: Dict[str, str] = {
    "credentials": "Kimlik Bilgileri",
    "providers": "Provider Ayarlari",
    "execution": "Calisma Ortami",
    "source_scans": "Kaynak Tarama",
    "publish": "Yayin Ayarlari",
}

GROUP_ORDER = ["credentials", "providers", "execution", "source_scans", "publish"]


# ---------------------------------------------------------------------------
# Resolver functions
# ---------------------------------------------------------------------------

async def resolve(key: str, db: AsyncSession) -> Any:
    """
    Ayar degerini cozer.

    Oncelik: DB admin_value -> DB default_value -> .env -> builtin_default -> None
    Deger KNOWN_SETTINGS'te tanimli type'a gore coerce edilir.
    """
    meta = KNOWN_SETTINGS.get(key)
    expected_type = meta["type"] if meta else "string"

    # 1) DB admin_value_json
    result = await db.execute(select(Setting).where(Setting.key == key))
    row = result.scalar_one_or_none()
    if row is not None:
        admin_val = _parse_json_field(row.admin_value_json)
        if admin_val is not None:
            coerced = _coerce(admin_val, expected_type)
            if coerced is not None:
                return coerced

    # 2) DB default_value_json
    if row is not None:
        default_val = _parse_json_field(row.default_value_json)
        if default_val is not None:
            coerced = _coerce(default_val, expected_type)
            if coerced is not None:
                return coerced

    # 3) .env / ortam degiskeni
    if meta and meta.get("env_var"):
        env_val = os.environ.get(meta["env_var"])
        if env_val:
            coerced = _coerce(env_val, expected_type)
            if coerced is not None:
                return coerced

    # 4) builtin default
    if meta and meta.get("builtin_default") is not None:
        return meta["builtin_default"]

    return None


async def explain(key: str, db: AsyncSession) -> Dict[str, Any]:
    """
    Ayar icin tam aciklama doner.

    Effective value + source + metadata + validation durumu.
    """
    meta = KNOWN_SETTINGS.get(key, {})
    expected_type = meta.get("type", "string")
    is_secret = expected_type == "secret"

    result = await db.execute(select(Setting).where(Setting.key == key))
    row = result.scalar_one_or_none()

    # Determine effective value and source
    effective_value = None
    source = "missing"

    # 1) admin_value
    if row is not None:
        admin_val = _parse_json_field(row.admin_value_json)
        if admin_val is not None:
            coerced = _coerce(admin_val, expected_type)
            if coerced is not None:
                effective_value = coerced
                source = "admin"

    # 2) default_value
    if effective_value is None and row is not None:
        default_val = _parse_json_field(row.default_value_json)
        if default_val is not None:
            coerced = _coerce(default_val, expected_type)
            if coerced is not None:
                effective_value = coerced
                source = "default"

    # 3) .env
    if effective_value is None and meta.get("env_var"):
        env_val = os.environ.get(meta["env_var"])
        if env_val:
            coerced = _coerce(env_val, expected_type)
            if coerced is not None:
                effective_value = coerced
                source = "env"

    # 4) builtin
    if effective_value is None and meta.get("builtin_default") is not None:
        effective_value = meta["builtin_default"]
        source = "builtin"

    # Display value — mask secrets
    display_value = effective_value
    if is_secret and isinstance(effective_value, str) and effective_value:
        display_value = _mask_value(effective_value)

    return {
        "key": key,
        "effective_value": display_value,
        "effective_value_raw": effective_value if not is_secret else None,
        "source": source,
        "type": expected_type,
        "is_secret": is_secret,
        "group": meta.get("group", "general"),
        "label": meta.get("label", key),
        "help_text": meta.get("help_text", ""),
        "module_scope": meta.get("module_scope"),
        "wired": meta.get("wired", False),
        "wired_to": meta.get("wired_to", ""),
        "builtin_default": meta.get("builtin_default"),
        "env_var": meta.get("env_var", ""),
        "has_admin_override": row is not None and _parse_json_field(row.admin_value_json) is not None,
        "has_db_row": row is not None,
        "db_version": row.version if row else None,
        "updated_at": row.updated_at.isoformat() if row and row.updated_at else None,
    }


async def resolve_group(group: str, db: AsyncSession) -> Dict[str, Any]:
    """Bir gruptaki tum bilinen ayarlarin effective degerlerini doner."""
    results = {}
    for key, meta in KNOWN_SETTINGS.items():
        if meta.get("group") == group:
            results[key] = await resolve(key, db)
    return results


async def list_effective(db: AsyncSession, group: Optional[str] = None,
                         wired_only: bool = False) -> List[Dict[str, Any]]:
    """Tum bilinen ayarlar icin explain listesi doner."""
    items = []
    for key, meta in KNOWN_SETTINGS.items():
        if group and meta.get("group") != group:
            continue
        if wired_only and not meta.get("wired", False):
            continue
        explanation = await explain(key, db)
        items.append(explanation)
    return items


async def list_groups(db: AsyncSession) -> List[Dict[str, Any]]:
    """Grup bazli ozet bilgi doner."""
    groups = {}
    for key, meta in KNOWN_SETTINGS.items():
        g = meta.get("group", "general")
        if g not in groups:
            groups[g] = {"group": g, "label": GROUP_LABELS.get(g, g),
                         "total": 0, "wired": 0, "secret": 0, "missing": 0}
        groups[g]["total"] += 1
        if meta.get("wired"):
            groups[g]["wired"] += 1
        if meta.get("type") == "secret":
            groups[g]["secret"] += 1

    # Resolve missing counts
    for key, meta in KNOWN_SETTINGS.items():
        g = meta.get("group", "general")
        result = await db.execute(select(Setting).where(Setting.key == key))
        row = result.scalar_one_or_none()
        admin_val = _parse_json_field(row.admin_value_json) if row else None
        env_val = os.environ.get(meta.get("env_var", "")) if meta.get("env_var") else None
        builtin = meta.get("builtin_default")
        if admin_val is None and env_val is None and builtin is None:
            groups[g]["missing"] += 1

    ordered = []
    for g in GROUP_ORDER:
        if g in groups:
            ordered.append(groups[g])
    # Add any unlisted groups
    for g, data in groups.items():
        if g not in GROUP_ORDER:
            ordered.append(data)
    return ordered


async def resolve_for_runtime(key: str, db: AsyncSession) -> Any:
    """
    Runtime bilesenler icin kisayol. Credential key'leri icin
    credential_resolver'a devreder.
    """
    if key.startswith("credential."):
        from app.settings.credential_resolver import resolve_credential
        return await resolve_credential(key, db)
    return await resolve(key, db)
