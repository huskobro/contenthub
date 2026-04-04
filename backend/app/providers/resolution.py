"""
Provider çözümleme ve invoke yardımcısı (M3-C1 / M3-C2 / M3-C3).

Registry üzerinden capability çözümler, invoke eder ve trace'i zenginleştirir.
Primary başarısızsa fallback zincirini dener.

Sorumluluk sınırı:
  - Bu dosya: invoke + fallback mantığı + trace zenginleştirme + health kaydı
  - registry.py: kayıt, çözümleme, health state tutma
  - dispatcher.py: orchestration

M3-C2 değişiklikleri:
  - NonRetryableProviderError → fallback yapılmaz, direkt fırlatılır.
  - httpx.TimeoutException ve httpx.ConnectError → fallback yapılır.
  - trace'e 'fallback_from' alanı eklendi (primary provider_id'yi içerir).

M3-C3 değişiklikleri:
  - Her invoke sonrası registry.record_outcome() çağrılır (başarı/hata).
  - Gecikme süresi ölçülür ve trace'e 'latency_ms' olarak eklenir (normalde
    provider kendi trace'ine yazar, ama burada de üst seviye ölçüm yapılır).

Fallback kuralları:
  FALLBACK YAPILIR:
    - ProviderInvokeError (provider çağrısı başarısız, NonRetryable olmayan)
    - httpx.TimeoutException (zaman aşımı)
    - httpx.ConnectError (bağlantı kurulamadı)

  FALLBACK YAPILMAZ (direkt fırlatılır):
    - NonRetryableProviderError ve alt sınıfları:
        - InputValidationError  (yanlış girdi — fallback da aynı hatayı alır)
        - ConfigurationError    (API key yok — tüm provider'lar etkilenir)
"""

import logging
import time

import httpx

from app.providers.base import ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.exceptions import (
    NonRetryableProviderError,
    ProviderInvokeError,
    ProviderNotFoundError,
)
from app.providers.registry import ProviderRegistry

logger = logging.getLogger(__name__)


async def resolve_and_invoke(
    registry: ProviderRegistry,
    capability: ProviderCapability,
    input_data: dict,
) -> ProviderOutput:
    """
    Capability için provider zincirini dener ve ilk başarılı sonucu döner.

    Davranış:
      1. registry.get_chain() ile provider listesini al.
      2. İlk provider'ı dene (primary).
         - Başarılıysa trace'e resolution_role="primary", resolved_by="provider_registry" ekle.
         - NonRetryableProviderError → fallback yapılmaz, direkt fırlat.
         - ProviderInvokeError veya ağ hatası → uyarı logla, fallback'e geç.
      3. Sonraki provider'ları fallback olarak dene.
         - Başarılıysa trace'e resolution_role="fallback",
           fallback_from="<primary_provider_id>" ekle.
         - NonRetryableProviderError → direkt fırlat.
      4. Tüm zincir başarısızsa ProviderInvokeError fırlat.

    Args:
        registry   : Provider kayıt defteri.
        capability : Çözümlenecek yetenek.
        input_data : Provider'a iletilecek girdi.

    Returns:
        ProviderOutput: Trace zenginleştirilmiş çıktı.

    Raises:
        ProviderNotFoundError       : Zincirde hiç provider yoksa.
        NonRetryableProviderError   : Fallback yapılmayan hata (InputValidation, Config).
        ProviderInvokeError         : Tüm zincir başarısızsa.
    """
    chain = registry.get_chain(capability)

    son_hata: Exception | None = None
    primary_provider_id: str | None = None

    for i, provider in enumerate(chain):
        rol = "primary" if i == 0 else "fallback"

        if i == 0:
            primary_provider_id = provider.provider_id()

        t_start = time.monotonic()
        try:
            output = await provider.invoke(input_data)
            latency_ms = int((time.monotonic() - t_start) * 1000)

            # Health kaydı — başarılı
            registry.record_outcome(
                capability=capability,
                provider_id=provider.provider_id(),
                success=True,
                latency_ms=latency_ms,
            )

            # Trace zenginleştirme — non-breaking
            output.trace["resolution_role"] = rol
            output.trace["resolved_by"] = "provider_registry"

            if rol == "fallback" and primary_provider_id:
                output.trace["fallback_from"] = primary_provider_id

            return output

        except NonRetryableProviderError:
            # Geri dönüşü olmayan hata — health kaydet, fallback yapma, direkt ilet
            latency_ms = int((time.monotonic() - t_start) * 1000)
            registry.record_outcome(
                capability=capability,
                provider_id=provider.provider_id(),
                success=False,
                latency_ms=latency_ms,
                error_message="NonRetryableProviderError — fallback yapılmadı",
            )
            raise

        except (ProviderInvokeError, httpx.TimeoutException, httpx.ConnectError) as hata:
            # Geçici veya ağ hatası — health kaydet, fallback'e geç
            latency_ms = int((time.monotonic() - t_start) * 1000)
            registry.record_outcome(
                capability=capability,
                provider_id=provider.provider_id(),
                success=False,
                latency_ms=latency_ms,
                error_message=str(hata),
            )
            son_hata = hata
            logger.warning(
                "resolve_and_invoke: provider başarısız [%s=%s, rol=%s]: %s",
                capability,
                provider.provider_id(),
                rol,
                hata,
            )

    # Tüm zincir başarısız
    raise ProviderInvokeError(
        f"chain:{capability}",
        f"Tüm provider'lar başarısız. Zincir: {[p.provider_id() for p in chain]}. "
        f"Son hata: {son_hata}",
    )
