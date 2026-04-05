"""
YouTube Publish Adaptörü — M7-C2.

PublishAdapter soyut tabanını implement eder.
upload() + activate() zinciri YouTube Data API v3 üzerinden çalışır.

Upload/private/promote zinciri (M7 taahhüdü):
  1. upload()   : Resumable upload — video private olarak yüklenir.
                  Döner: platform_video_id (YouTube video ID), private URL.
  2. activate() : Video durumunu public veya scheduled'a günceller.
                  Döner: public/scheduled URL.

  Bu iki adım ayrıdır:
    - upload başarılı → platform_video_id PublishRecord'a kaydedilir.
    - activate başarısız → platform_video_id korunur; activate tekrar denenebilir.
    - Upload tekrar yapılmaz — bu zincir kısmi başarısızlık semantiğini destekler.

Platform-spesifik hata yönetimi:
  - 401/403 → YouTubeAuthError (retryable=False)
  - 429 + "quotaExceeded" → YouTubeQuotaExceededError (retryable=False)
  - 429 rate limit → YouTubeRateLimitError (retryable=True)
  - 404 video → YouTubeVideoNotFoundError (retryable=False)
  - 500/503 → YouTubeUploadError / YouTubeActivateError (retryable=True)

YouTube Data API v3 endpoint'leri:
  Upload   : POST https://www.googleapis.com/upload/youtube/v3/videos
  Update   : PUT  https://www.googleapis.com/youtube/v3/videos
  (Resumable upload iki aşamalı: init → binary upload)

Test edilebilirlik:
  httpx.AsyncClient dışarıdan inject edilebilir; gerçek API çağrısı yapılmaz.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.publish.adapter import PublishAdapter, PublishAdapterResult
from app.publish.enums import PublishPlatform
from app.publish.youtube.errors import (
    YouTubeAuthError,
    YouTubeQuotaExceededError,
    YouTubeRateLimitError,
    YouTubeUploadError,
    YouTubeActivateError,
    YouTubeVideoNotFoundError,
)
from app.publish.youtube.token_store import YouTubeTokenStore

logger = logging.getLogger(__name__)

# YouTube Data API v3 endpoint'leri
_YT_UPLOAD_INIT_URL = "https://www.googleapis.com/upload/youtube/v3/videos"
_YT_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
_YT_VIDEO_BASE_URL = "https://www.youtube.com/watch?v="


def _youtube_url(video_id: str) -> str:
    return f"{_YT_VIDEO_BASE_URL}{video_id}"


def _parse_youtube_error(response: httpx.Response) -> tuple[str, str]:
    """
    YouTube API hata yanıtından (error_code, message) çıkarır.

    Returns:
        (error_code, human_readable_message)
    """
    try:
        body = response.json()
        error = body.get("error", {})
        errors = error.get("errors", [{}])
        reason = errors[0].get("reason", "unknown") if errors else "unknown"
        message = error.get("message", response.text[:200])
        return reason, message
    except Exception:
        return "unknown", response.text[:200]


def _check_auth_or_quota(response: httpx.Response) -> None:
    """401/403/429 yanıtlarını platform-spesifik hatalara dönüştürür."""
    if response.status_code in (401, 403):
        reason, msg = _parse_youtube_error(response)
        raise YouTubeAuthError(
            f"YouTube kimlik doğrulama hatası ({response.status_code}): {msg}",
            error_code=reason,
        )
    if response.status_code == 429:
        reason, msg = _parse_youtube_error(response)
        if reason == "quotaExceeded":
            raise YouTubeQuotaExceededError(
                f"YouTube API kota aşıldı: {msg}"
            )
        raise YouTubeRateLimitError(
            f"YouTube API rate limit ({response.status_code}): {msg}"
        )


class YouTubeAdapter(PublishAdapter):
    """
    YouTube Data API v3 publish adaptörü.

    upload()   : Resumable upload (private).
    activate() : Video status → public veya scheduled.

    Gerçek API'ye erişim için geçerli YouTube OAuth2 token'ı gerekir.
    Token yönetimi YouTubeTokenStore üzerinden yapılır.
    """

    def __init__(
        self,
        token_store: Optional[YouTubeTokenStore] = None,
        http_client: Optional[httpx.AsyncClient] = None,
        upload_timeout: Optional[float] = None,
    ):
        """
        Args:
            token_store    : OAuth2 token yönetimi. None ise varsayılan oluşturulur.
            http_client    : Test için inject edilebilir. None ise yeni client oluşturulur.
            upload_timeout : HTTP timeout (saniye). None ise 60.0 kullanılır.
                             publish.youtube.upload_timeout_seconds ayarından çözümlenir.
        """
        self._token_store = token_store or YouTubeTokenStore()
        self._http_client = http_client
        self._upload_timeout: float = upload_timeout or 60.0

    def _get_client(self) -> httpx.AsyncClient:
        if self._http_client is not None:
            return self._http_client
        return httpx.AsyncClient(timeout=self._upload_timeout)

    @property
    def platform_name(self) -> str:
        return PublishPlatform.YOUTUBE.value

    async def upload(
        self,
        publish_record_id: str,
        video_path: str,
        payload: dict,
    ) -> PublishAdapterResult:
        """
        Videoyu YouTube'a private olarak yükler (resumable upload).

        Upload zinciri:
          1. POST /upload/youtube/v3/videos → upload URL alınır (init)
          2. PUT upload_url → binary video gönderilir
          3. Yanıttan video ID ve URL alınır

        Args:
            publish_record_id : İzleme ID'si (log için).
            video_path        : Yüklenecek video dosyasının yerel yolu.
            payload           : title, description, tags, category_id.

        Returns:
            PublishAdapterResult(success=True, platform_video_id=..., platform_url=...)

        Raises:
            YouTubeAuthError          : Token geçersiz.
            YouTubeQuotaExceededError : Günlük kota aşıldı.
            YouTubeRateLimitError     : Geçici rate limit.
            YouTubeUploadError        : Diğer upload hataları.
        """
        import os
        from pathlib import Path as _Path

        video_file = _Path(video_path)
        if not video_file.exists():
            raise YouTubeUploadError(
                f"Video dosyası bulunamadı: {video_path}",
                error_code="file_not_found",
                retryable=False,
            )

        access_token = await self._token_store.get_access_token()
        file_size = os.path.getsize(video_path)

        # Metadata hazırlığı
        title = payload.get("title", "ContentHub Video")
        description = payload.get("description", "")
        tags = payload.get("tags", [])
        category_id = str(payload.get("category_id", "22"))  # 22 = People & Blogs

        video_resource = {
            "snippet": {
                "title": title,
                "description": description,
                "tags": tags,
                "categoryId": category_id,
            },
            "status": {
                "privacyStatus": "private",
            },
        }

        headers_init = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "video/*",
            "X-Upload-Content-Length": str(file_size),
        }

        params_init = {
            "uploadType": "resumable",
            "part": "snippet,status",
        }

        logger.info(
            "YouTubeAdapter.upload başlatıldı: publish_record_id=%s video=%s",
            publish_record_id, video_path
        )

        client = self._get_client()
        should_close = self._http_client is None

        try:
            # Adım 1: Resumable upload başlat
            init_resp = await client.post(
                _YT_UPLOAD_INIT_URL,
                headers=headers_init,
                params=params_init,
                content=json.dumps(video_resource, ensure_ascii=False).encode(),
            )

            _check_auth_or_quota(init_resp)

            if init_resp.status_code not in (200, 201):
                reason, msg = _parse_youtube_error(init_resp)
                raise YouTubeUploadError(
                    f"Upload init başarısız (HTTP {init_resp.status_code}): {msg}",
                    error_code=reason,
                )

            upload_url = init_resp.headers.get("Location")
            if not upload_url:
                raise YouTubeUploadError(
                    "Upload init yanıtında Location header yok.",
                    error_code="missing_upload_url",
                    retryable=False,
                )

            # Adım 2: Binary video gönder
            with open(video_path, "rb") as f:
                video_data = f.read()

            upload_resp = await client.put(
                upload_url,
                content=video_data,
                headers={
                    "Content-Type": "video/*",
                    "Content-Length": str(file_size),
                },
            )

            _check_auth_or_quota(upload_resp)

            if upload_resp.status_code not in (200, 201):
                reason, msg = _parse_youtube_error(upload_resp)
                raise YouTubeUploadError(
                    f"Video upload başarısız (HTTP {upload_resp.status_code}): {msg}",
                    error_code=reason,
                )

            upload_data = upload_resp.json()
            video_id = upload_data.get("id")
            if not video_id:
                raise YouTubeUploadError(
                    f"Upload yanıtında video ID yok: {upload_data}",
                    error_code="missing_video_id",
                    retryable=False,
                )

            platform_url = _youtube_url(video_id)
            logger.info(
                "YouTubeAdapter.upload tamamlandı: video_id=%s publish_record_id=%s",
                video_id, publish_record_id
            )
            return PublishAdapterResult(
                success=True,
                platform_video_id=video_id,
                platform_url=platform_url,
                raw_response=upload_data,
            )

        finally:
            if should_close:
                await client.aclose()

    async def activate(
        self,
        publish_record_id: str,
        platform_video_id: str,
        scheduled_at: Optional[datetime] = None,
    ) -> PublishAdapterResult:
        """
        Yüklenen videoyu public veya scheduled yap.

        Args:
            publish_record_id  : İzleme ID'si (log için).
            platform_video_id  : upload() sonrası alınan YouTube video ID'si.
            scheduled_at       : None ise hemen public yap. Varsa scheduled yap.
                                 Timezone-aware UTC datetime beklenir.

        Returns:
            PublishAdapterResult(success=True, platform_video_id=..., platform_url=...)

        Raises:
            YouTubeAuthError         : Token geçersiz.
            YouTubeQuotaExceededError: Kota aşıldı.
            YouTubeRateLimitError    : Geçici rate limit.
            YouTubeVideoNotFoundError: Video bulunamadı (upload yeniden yapılmalı).
            YouTubeActivateError     : Diğer aktivasyon hataları.
        """
        access_token = await self._token_store.get_access_token()

        # Publish durumu hazırla
        if scheduled_at is None:
            privacy_status = "public"
            status_payload = {"privacyStatus": privacy_status}
        else:
            privacy_status = "private"  # scheduled = önce private, sonra otomatik public
            # YouTube publish_at: RFC3339 format
            if scheduled_at.tzinfo is None:
                scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
            publish_at = scheduled_at.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            status_payload = {
                "privacyStatus": "private",
                "publishAt": publish_at,
            }

        video_resource = {
            "id": platform_video_id,
            "status": status_payload,
        }

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        }

        params = {"part": "status"}

        logger.info(
            "YouTubeAdapter.activate başlatıldı: video_id=%s privacy=%s publish_record_id=%s",
            platform_video_id, privacy_status, publish_record_id
        )

        client = self._get_client()
        should_close = self._http_client is None

        try:
            resp = await client.put(
                _YT_VIDEOS_URL,
                headers=headers,
                params=params,
                content=json.dumps(video_resource, ensure_ascii=False).encode(),
            )

            _check_auth_or_quota(resp)

            if resp.status_code == 404:
                raise YouTubeVideoNotFoundError(platform_video_id)

            if resp.status_code not in (200, 201):
                reason, msg = _parse_youtube_error(resp)
                raise YouTubeActivateError(
                    f"Video aktivasyon başarısız (HTTP {resp.status_code}): {msg}",
                    error_code=reason,
                )

            resp_data = resp.json()
            platform_url = _youtube_url(platform_video_id)
            logger.info(
                "YouTubeAdapter.activate tamamlandı: video_id=%s url=%s publish_record_id=%s",
                platform_video_id, platform_url, publish_record_id
            )
            return PublishAdapterResult(
                success=True,
                platform_video_id=platform_video_id,
                platform_url=platform_url,
                raw_response=resp_data,
            )

        finally:
            if should_close:
                await client.aclose()
