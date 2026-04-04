"""
kie.ai LLM Provider (M2-C2)

kie.ai üzerinden Gemini 2.5 Flash modeline erişim sağlar.
kie.ai, OpenAI uyumlu API sunmaktadır; base_url değiştirilerek kullanılır.

Referanslar:
- kie.ai API: https://kie.ai/api — OpenAI uyumlu /v1/chat/completions
- Model: gemini-2.5-flash

UYARI: Bu dosyaya API anahtarı GÖMÜLMEMELİDİR.
       Anahtarlar yalnızca app.core.config.settings üzerinden okunur.
"""

import time
import logging

import httpx

from app.providers.base import BaseProvider, ProviderOutput
from app.providers.exceptions import ProviderInvokeError

logger = logging.getLogger(__name__)

# kie.ai OpenAI uyumlu endpoint
_KIE_AI_BASE_URL = "https://kie.ai/api/v1"
_DEFAULT_MODEL = "gemini-2.5-flash"
_DEFAULT_TEMPERATURE = 0.7


class KieAiProvider(BaseProvider):
    """
    kie.ai üzerinden Gemini 2.5 Flash LLM provider'ı.

    kie.ai, OpenAI uyumlu API sunduğundan /v1/chat/completions endpoint'i
    kullanılır. API anahtarı constructor üzerinden alınır — koda gömülmez.
    """

    def __init__(self, api_key: str) -> None:
        """
        Args:
            api_key: kie.ai API anahtarı. app.core.config.settings üzerinden
                     iletilmeli, koda gömülmemelidir.
        """
        if not api_key:
            logger.warning("KieAiProvider: API anahtarı boş — gerçek çağrılar başarısız olacak.")
        self._api_key = api_key

    def provider_id(self) -> str:
        """Provider'ın benzersiz kimliği."""
        return "kie_ai_gemini_flash"

    def capability(self) -> str:
        """Provider yeteneği."""
        return "llm"

    async def invoke(self, input_data: dict) -> ProviderOutput:
        """
        kie.ai Gemini 2.5 Flash modelini çağırır.

        Args:
            input_data: Şu alanları destekler:
                - messages (list[dict]): OpenAI formatı mesaj listesi. Zorunlu.
                - system_prompt (str, opsiyonel): Sistem mesajı olarak eklenir.
                - temperature (float, opsiyonel): Yanıt sıcaklığı. Varsayılan: 0.7.

        Returns:
            ProviderOutput:
                result içerir:
                  - content (str): Model yanıtı.
                  - finish_reason (str): Bitme nedeni.
                trace içerir:
                  - provider_id, model, input_tokens, output_tokens, latency_ms.

        Raises:
            ProviderInvokeError: API çağrısı başarısız olduğunda.
        """
        messages: list[dict] = list(input_data.get("messages", []))
        system_prompt: str | None = input_data.get("system_prompt")
        temperature: float = float(input_data.get("temperature", _DEFAULT_TEMPERATURE))

        if not messages and not system_prompt:
            raise ProviderInvokeError(
                self.provider_id(),
                "Girdi verisi 'messages' veya 'system_prompt' alanlarından en az birini içermelidir.",
            )

        # Sistem mesajını listenin başına ekle
        if system_prompt:
            messages = [{"role": "system", "content": system_prompt}] + messages

        payload = {
            "model": _DEFAULT_MODEL,
            "messages": messages,
            "temperature": temperature,
        }

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        baslangic = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{_KIE_AI_BASE_URL}/chat/completions",
                    json=payload,
                    headers=headers,
                )
        except httpx.RequestError as hata:
            raise ProviderInvokeError(
                self.provider_id(),
                f"Ağ hatası: {hata}",
            ) from hata

        gecikme_ms = int((time.monotonic() - baslangic) * 1000)

        if response.status_code != 200:
            raise ProviderInvokeError(
                self.provider_id(),
                f"HTTP {response.status_code}: {response.text[:500]}",
            )

        try:
            veri = response.json()
        except Exception as hata:
            raise ProviderInvokeError(
                self.provider_id(),
                f"JSON ayrıştırma hatası: {hata}",
            ) from hata

        try:
            secim = veri["choices"][0]
            icerik: str = secim["message"]["content"]
            bitis_nedeni: str = secim.get("finish_reason", "unknown")
        except (KeyError, IndexError) as hata:
            raise ProviderInvokeError(
                self.provider_id(),
                f"Beklenmedik API yanıt yapısı: {hata}. Yanıt: {veri}",
            ) from hata

        kullanim = veri.get("usage", {})

        return ProviderOutput(
            result={
                "content": icerik,
                "finish_reason": bitis_nedeni,
            },
            trace={
                "provider_id": self.provider_id(),
                "model": _DEFAULT_MODEL,
                "input_tokens": kullanim.get("prompt_tokens", 0),
                "output_tokens": kullanim.get("completion_tokens", 0),
                "latency_ms": gecikme_ms,
            },
            provider_id=self.provider_id(),
        )
