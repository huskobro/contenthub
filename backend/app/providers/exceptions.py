"""
Provider Exception Modeli (M2-C1 / M3-C2)

Provider katmanındaki hata türleri. Router katmanı bu exception'ları
HTTP durum kodlarına eşler:
    ProviderInvokeError        → HTTP 502 (Bad Gateway)
    ProviderNotFoundError      → HTTP 503 (Service Unavailable)
    NonRetryableProviderError  → HTTP 502 (fallback zinciri durdurulur)

Exception hiyerarşisi:
    ProviderError (temel)
    ├── ProviderInvokeError          — çağrı sırasında oluşan hata (fallback yapılır)
    │   └── NonRetryableProviderError — fallback zinciri DURDURULUR
    └── ProviderNotFoundError        — capability için provider bulunamadı

M3-C2: NonRetryableProviderError eklendi.
  Kullanım senaryoları:
    - InputValidationError    : Yanlış girdi — tüm fallback'ler de başarısız olur.
    - ConfigurationError      : API key yok — tüm provider'lar etkilenir.
  Bu iki durum NonRetryableProviderError alt sınıflarıdır.
"""


class ProviderError(Exception):
    """Tüm provider hatalarının temel sınıfı."""


class ProviderInvokeError(ProviderError):
    """
    Provider çağrısı başarısız olduğunda fırlatılır.

    Fallback zinciri bu hatayı yakalar ve bir sonraki provider'ı dener.

    Attributes:
        provider_id : Hatayı üreten provider'ın kimliği.
        reason      : Hatanın insan tarafından okunabilir açıklaması.
    """

    def __init__(self, provider_id: str, reason: str) -> None:
        self.provider_id = provider_id
        self.reason = reason
        super().__init__(f"Provider çağrısı başarısız [{provider_id!r}]: {reason}")


class NonRetryableProviderError(ProviderInvokeError):
    """
    Fallback zincirine geçilmeden direkt fırlatılması gereken hata.

    Bu hata fırlatıldığında resolve_and_invoke() fallback denemez,
    hatayı doğrudan çağrıcıya iletir.

    Kullanım:
        - InputValidationError : Yanlış/eksik girdi — fallback da başarısız olur.
        - ConfigurationError   : API key / yapılandırma eksik.

    resolution.py bu exception'ı yakalamaz, direkt yukarı iletir.
    """


class InputValidationError(NonRetryableProviderError):
    """
    Girdi doğrulama hatası — yanlış veya eksik input_data alanları.

    Fallback yapılmaz; girdinin kendisi hatalı olduğundan başka
    provider da aynı hatayı alır.
    """


class ConfigurationError(NonRetryableProviderError):
    """
    Yapılandırma hatası — API key yok veya geçersiz yapılandırma.

    Fallback yapılmaz; tüm provider'lar aynı sorundan etkilenir.
    """


class ProviderNotFoundError(ProviderError):
    """
    İstenen capability için kayıtlı provider bulunamadığında fırlatılır.

    Attributes:
        capability : Aranan provider yeteneği (örn: 'llm', 'tts').
    """

    def __init__(self, capability: str) -> None:
        self.capability = capability
        super().__init__(f"Provider bulunamadı: capability={capability!r}")
