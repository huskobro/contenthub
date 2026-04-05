"""
Credential Wiring — M9-A / M10-B.

Credential kaydedildikten sonra ilgili provider'in yeniden baslatilmasi.

Her credential key icin dogru provider sinifini olusturur ve
provider_registry.replace_provider() ile mevcut provider'i degistirir.

M10-B: Provider factory'leri artik KNOWN_SETTINGS builtin default'larini
       kullanir. DB'den ayar okunamadigi durumlarda (credential wiring async
       degil, DB session yok) builtin default'lar fallback olarak kullanilir.

YouTube credential'lari provider reinit gerektirmez — sadece DB'de saklanir.
"""

import logging

from app.providers.capability import ProviderCapability
from app.providers.registry import provider_registry
from app.settings.settings_resolver import KNOWN_SETTINGS

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
        "provider_id": "openai_compat_gpt-4o-mini",
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
}


# ---------------------------------------------------------------------------
# Provider factory fonksiyonlari
# ---------------------------------------------------------------------------

def _get_builtin(key: str, fallback=None):
    """KNOWN_SETTINGS'ten builtin_default degerini okur."""
    meta = KNOWN_SETTINGS.get(key)
    if meta is None:
        return fallback
    return meta.get("builtin_default", fallback)


def _make_kie_ai_provider(api_key: str):
    from app.providers.llm.kie_ai_provider import KieAiProvider
    return KieAiProvider(
        api_key=api_key,
        model=_get_builtin("provider.llm.kie_model"),
        temperature=_get_builtin("provider.llm.kie_temperature"),
        timeout=_get_builtin("provider.llm.timeout_seconds"),
    )


def _make_openai_compat_provider(api_key: str):
    from app.providers.llm.openai_compat_provider import OpenAICompatProvider
    model = _get_builtin("provider.llm.openai_model", "gpt-4o-mini")
    return OpenAICompatProvider(
        api_key=api_key,
        model=model,
        temperature=_get_builtin("provider.llm.openai_temperature"),
        timeout=_get_builtin("provider.llm.timeout_seconds"),
    )


def _make_pexels_provider(api_key: str):
    from app.providers.visuals.pexels_provider import PexelsProvider
    return PexelsProvider(
        api_key=api_key,
        default_count=_get_builtin("provider.visuals.pexels_default_count"),
        search_timeout=_get_builtin("provider.visuals.search_timeout_seconds"),
    )


def _make_pixabay_provider(api_key: str):
    from app.providers.visuals.pixabay_provider import PixabayProvider
    return PixabayProvider(
        api_key=api_key,
        default_count=_get_builtin("provider.visuals.pixabay_default_count"),
        search_timeout=_get_builtin("provider.visuals.search_timeout_seconds"),
    )


# Factory dispatch
_FACTORIES = {
    "_make_kie_ai_provider": _make_kie_ai_provider,
    "_make_openai_compat_provider": _make_openai_compat_provider,
    "_make_pexels_provider": _make_pexels_provider,
    "_make_pixabay_provider": _make_pixabay_provider,
}


# ---------------------------------------------------------------------------
# Ana fonksiyon
# ---------------------------------------------------------------------------

async def reinitialize_provider_for_credential(key: str, value: str) -> dict:
    """
    Credential kaydedildikten sonra ilgili provider'i yeniden baslatir.

    Args:
        key   : Credential key (ornek: "credential.kie_ai_api_key")
        value : Yeni credential degeri

    Returns:
        dict: {"key": ..., "action": "replaced"|"registered"|"skipped"|"no_provider", "provider_id": ...}
    """
    mapping = _CREDENTIAL_PROVIDER_MAP.get(key)
    if mapping is None:
        # YouTube credential'lari gibi — provider reinit gerektirmez
        logger.info("Credential %s icin provider reinit gerekmiyor.", key)
        return {"key": key, "action": "no_provider", "provider_id": None}

    capability = mapping["capability"]
    provider_id = mapping["provider_id"]
    factory_name = mapping["factory"]
    factory_fn = _FACTORIES[factory_name]

    new_provider = factory_fn(value)

    # Mevcut provider'i degistir
    replaced = provider_registry.replace_provider(capability, provider_id, new_provider)

    if replaced:
        logger.info(
            "Provider degistirildi: capability=%s, provider_id=%s",
            capability.value,
            provider_id,
        )
        return {"key": key, "action": "replaced", "provider_id": provider_id}

    # Provider henuz kayitli degilse (ornegin openai key ilk kez giriliyor)
    # Yeni olarak kaydet
    provider_registry.register(
        new_provider,
        capability,
        is_primary=False,
        priority=1,
    )
    logger.info(
        "Yeni provider kaydedildi: capability=%s, provider_id=%s",
        capability.value,
        provider_id,
    )
    return {"key": key, "action": "registered", "provider_id": provider_id}
