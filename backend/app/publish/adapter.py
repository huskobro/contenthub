"""
Publish Adaptör Tabanı — M7-C1.

Soyut temel sınıf: tüm platform adaptörleri (YouTube, vb.) bu sınıfı
miras almalıdır. M7-C2'de YouTubeAdapter bu sınıfı implement eder.

Tasarım kuralları (M7):
  - Adaptör yalnızca platform I/O ile ilgilenir; durum geçişleri servis katmanındadır.
  - upload/private/promote zinciri burada tanımlanır; her adım ayrı metot.
  - Adaptör PublishRecord'u okuyabilir fakat doğrudan güncelleyemez.
    Sonucu PublishAdapterResult olarak döndürür; servis katmanı günceller.
  - Adaptör edit/audit log yazmaz — bu servis katmanının sorumluluğudur.
  - Her metot başarısızlıkta PublishAdapterError fırlatabilir.

Upload/private/promote zinciri (M7 taahhüdü):
  1. upload()  : Ham video dosyasını platforma yükle (özel/unlisted olarak).
                 Döner: platform_video_id, plattform_url (özel/unlisted)
  2. activate(): Video'yu yayınla (public yap veya planla).
                 Döner: güncellenmiş platform_url

  Bu iki adım tek bir işlemde çağrılmaz çünkü:
    - upload başarılı olabilir, activate başarısız olabilir.
    - Bu durumda platform_video_id kaydedilmiş olur; activate retry edilebilir.
    - Her adımın sonucu PublishLog'a ayrı olay olarak kaydedilir.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime


@dataclass
class PublishAdapterResult:
    """
    Adaptör metot dönüş değeri.

    success          : İşlem başarılı mı?
    platform_video_id: Platform'un atadığı ID (upload sonrası dolu olur)
    platform_url     : Video URL'i (activate sonrası kesin olur)
    raw_response     : Platform ham yanıtı (dict veya None)
    error_code       : Başarısızlık kodu (platform spesifik, nullable)
    error_message    : Okunabilir hata mesajı (nullable)
    """
    success: bool
    platform_video_id: Optional[str] = None
    platform_url: Optional[str] = None
    raw_response: Optional[dict] = field(default=None)
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class PublishAdapterError(Exception):
    """
    Platform adaptörü genel hatası.

    error_code: platform spesifik hata kodu (nullable)
    retryable : bu hata için retry yapılabilir mi?
    """
    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        retryable: bool = True,
    ):
        super().__init__(message)
        self.error_code = error_code
        self.retryable = retryable


class PublishAdapter(ABC):
    """
    Platform publish adaptörü soyut tabanı.

    Her yeni platform (YouTube, TikTok, vb.) bu sınıfı miras alır ve
    upload() + activate() metodlarını implement eder.

    Adaptör durum kör (stateless) olmalıdır: publish_record_id ve
    payload'u parametre olarak alır, kendi içinde kayıt güncellemez.
    """

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Platform adı — PublishPlatform enum değeriyle eşleşmeli."""
        ...

    @abstractmethod
    async def upload(
        self,
        publish_record_id: str,
        video_path: str,
        payload: dict,
    ) -> PublishAdapterResult:
        """
        Ham video dosyasını platforma yükle (özel/unlisted).

        Args:
            publish_record_id : İzleme için publish kaydı ID'si (log/trace amaçlı).
            video_path        : Yüklenecek video dosyasının yerel yolu.
            payload           : Başlık, açıklama, etiketler gibi metadata.

        Returns:
            PublishAdapterResult(
                success=True,
                platform_video_id="...",   # Platform'un atadığı ID
                platform_url="...",         # Özel/unlisted URL (varsa)
                raw_response={...},
            )

        Raises:
            PublishAdapterError: Upload başarısız.
        """
        ...

    @abstractmethod
    async def activate(
        self,
        publish_record_id: str,
        platform_video_id: str,
        scheduled_at: Optional[datetime] = None,
    ) -> PublishAdapterResult:
        """
        Yüklenen videoyu yayınla (public yap veya planla).

        Args:
            publish_record_id : İzleme için publish kaydı ID'si.
            platform_video_id : upload() sonrası alınan platform ID'si.
            scheduled_at      : Planlanmış yayın zamanı. None ise hemen yayınla.

        Returns:
            PublishAdapterResult(
                success=True,
                platform_video_id="...",
                platform_url="...",   # Kesin public URL
                raw_response={...},
            )

        Raises:
            PublishAdapterError: Activate başarısız.
        """
        ...
