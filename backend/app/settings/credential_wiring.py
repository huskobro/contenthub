"""
Credential Wiring — M9-A / M10-B / Phase AI.

Credential kaydedildikten sonra ilgili provider'in yeniden baslatilmasi.

Her credential key icin dogru provider sinifini olusturur ve
provider_registry.replace_provider() ile mevcut provider'i degistirir.

Phase AI (silent truth fix):
  Provider factory'leri artik non-credential ayarlar icin `settings_resolver.resolve()`
  zincirini kullanir (DB admin_value -> DB default_value -> .env -> builtin).
  DB session verilmezse (ornegin startup'ta lifespan disindan cagrilirsa) builtin
  default'lara dusar — bu yalnizca legacy geri-uyumluluk icin.

  Onceki davranis: `_get_builtin` ile dogrudan KNOWN_SETTINGS okunuyordu, bu yuzden
  `/admin/settings`'ten kaydedilen `llm.model`, `llm.temperature`, `tts.voice_id`,
  visuals default_count gibi ayarlar runtime provider'lara asla ulasmiyordu —
  "kaydedildi ama uygulanmadi" yaniltici bildirim sinifi.

YouTube credential'lari provider reinit gerektirmez — sadece DB'de saklanir.
"""

import logging
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.providers.capability import ProviderCapability
from app.providers.registry import provider_registry
from app.settings.settings_resolver import KNOWN_SETTINGS, resolve as resolve_setting

logger = logging.getLogger(__name__)

# Credential key -> provider reinit bilgisi esleme tablosu
_CREDENTIAL_PROVIDER_MAP: dict[str, dict] = {
    "credential.kie_ai_api_key": {
        "capability": ProviderCapability.LLM,
        "provider_id": "kie_ai_gemini_flash",
        "factory": "_make_kie_ai_provider",
    },
    "credential.openai_api_key": {
        "capability": ProviderCapability.LLM,
        "provider_id_prefix": "openai_compat_",
        "factory": "_make_openai_compat_provider",
    },
    "credential.pexels_api_key": {
        "capability": ProviderCapability.VISUALS,
        "provider_id": "pexels",
        "factory": "_make_pexels_provider",
    },
    "credential.pixabay_api_key": {
        "capability": ProviderCapability.VISUALS,
        "provider_id": "pixabay",
        "factory": "_make_pixabay_provider",
    },
    # Faz 1 — DubVoice TTS primary
    "credential.dubvoice_api_key": {
        "capability": ProviderCapability.TTS,
        "provider_id": "dubvoice",
        "factory": "_make_dubvoice_provider",
        "register_as_primary": True,
        "register_priority": 0,
    },
}


# Placeholder key set — UI'dan kaydedilmesi anlamsiz degerleri reddederiz.
# Bu set HEM startup'ta (main.py) HEM de save-time wiring'de kullanilir.
PLACEHOLDER_CREDENTIAL_VALUES: frozenset[str] = frozenset({
    "abc",
    "sk-test-key-123",
    "placeholder",
    "",
})


class PlaceholderCredentialError(ValueError):
    """Kullanici placeholder degerini kaydetmeye calisti — sessizce dusurmek yerine
    UI'ya surekli dogru hata iletmek icin atilir."""


def is_placeholder_credential(value: Optional[str]) -> bool:
    """Verilen degerin placeholder/bos olup olmadigini dogru sekilde soyler."""
    if value is None:
        return True
    return value.strip() in PLACEHOLDER_CREDENTIAL_VALUES


# ---------------------------------------------------------------------------
# Provider factory fonksiyonlari
# ---------------------------------------------------------------------------

def _get_builtin(key: str, fallback: Any = None) -> Any:
    """KNOWN_SETTINGS'ten builtin_default degerini okur. Sadece DB yoksa fallback."""
    meta = KNOWN_SETTINGS.get(key)
    if meta is None:
        return fallback
    return meta.get("builtin_default", fallback)


async def _resolve_or_builtin(
    key: str,
    db: Optional[AsyncSession],
    fallback: Any = None,
) -> Any:
    """
    DB session varsa tam resolver zincirini kullanir, yoksa builtin'e duser.

    Zincir: DB admin_value -> DB default_value -> .env -> builtin -> fallback
    """
    if db is not None:
        try:
            value = await resolve_setting(key, db)
            if value is not None:
                return value
        except Exception as exc:  # pragma: no cover — defensive
            logger.warning("resolve() failed for %s, falling back to builtin: %s", key, exc)
    return _get_builtin(key, fallback)


async def _make_kie_ai_provider(api_key: str, db: Optional[AsyncSession] = None):
    from app.providers.llm.kie_ai_provider import KieAiProvider
    return KieAiProvider(
        api_key=api_key,
        model=await _resolve_or_builtin("provider.llm.kie_model", db),
        temperature=await _resolve_or_builtin("provider.llm.kie_temperature", db),
        timeout=await _resolve_or_builtin("provider.llm.timeout_seconds", db),
    )


async def _make_openai_compat_provider(api_key: str, db: Optional[AsyncSession] = None):
    from app.providers.llm.openai_compat_provider import OpenAICompatProvider
    model = await _resolve_or_builtin("provider.llm.openai_model", db, fallback="gpt-4o-mini")
    return OpenAICompatProvider(
        api_key=api_key,
        model=model,
        temperature=await _resolve_or_builtin("provider.llm.openai_temperature", db),
        timeout=await _resolve_or_builtin("provider.llm.timeout_seconds", db),
    )


async def _make_pexels_provider(api_key: str, db: Optional[AsyncSession] = None):
    from app.providers.visuals.pexels_provider import PexelsProvider
    return PexelsProvider(
        api_key=api_key,
        default_count=await _resolve_or_builtin("provider.visuals.pexels_default_count", db),
        search_timeout=await _resolve_or_builtin("provider.visuals.search_timeout_seconds", db),
    )


async def _make_pixabay_provider(api_key: str, db: Optional[AsyncSession] = None):
    from app.providers.visuals.pixabay_provider import PixabayProvider
    return PixabayProvider(
        api_key=api_key,
        default_count=await _resolve_or_builtin("provider.visuals.pixabay_default_count", db),
        search_timeout=await _resolve_or_builtin("provider.visuals.search_timeout_seconds", db),
    )


async def _make_dubvoice_provider(api_key: str, db: Optional[AsyncSession] = None):
    """Faz 1 — DubVoice primary TTS provider."""
    from app.providers.tts.dubvoice_provider import DubVoiceProvider

    return DubVoiceProvider(
        api_key=api_key,
        default_voice_id=await _resolve_or_builtin("tts.default_voice.tr", db),
        default_model_id=await _resolve_or_builtin("tts.dubvoice.default_model_id", db),
        poll_interval_s=await _resolve_or_builtin("tts.dubvoice.poll_interval_seconds", db),
        poll_timeout_s=await _resolve_or_builtin("tts.dubvoice.poll_timeout_seconds", db),
        http_timeout_s=await _resolve_or_builtin("tts.dubvoice.http_timeout_seconds", db),
    )


# Factory dispatch
_FACTORIES = {
    "_make_kie_ai_provider": _make_kie_ai_provider,
    "_make_openai_compat_provider": _make_openai_compat_provider,
    "_make_pexels_provider": _make_pexels_provider,
    "_make_pixabay_provider": _make_pixabay_provider,
    "_make_dubvoice_provider": _make_dubvoice_provider,
}


# ---------------------------------------------------------------------------
# Ana fonksiyon
# ---------------------------------------------------------------------------

async def reinitialize_provider_for_credential(
    key: str,
    value: str,
    db: Optional[AsyncSession] = None,
) -> dict:
    """
    Credential kaydedildikten sonra ilgili provider'i yeniden baslatir.

    Args:
        key   : Credential key (ornek: "credential.kie_ai_api_key")
        value : Yeni credential degeri
        db    : Opsiyonel DB session — verilirse provider ayarlari resolver ile
                okunur (DB admin_value -> .env -> builtin). Yoksa builtin'e duser.

    Returns:
        dict: {"key": ..., "action": "replaced"|"registered"|"skipped"|"no_provider", "provider_id": ...}
    """
    mapping = _CREDENTIAL_PROVIDER_MAP.get(key)
    if mapping is None:
        # YouTube credential'lari gibi — provider reinit gerektirmez
        logger.info("Credential %s icin provider reinit gerekmiyor.", key)
        return {"key": key, "action": "no_provider", "provider_id": None}

    # Boş veya placeholder key — provider baslatma, zincirine ekleme.
    # Not: write-path (router) artik placeholder degerini RED edip UI'ya hata
    # dondurur. Bu koruma hala yerinde — in-process cagrilar icin (tests, legacy).
    if is_placeholder_credential(value):
        logger.info(
            "Credential %s bos veya placeholder — provider atlaniyor.",
            key,
        )
        return {"key": key, "action": "skipped", "provider_id": None}

    capability = mapping["capability"]
    factory_name = mapping["factory"]
    factory_fn = _FACTORIES[factory_name]

    new_provider = await factory_fn(value.strip(), db=db)
    new_pid = new_provider.provider_id()

    # Mevcut provider'i degistir — once exact match, sonra prefix match
    # (model degistirilmis olabilir: openai_compat_gpt-4 → openai_compat_gpt-4o-mini)
    replaced = provider_registry.replace_provider(capability, new_pid, new_provider)

    if not replaced:
        # Prefix-based fallback: ayni ailenin (openai_compat_*) eski kaydini bul
        prefix = mapping.get("provider_id_prefix") or mapping.get("provider_id")
        if prefix:
            replaced = provider_registry.replace_provider_by_prefix(
                capability, prefix, new_provider,
            )

    if replaced:
        logger.info(
            "Provider degistirildi: capability=%s, provider_id=%s",
            capability.value,
            new_pid,
        )
        return {"key": key, "action": "replaced", "provider_id": new_pid}

    # Provider henuz kayitli degilse (ornegin openai key ilk kez giriliyor)
    # Yeni olarak kaydet. DubVoice icin register_as_primary=True — Faz 1.
    register_as_primary = bool(mapping.get("register_as_primary", False))
    register_priority = int(mapping.get("register_priority", 1))
    provider_registry.register(
        new_provider,
        capability,
        is_primary=register_as_primary,
        priority=register_priority,
    )
    logger.info(
        "Yeni provider kaydedildi: capability=%s, provider_id=%s, primary=%s",
        capability.value,
        new_pid,
        register_as_primary,
    )
    return {"key": key, "action": "registered", "provider_id": new_pid}
