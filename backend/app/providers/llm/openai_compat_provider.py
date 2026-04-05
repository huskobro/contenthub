"""
OpenAI Uyumlu Generic LLM Provider (M3-C2)

Herhangi bir OpenAI uyumlu API'ye bağlanır:
  - OpenAI (api.openai.com)
  - Groq (api.groq.com/openai)
  - Together AI
  - Ollama (http://localhost:11434/v1)
  - vb.

HTTP çağrısı ve yanıt ayrıştırma _openai_compat_base.py üzerinden yapılır;
bu dosyada yalnızca provider kimliği, yapılandırma ve BaseProvider arayüzü yer alır.

UYARI: API anahtarı koda GÖMÜLMEMELİDİR.
       Anahtarlar yalnızca app.core.config.settings üzerinden iletilir.

M3-C3 notu: Settings registry aktif olduğunda base_url ve model buradan
            yerine settings.provider_configs["openai_compat"] üzerinden gelebilir.
"""

import logging
from typing import Optional

from app.providers.base import BaseProvider, ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.exceptions import ProviderInvokeError
from app.providers.llm._openai_compat_base import openai_compat_chat_completions

logger = logging.getLogger(__name__)

_VARSAYILAN_MODEL = "gpt-4o-mini"
_VARSAYILAN_TEMPERATURE = 0.7


class OpenAICompatProvider(BaseProvider):
    """
    Parametrik OpenAI uyumlu LLM provider.

    Aynı base provider kodu farklı API'lere yönlendirilebilir;
    sadece base_url, api_key ve model parametreleri değişir.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        model: str = _VARSAYILAN_MODEL,
        temperature: Optional[float] = None,
        timeout: Optional[float] = None,
    ) -> None:
        """
        Args:
            api_key     : Bearer token. settings üzerinden iletilmeli.
            base_url    : API temel URL (sonunda / olmadan).
                          Varsayılan: OpenAI resmi endpoint'i.
            model       : Kullanılacak model adı.
                          Varsayılan: 'gpt-4o-mini'.
            temperature : Varsayılan sıcaklık. None ise _VARSAYILAN_TEMPERATURE kullanılır.
            timeout     : HTTP timeout süresi (saniye). None ise 60.0 kullanılır.
        """
        if not api_key:
            logger.warning(
                "OpenAICompatProvider [%s]: API anahtarı boş — gerçek çağrılar başarısız olacak.",
                model,
            )
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._temperature = temperature or _VARSAYILAN_TEMPERATURE
        self._timeout = timeout or 60.0

    def provider_id(self) -> str:
        """
        Provider'ın benzersiz kimliği.

        Format: 'openai_compat_{model}' — birden fazla model kaydına
        izin verir (örn: openai_compat_gpt-4o-mini, openai_compat_llama3).
        """
        return f"openai_compat_{self._model}"

    def capability(self) -> ProviderCapability:
        """Provider yeteneği."""
        return ProviderCapability.LLM

    async def invoke(self, input_data: dict) -> ProviderOutput:
        """
        OpenAI uyumlu API'yi çağırır.

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
                  - provider_id, model, base_url, input_tokens, output_tokens, latency_ms.

        Raises:
            ProviderInvokeError: API çağrısı başarısız olduğunda.
        """
        messages: list[dict] = list(input_data.get("messages", []))
        system_prompt: str | None = input_data.get("system_prompt")
        temperature: float = float(input_data.get("temperature", self._temperature))

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
            base_url=self._base_url,
            api_key=self._api_key,
            model=self._model,
            messages=messages,
            temperature=temperature,
            timeout=self._timeout,
        )

        return ProviderOutput(
            result={
                "content": icerik,
                "finish_reason": bitis_nedeni,
            },
            trace={
                "provider_id": self.provider_id(),
                "model": self._model,
                "base_url": self._base_url,
                "input_tokens": kullanim.get("prompt_tokens", 0),
                "output_tokens": kullanim.get("completion_tokens", 0),
                "latency_ms": gecikme_ms,
            },
            provider_id=self.provider_id(),
        )
