"""
System TTS Provider — noop fallback stub (M3-C2)

Bu provider gerçek ses üretmez. Fallback zinciri testleri ve geliştirme
ortamı için bir "ikinci TTS" slot'u sağlar.

ÖNEMLI UYARI:
  Bu provider üretim kullanımı için TASARLANMAMIŞTIR.
  Gerçek ses dosyası oluşturmaz; boş bir MP3 dosyası yazar ve bunu log'a kaydeder.
  Yalnızca fallback zincirinin çalışıp çalışmadığını doğrulamak için kullanın.

Gerçek bir ikincil TTS seçeneği gerekirken:
  - ElevenLabs (API tabanlı, yüksek kalite)
  - Azure TTS (API tabanlı)
  - Coqui TTS (yerel, açık kaynak)
  gibi bir seçeneği bu provider yerine entegre edin.

provider_id: "noop_tts_fallback"
capability : ProviderCapability.TTS

M3-C3 notu: Settings registry aktif olduğunda bu provider'ın enabled/disabled
            durumu settings üzerinden yönetilebilir.
"""

import logging

from app.providers.base import BaseProvider, ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.exceptions import ProviderInvokeError

logger = logging.getLogger(__name__)

# Minimal geçerli MP3 dosyası — ID3v2 header + boş frame
# Bu gerçek ses içermez, sadece dosya format uyumluluğu için.
_BOSLUK_MP3_BYTES = (
    b"\xff\xfb\x90\x00"  # MPEG1 Layer3 frame header
    b"\x00" * 413        # sessiz frame verisi (128kbps için)
)


class SystemTTSProvider(BaseProvider):
    """
    Noop TTS fallback provider — üretim için kullanılmaz.

    invoke() çağrıldığında:
      1. 'text' ve 'output_path' alanlarını doğrular.
      2. output_path'e minimal/boş bir MP3 dosyası yazar.
      3. Bu işlemi açık bir uyarı ile log'a kaydeder.

    Ses kalitesi gerektiren testlerde veya üretim ortamında
    bu provider'ı kullanmayın.
    """

    def provider_id(self) -> str:
        """Provider'ın benzersiz kimliği."""
        return "noop_tts_fallback"

    def capability(self) -> ProviderCapability:
        """Provider yeteneği."""
        return ProviderCapability.TTS

    async def invoke(self, input_data: dict) -> ProviderOutput:
        """
        Boş MP3 dosyası yazar (gerçek ses içermez).

        Args:
            input_data: Şu alanları destekler:
                - text (str): Seslendirülecek metin. Zorunlu (doğrulanır, kullanılmaz).
                - output_path (str): Ses dosyasının kaydedileceği yol. Zorunlu.

        Returns:
            ProviderOutput:
                result içerir:
                  - output_path (str): Yazılan dosyanın yolu.
                  - duration_seconds (float): Her zaman 0.0 (ses üretilmedi).
                  - noop (bool): Her zaman True — bu provider'ın noop olduğunu işaretler.
                trace içerir:
                  - provider_id, char_count, latency_ms, noop.

        Raises:
            ProviderInvokeError: 'text' veya 'output_path' eksikse ya da dosya yazma başarısızsa.
        """
        metin: str = input_data.get("text", "").strip()
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

        logger.warning(
            "SystemTTSProvider (noop): Gerçek ses üretilmiyor. "
            "Boş MP3 yazılıyor: path=%s, char_count=%d",
            cikis_yolu,
            len(metin),
        )

        try:
            with open(cikis_yolu, "wb") as dosya:
                dosya.write(_BOSLUK_MP3_BYTES)
        except OSError as hata:
            raise ProviderInvokeError(
                self.provider_id(),
                f"Dosya yazma hatası: {hata}",
            ) from hata

        return ProviderOutput(
            result={
                "output_path": cikis_yolu,
                "duration_seconds": 0.0,
                "noop": True,
            },
            trace={
                "provider_id": self.provider_id(),
                "char_count": len(metin),
                "latency_ms": 0,
                "noop": True,
            },
            provider_id=self.provider_id(),
        )
