"""
Provider Temel Arayüzü (M2-C1)

Tüm dış hizmet entegrasyonları (LLM, TTS, görsel, yayın) bu arayüzü uygular.
P-009 kuralı gereği hiçbir servis kodu doğrudan httpx çağrısı yapamaz — her
dış çağrı bir BaseProvider alt sınıfı üzerinden geçmelidir.

Bu dosya yalnızca arayüzü tanımlar. Provider kaydı ve yedek/sağlık yönetimi
M3 kapsamındadır ve buraya eklenmemelidir.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class ProviderOutput:
    """
    Provider çağrısının standart çıktı yapısı.

    Alanlar:
        result      : İşlemin sonucu — provider'a özgü sözlük.
        trace       : Provider izi: kullanılan model, gecikme süresi,
                      token sayısı, sürüm gibi tanılama bilgileri.
        provider_id : Bu çıktıyı üreten provider'ın benzersiz kimliği.
    """

    result: dict
    trace: dict
    provider_id: str


class BaseProvider(ABC):
    """
    Tüm provider'ların uygulaması gereken temel soyut sınıf.

    Uygulama notu:
        - invoke() hatada ProviderInvokeError fırlatmalıdır; bare Exception
          fırlatılmamalıdır.
        - Provider'lar durum taşımamalıdır; her invoke() çağrısı bağımsızdır.
        - Gerçek API çağrıları yalnızca invoke() içinde yapılmalıdır.
    """

    @abstractmethod
    async def invoke(self, input_data: dict) -> ProviderOutput:
        """
        Provider'ı çağırır.

        Args:
            input_data: Provider'a özgü girdi sözlüğü.

        Returns:
            ProviderOutput: İşlem sonucu ve iz bilgisi.

        Raises:
            ProviderInvokeError: Çağrı başarısız olduğunda.
        """
        ...

    @abstractmethod
    def provider_id(self) -> str:
        """
        Provider'ın benzersiz kimliğini döndürür.

        Örnek: 'openai_gpt4o', 'elevenlabs_tts', 'pexels_visuals'
        """
        ...

    @abstractmethod
    def capability(self) -> str:
        """
        Provider'ın yeteneğini döndürür.

        Örnek: 'llm', 'tts', 'visuals', 'publish'
        """
        ...
