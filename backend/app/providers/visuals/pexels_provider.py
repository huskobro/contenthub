"""
Pexels Görsel Provider (M2-C2)

Pexels API aracılığıyla stok görsel araması ve indirmesi yapar.
API Anahtarı Authorization başlığı olarak iletilir.

Endpoint: https://api.pexels.com/v1/search
Dokümantasyon: https://www.pexels.com/api/documentation/

UYARI: Bu dosyaya API anahtarı GÖMÜLMEMELİDİR.
       Anahtarlar yalnızca app.core.config.settings üzerinden okunur.
"""

import os
import time
import logging

import httpx

from app.providers.base import BaseProvider, ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.exceptions import ProviderInvokeError

logger = logging.getLogger(__name__)

_PEXELS_ARAMA_URL = "https://api.pexels.com/v1/search"
_VARSAYILAN_ADET = 5


class PexelsProvider(BaseProvider):
    """
    Pexels stok görsel provider'ı.

    Arama terimi verildiğinde Pexels API'den görselleri bulur ve
    belirtilen dizine indirir.
    """

    def __init__(self, api_key: str) -> None:
        """
        Args:
            api_key: Pexels API anahtarı. app.core.config.settings üzerinden
                     iletilmeli, koda gömülmemelidir.
        """
        if not api_key:
            logger.warning("PexelsProvider: API anahtarı boş — gerçek çağrılar başarısız olacak.")
        self._api_key = api_key

    def provider_id(self) -> str:
        """Provider'ın benzersiz kimliği."""
        return "pexels"

    def capability(self) -> ProviderCapability:
        """Provider yeteneği."""
        return ProviderCapability.VISUALS

    async def invoke(self, input_data: dict) -> ProviderOutput:
        """
        Pexels'ten görsel arar ve indirir.

        Args:
            input_data: Şu alanları destekler:
                - query (str): Arama terimi. Zorunlu.
                - count (int, opsiyonel): İndirilecek görsel sayısı.
                  Varsayılan: 5.
                - output_dir (str): Görsellerin kaydedileceği dizin. Zorunlu.

        Returns:
            ProviderOutput:
                result içerir:
                  - assets (list[dict]): İndirilen görseller. Her biri:
                    {url, local_path, width, height, photographer}.
                trace içerir:
                  - provider_id, query, results_found, downloaded_count, latency_ms.

        Raises:
            ProviderInvokeError: API çağrısı veya indirme başarısız olduğunda.
        """
        sorgu: str = input_data.get("query", "").strip()
        adet: int = int(input_data.get("count", _VARSAYILAN_ADET))
        cikis_dizini: str = input_data.get("output_dir", "")

        if not sorgu:
            raise ProviderInvokeError(
                self.provider_id(),
                "'query' alanı boş olamaz.",
            )

        if not cikis_dizini:
            raise ProviderInvokeError(
                self.provider_id(),
                "'output_dir' alanı belirtilmelidir.",
            )

        os.makedirs(cikis_dizini, exist_ok=True)

        basliklar = {
            "Authorization": self._api_key,
        }

        parametreler = {
            "query": sorgu,
            "per_page": adet,
        }

        baslangic = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=30.0) as istemci:
                arama_yaniti = await istemci.get(
                    _PEXELS_ARAMA_URL,
                    params=parametreler,
                    headers=basliklar,
                )
        except httpx.RequestError as hata:
            raise ProviderInvokeError(
                self.provider_id(),
                f"Pexels arama isteği başarısız: {hata}",
            ) from hata

        if arama_yaniti.status_code != 200:
            raise ProviderInvokeError(
                self.provider_id(),
                f"Pexels API HTTP {arama_yaniti.status_code}: {arama_yaniti.text[:300]}",
            )

        try:
            arama_verisi = arama_yaniti.json()
        except Exception as hata:
            raise ProviderInvokeError(
                self.provider_id(),
                f"Pexels JSON ayrıştırma hatası: {hata}",
            ) from hata

        fotograflar: list[dict] = arama_verisi.get("photos", [])
        bulunan_sayi = len(fotograflar)

        varliklar: list[dict] = []

        async with httpx.AsyncClient(timeout=60.0) as istemci:
            for i, foto in enumerate(fotograflar):
                gorsel_url: str = foto.get("src", {}).get("original", "")
                if not gorsel_url:
                    continue

                dosya_adi = f"pexels_{i}_{foto.get('id', i)}.jpg"
                yerel_yol = os.path.join(cikis_dizini, dosya_adi)

                try:
                    gorsel_yaniti = await istemci.get(gorsel_url)
                    gorsel_yaniti.raise_for_status()
                    with open(yerel_yol, "wb") as dosya:
                        dosya.write(gorsel_yaniti.content)
                except Exception as hata:
                    logger.warning("Pexels görsel indirme hatası [%s]: %s", gorsel_url, hata)
                    continue

                varliklar.append({
                    "url": gorsel_url,
                    "local_path": yerel_yol,
                    "width": foto.get("width", 0),
                    "height": foto.get("height", 0),
                    "photographer": foto.get("photographer", ""),
                })

        gecikme_ms = int((time.monotonic() - baslangic) * 1000)

        return ProviderOutput(
            result={
                "assets": varliklar,
            },
            trace={
                "provider_id": self.provider_id(),
                "query": sorgu,
                "results_found": bulunan_sayi,
                "downloaded_count": len(varliklar),
                "latency_ms": gecikme_ms,
            },
            provider_id=self.provider_id(),
        )
