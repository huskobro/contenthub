"""
YouTube Publish Hata Sınıfları — M7-C2.

Tüm YouTube-spesifik hatalar burada tanımlanır.
Servis katmanı PublishAdapterError ile çalışır; bu sınıflar
adaptör içinde fırlatılır ve retryable bayrağı ile işaretlenir.

Hata sınıflandırması:
  retryable=True  : Geçici sorun; otomatik retry anlamlı.
  retryable=False : Kalıcı sorun; operatör müdahalesi gerekli.
"""

from app.publish.adapter import PublishAdapterError


class YouTubeAuthError(PublishAdapterError):
    """
    OAuth2 kimlik doğrulama hatası.

    Token süresi dolmuş ve yenilenemiyor, ya da hiç token yok.
    retryable=False: operatörün yeniden yetkilendirme yapması gerekir.
    """
    def __init__(self, message: str, error_code: str = "auth_error"):
        super().__init__(message, error_code=error_code, retryable=False)


class YouTubeQuotaExceededError(PublishAdapterError):
    """
    YouTube Data API günlük kota aşıldı.

    retryable=False: aynı gün içinde retry anlamsız.
    Operatör ertesi gün yeniden deneyebilir.
    """
    def __init__(self, message: str = "YouTube API günlük kota aşıldı."):
        super().__init__(message, error_code="quota_exceeded", retryable=False)


class YouTubeRateLimitError(PublishAdapterError):
    """
    Kısa süreli rate limit (429 Too Many Requests).

    retryable=True: kısa bekleme sonrası retry mümkün.
    """
    def __init__(self, message: str = "YouTube API rate limit — kısa süre sonra tekrar dene."):
        super().__init__(message, error_code="rate_limit", retryable=True)


class YouTubeUploadError(PublishAdapterError):
    """
    Video yükleme hatası.

    Ağ sorunu veya geçici platform hatası — genellikle retryable.
    HTTP 500/503 durumları bu sınıfı tetikler.
    """
    def __init__(self, message: str, error_code: str = "upload_error", retryable: bool = True):
        super().__init__(message, error_code=error_code, retryable=retryable)


class YouTubeActivateError(PublishAdapterError):
    """
    Video aktivasyon (public/scheduled) hatası.

    Video başarıyla yüklendi ama durum güncellenemedi.
    platform_video_id korunur; yalnızca activate retry edilir.
    retryable=True: upload tekrar yapılmaz.
    """
    def __init__(self, message: str, error_code: str = "activate_error", retryable: bool = True):
        super().__init__(message, error_code=error_code, retryable=retryable)


class YouTubeVideoNotFoundError(PublishAdapterError):
    """
    Aktivasyon sırasında platform_video_id bulunamadı.

    retryable=False: yükleme baştan yapılmalı.
    """
    def __init__(self, video_id: str):
        super().__init__(
            f"YouTube video ID bulunamadı: {video_id}. Yükleme yeniden yapılmalı.",
            error_code="video_not_found",
            retryable=False,
        )
