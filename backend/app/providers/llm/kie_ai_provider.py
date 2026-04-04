"""
kie.ai LLM Provider (M2-C2 / M3-C2)

kie.ai üzerinden Gemini 2.5 Flash modeline erişim sağlar.
kie.ai, OpenAI uyumlu API sunmaktadır; base_url değiştirilerek kullanılır.

HTTP çağrısı ve yanıt ayrıştırma _openai_compat_base.py üzerinden yapılır;
bu dosyada yalnızca kie.ai'ye özgü yapılandırma ve provider kimliği yer alır.

Referanslar:
- kie.ai API: https://kie.ai/api — OpenAI uyumlu /v1/chat/completions
- Model: gemini-2.5-flash

UYARI: Bu dosyaya API anahtarı GÖMÜLMEMELİDİR.
       Anahtarlar yalnızca app.core.config.settings üzerinden okunur.
"""

import logging

from app.providers.base import BaseProvider, ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.exceptions import ProviderInvokeError
from app.providers.llm._openai_compat_base import openai_compat_chat_completions

logger = logging.getLogger(__name__)

# kie.ai OpenAI uyumlu endpoint
_KIE_AI_BASE_URL = "https://kie.ai/api/v1"
_DEFAULT_MODEL = "gemini-2.5-flash"
_DEFAULT_TEMPERATURE = 0.7


class KieAiProvider(BaseProvider):
    """
    kie.ai üzerinden Gemini 2.5 Flash LLM provider'ı.

    kie.ai, OpenAI uyumlu API sunduğundan /v1/chat/completions endpoint'i
    kullanılır. HTTP çağrısı _openai_compat_base.py üzerinden yapılır.
    API anahtarı constructor üzerinden alınır — koda gömülmez.
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

    def capability(self) -> ProviderCapability:
        """Provider yeteneği."""
        return ProviderCapability.LLM

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

        icerik, bitis_nedeni, kullanim, gecikme_ms = await openai_compat_chat_completions(
            provider_id=self.provider_id(),
            base_url=_KIE_AI_BASE_URL,
            api_key=self._api_key,
            model=_DEFAULT_MODEL,
            messages=messages,
            temperature=temperature,
        )

        input_tokens = kullanim.get("prompt_tokens", 0)
        output_tokens = kullanim.get("completion_tokens", 0)

        # Maliyet tahmini seam (M3-C3) — Gemini 2.5 Flash yaklaşık fiyatı.
        # Gerçek fatura kie.ai dashboard'dan alınır; bu tahmin izleme amaçlıdır.
        # Fiyat: input $0.075 / 1M token, output $0.30 / 1M token (2026 yaklaşımı).
        cost_estimate_usd = round(
            (input_tokens * 0.075 + output_tokens * 0.30) / 1_000_000, 8
        )

        return ProviderOutput(
            result={
                "content": icerik,
                "finish_reason": bitis_nedeni,
            },
            trace={
                "provider_id": self.provider_id(),
                "model": _DEFAULT_MODEL,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "latency_ms": gecikme_ms,
                "cost_estimate_usd": cost_estimate_usd,
            },
            provider_id=self.provider_id(),
        )
