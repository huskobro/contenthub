"""
Provider Exception Modeli (M2-C1)

Provider katmanındaki hata türleri. Router katmanı bu exception'ları
HTTP durum kodlarına eşler:
    ProviderInvokeError   → HTTP 502 (Bad Gateway)
    ProviderNotFoundError → HTTP 503 (Service Unavailable)

Exception hiyerarşisi:
    ProviderError (temel)
    ├── ProviderInvokeError      — çağrı sırasında oluşan hata
    └── ProviderNotFoundError   — capability için provider bulunamadı
"""


class ProviderError(Exception):
    """Tüm provider hatalarının temel sınıfı."""


class ProviderInvokeError(ProviderError):
    """
    Provider çağrısı başarısız olduğunda fırlatılır.

    Attributes:
        provider_id : Hatayı üreten provider'ın kimliği.
        reason      : Hatanın insan tarafından okunabilir açıklaması.
    """

    def __init__(self, provider_id: str, reason: str) -> None:
        self.provider_id = provider_id
        self.reason = reason
        super().__init__(f"Provider çağrısı başarısız [{provider_id!r}]: {reason}")


class ProviderNotFoundError(ProviderError):
    """
    İstenen capability için kayıtlı provider bulunamadığında fırlatılır.

    Attributes:
        capability : Aranan provider yeteneği (örn: 'llm', 'tts').
    """

    def __init__(self, capability: str) -> None:
        self.capability = capability
        super().__init__(f"Provider bulunamadı: capability={capability!r}")
