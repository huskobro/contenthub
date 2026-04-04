"""
Provider çözümleme ve invoke yardımcısı (M3-C1).

Registry üzerinden capability çözümler, invoke eder ve trace'i zenginleştirir.
Primary başarısızsa fallback zincirini dener.

Sorumluluk sınırı:
  - Bu dosya: invoke + fallback mantığı + trace zenginleştirme
  - registry.py: kayıt ve çözümleme
  - dispatcher.py: orchestration
"""

import logging

from app.providers.base import ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.exceptions import ProviderInvokeError, ProviderNotFoundError
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
         - Başarısızsa uyarı logla, fallback'e geç.
      3. Sonraki provider'ları fallback olarak dene.
         - Başarılıysa trace'e resolution_role="fallback" ekle.
      4. Tüm zincir başarısızsa ProviderInvokeError fırlat.

    Args:
        registry   : Provider kayıt defteri.
        capability : Çözümlenecek yetenek.
        input_data : Provider'a iletilecek girdi.

    Returns:
        ProviderOutput: Trace zenginleştirilmiş çıktı.

    Raises:
        ProviderNotFoundError: Zincirde hiç provider yoksa.
        ProviderInvokeError  : Tüm zincir başarısızsa.
    """
    chain = registry.get_chain(capability)

    son_hata: Exception | None = None

    for i, provider in enumerate(chain):
        rol = "primary" if i == 0 else "fallback"
        try:
            output = await provider.invoke(input_data)
            # Trace zenginleştirme — non-breaking
            output.trace["resolution_role"] = rol
            output.trace["resolved_by"] = "provider_registry"
            return output
        except ProviderInvokeError as hata:
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
