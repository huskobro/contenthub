"""
Microsoft Edge TTS Provider (M2-C2)

edge-tts Python paketi aracılığıyla Microsoft Edge TTS hizmetini kullanır.
API anahtarı gerektirmez — ücretsiz Microsoft bulut TTS servisidir.

Desteklenen Türkçe sesler:
  - tr-TR-AhmetNeural  (erkek)
  - tr-TR-EmelNeural   (kadın)

Kurulum: pip install edge-tts
"""

import time
import logging

from app.providers.base import BaseProvider, ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.exceptions import ProviderInvokeError

logger = logging.getLogger(__name__)

_VARSAYILAN_SES = "tr-TR-AhmetNeural"


class EdgeTTSProvider(BaseProvider):
    """
    Microsoft Edge TTS provider (edge-tts paketi).

    API anahtarı gerektirmez. Ses üretimi için edge_tts.Communicate kullanır.
    """

    def provider_id(self) -> str:
        """Provider'ın benzersiz kimliği."""
        return "edge_tts"

    def capability(self) -> ProviderCapability:
        """Provider yeteneği."""
        return ProviderCapability.TTS

    async def invoke(self, input_data: dict) -> ProviderOutput:
        """
        Verilen metni sese dönüştürür ve dosyaya kaydeder.

        Args:
            input_data: Şu alanları destekler:
                - text (str): Seslendirülecek metin. Zorunlu.
                - voice (str, opsiyonel): Kullanılacak ses.
                  Varsayılan: 'tr-TR-AhmetNeural'.
                - output_path (str): Ses dosyasının kaydedileceği yol. Zorunlu.

        Returns:
            ProviderOutput:
                result içerir:
                  - output_path (str): Oluşturulan ses dosyasının yolu.
                  - duration_seconds (float): Yaklaşık süre (karakter sayısından hesaplanır).
                trace içerir:
                  - provider_id, voice, char_count, latency_ms.

        Raises:
            ProviderInvokeError: TTS çağrısı başarısız olduğunda.
        """
        metin: str = input_data.get("text", "").strip()
        ses: str = input_data.get("voice", _VARSAYILAN_SES)
        cikis_yolu: str = input_data.get("output_path", "")

        if not metin:
            raise ProviderInvokeError(
                self.provider_id(),
                "'text' alanı boş olamaz.",
            )

        if not cikis_yolu:
            raise ProviderInvokeError(
                self.provider_id(),
                "'output_path' alanı belirtilmelidir.",
            )

        try:
            import edge_tts  # tip kontrolü için değil, çalışma zamanı importu
        except ImportError as hata:
            raise ProviderInvokeError(
                self.provider_id(),
                "edge-tts paketi yüklü değil. 'pip install edge-tts' komutuyla kurun.",
            ) from hata

        baslangic = time.monotonic()
        try:
            iletisim = edge_tts.Communicate(metin, ses)
            await iletisim.save(cikis_yolu)
        except Exception as hata:
            raise ProviderInvokeError(
                self.provider_id(),
                f"TTS üretimi başarısız: {hata}",
            ) from hata

        gecikme_ms = int((time.monotonic() - baslangic) * 1000)

        # Yaklaşık süre: Türkçe konuşma hızı ~15 karakter/saniye
        yaklasik_sure = round(len(metin) / 15.0, 2)

        return ProviderOutput(
            result={
                "output_path": cikis_yolu,
                "duration_seconds": yaklasik_sure,
            },
            trace={
                "provider_id": self.provider_id(),
                "voice": ses,
                "char_count": len(metin),
                "latency_ms": gecikme_ms,
            },
            provider_id=self.provider_id(),
        )
