"""
OpenAI Uyumlu LLM Provider Ortak Tabanı (M3-C2)

KieAiProvider ve OpenAICompatProvider arasında paylaşılan HTTP çağrısı ve
yanıt ayrıştırma mantığı. Her iki provider bu modülü kullanır, kod tekrarı
minimize edilir.

Bu dosya doğrudan örneklenmez — yalnızca provider sınıfları içe aktarır.

Sorumluluk:
  - OpenAI uyumlu /v1/chat/completions endpoint'ine HTTP POST gönderir.
  - Yanıtı ayrıştırır ve (icerik, bitis_nedeni, kullanim, gecikme_ms) döner.
  - Ağ hatalarını ProviderInvokeError'a dönüştürür.

Bu dosyada DEĞİL:
  - provider_id, capability, model seçimi (her provider kendi tanımlar)
  - API key doğrulama (provider sorumluluğu)
  - Retry/fallback mantığı (resolution.py sorumluluğu)
"""

import time
import logging
from typing import Optional

import httpx

from app.providers.exceptions import ProviderInvokeError

logger = logging.getLogger(__name__)

# Varsayılan timeout — override için invoke parametresi kullanılabilir
_VARSAYILAN_TIMEOUT = 60.0


async def openai_compat_chat_completions(
    *,
    provider_id: str,
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict],
    temperature: float,
    timeout: Optional[float] = None,
) -> tuple[str, str, dict, int]:
    """
    OpenAI uyumlu /v1/chat/completions endpoint'ini çağırır.

    Args:
        provider_id : Hata mesajlarında kullanılacak provider kimliği.
        base_url    : API temel URL (sonunda / olmadan), örn: "https://api.openai.com/v1"
        api_key     : Bearer token.
        model       : Model adı, örn: "gpt-4o-mini".
        messages    : OpenAI formatı mesaj listesi.
        temperature : Yanıt sıcaklığı (0.0–2.0).

    Returns:
        Tuple: (icerik, bitis_nedeni, kullanim_sozlugu, gecikme_ms)
            - icerik       : Model yanıt metni.
            - bitis_nedeni : API'den dönen finish_reason.
            - kullanim     : Token kullanım sözlüğü (prompt_tokens, completion_tokens).
            - gecikme_ms   : Ağ gecikmesi milisaniye cinsinden.

    Raises:
        ProviderInvokeError: Ağ hatası, HTTP 4xx/5xx veya ayrıştırma hatası.
    """
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    baslangic = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=timeout or _VARSAYILAN_TIMEOUT) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                json=payload,
                headers=headers,
            )
    except httpx.TimeoutException as hata:
        raise ProviderInvokeError(
            provider_id,
            f"İstek zaman aşımına uğradı: {hata}",
        ) from hata
    except httpx.ConnectError as hata:
        raise ProviderInvokeError(
            provider_id,
            f"Bağlantı hatası: {hata}",
        ) from hata
    except httpx.RequestError as hata:
        raise ProviderInvokeError(
            provider_id,
            f"Ağ hatası: {hata}",
        ) from hata

    gecikme_ms = int((time.monotonic() - baslangic) * 1000)

    if response.status_code != 200:
        raise ProviderInvokeError(
            provider_id,
            f"HTTP {response.status_code}: {response.text[:500]}",
        )

    try:
        veri = response.json()
    except Exception as hata:
        raise ProviderInvokeError(
            provider_id,
            f"JSON ayrıştırma hatası: {hata}",
        ) from hata

    try:
        secim = veri["choices"][0]
        icerik: str = secim["message"]["content"]
        bitis_nedeni: str = secim.get("finish_reason", "unknown")
    except (KeyError, IndexError) as hata:
        raise ProviderInvokeError(
            provider_id,
            f"Beklenmedik API yanıt yapısı: {hata}. Yanıt: {veri}",
        ) from hata

    kullanim = veri.get("usage", {})

    return icerik, bitis_nedeni, kullanim, gecikme_ms
