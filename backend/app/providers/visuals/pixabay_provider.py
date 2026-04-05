"""
Pixabay Görsel Provider (M2-C2)

Pixabay API aracılığıyla ücretsiz stok görsel araması ve indirmesi yapar.
API anahtarı sorgu parametresi olarak iletilir.

Endpoint: https://pixabay.com/api/
Dokümantasyon: https://pixabay.com/api/docs/

UYARI: Bu dosyaya API anahtarı GÖMÜLMEMELİDİR.
       Anahtarlar yalnızca app.core.config.settings üzerinden okunur.
"""

import os
import time
import logging
from typing import Optional

import httpx

from app.providers.base import BaseProvider, ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.exceptions import ProviderInvokeError

logger = logging.getLogger(__name__)

_PIXABAY_ARAMA_URL = "https://pixabay.com/api/"
_VARSAYILAN_ADET = 5


class PixabayProvider(BaseProvider):
    """
    Pixabay stok görsel provider'ı.

    Arama terimi verildiğinde Pixabay API'den görselleri bulur ve
    belirtilen dizine indirir.
    """

    def __init__(self, api_key: str, default_count: Optional[int] = None, search_timeout: Optional[float] = None) -> None:
        """
        Args:
            api_key: Pixabay API anahtarı. app.core.config.settings üzerinden
                     iletilmeli, koda gömülmemelidir.
            default_count: Varsayılan görsel sayısı. None ise _VARSAYILAN_ADET kullanılır.
            search_timeout: HTTP arama timeout süresi (saniye). None ise 30.0 kullanılır.
        """
        if not api_key:
            logger.warning("PixabayProvider: API anahtarı boş — gerçek çağrılar başarısız olacak.")
        self._api_key = api_key
        self._default_count = default_count or _VARSAYILAN_ADET
        self._search_timeout = search_timeout or 30.0

    def provider_id(self) -> str:
        """Provider'ın benzersiz kimliği."""
        return "pixabay"

    def capability(self) -> ProviderCapability:
        """Provider yeteneği."""
        return ProviderCapability.VISUALS

    async def invoke(self, input_data: dict) -> ProviderOutput:
        """
        Pixabay'den görsel arar ve indirir.

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
                    {url, local_path, width, height, author}.
                trace içerir:
                  - provider_id, query, results_found, downloaded_count, latency_ms.

        Raises:
            ProviderInvokeError: API çağrısı veya indirme başarısız olduğunda.
        """
        sorgu: str = input_data.get("query", "").strip()
        adet: int = int(input_data.get("count", self._default_count))
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

        parametreler = {
            "key": self._api_key,
            "q": sorgu,
            "image_type": "photo",
            "per_page": adet,
        }

        baslangic = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=self._search_timeout) as istemci:
                arama_yaniti = await istemci.get(
                    _PIXABAY_ARAMA_URL,
                    params=parametreler,
                )
        except httpx.RequestError as hata:
            raise ProviderInvokeError(
                self.provider_id(),
                f"Pixabay arama isteği başarısız: {hata}",
            ) from hata

        if arama_yaniti.status_code != 200:
            raise ProviderInvokeError(
                self.provider_id(),
                f"Pixabay API HTTP {arama_yaniti.status_code}: {arama_yaniti.text[:300]}",
            )

        try:
            arama_verisi = arama_yaniti.json()
        except Exception as hata:
            raise ProviderInvokeError(
                self.provider_id(),
                f"Pixabay JSON ayrıştırma hatası: {hata}",
            ) from hata

        oge_listesi: list[dict] = arama_verisi.get("hits", [])
        bulunan_sayi = len(oge_listesi)

        varliklar: list[dict] = []

        async with httpx.AsyncClient(timeout=60.0) as istemci:
            for i, oge in enumerate(oge_listesi):
                gorsel_url: str = oge.get("largeImageURL", "")
                if not gorsel_url:
                    gorsel_url = oge.get("webformatURL", "")
                if not gorsel_url:
                    continue

                dosya_adi = f"pixabay_{i}_{oge.get('id', i)}.jpg"
                yerel_yol = os.path.join(cikis_dizini, dosya_adi)

                try:
                    gorsel_yaniti = await istemci.get(gorsel_url)
                    gorsel_yaniti.raise_for_status()
                    with open(yerel_yol, "wb") as dosya:
                        dosya.write(gorsel_yaniti.content)
                except Exception as hata:
                    logger.warning("Pixabay görsel indirme hatası [%s]: %s", gorsel_url, hata)
                    continue

                varliklar.append({
                    "url": gorsel_url,
                    "local_path": yerel_yol,
                    "width": oge.get("imageWidth", 0),
                    "height": oge.get("imageHeight", 0),
                    "author": oge.get("user", ""),
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
