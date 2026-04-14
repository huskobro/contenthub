"""
YouTube Analytics API v2 Client — Sprint 1 (Faz YT-A1).

Gercek YouTube metriklerini (views, watch time, retention, demographics,
traffic sources, device breakdown) `youtubeAnalytics.reports.query` endpoint'i
uzerinden ceker.

Bu client'in tek sorumlulugu:
  - access_token ile reports.query cagrisi yapmak
  - pagination + error mapping + retry guvenligi saglamak
  - response'lari temel dict/list yapisina normalize etmek

Retention curve, demographics, traffic source gibi anlamli uretim mantigi
bu client'in ustunde duran `youtube_analytics_service.py`'de yasar.

Scope gereksinimi:
  https://www.googleapis.com/auth/yt-analytics.readonly

Bu scope yoksa `YouTubeAnalyticsScopeError` firlatilir ve arama tarafi
PlatformConnection.requires_reauth = True bayragini set etmelidir.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Optional

import httpx

from app.publish.adapter import PublishAdapterError
from app.publish.youtube.errors import (
    YouTubeAuthError,
    YouTubeQuotaExceededError,
    YouTubeRateLimitError,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Endpoint & scope constants
# ---------------------------------------------------------------------------

YOUTUBE_ANALYTICS_BASE = "https://youtubeanalytics.googleapis.com/v2/reports"
YOUTUBE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly"
YOUTUBE_ANALYTICS_MONETARY_SCOPE = (
    "https://www.googleapis.com/auth/yt-analytics-monetary.readonly"
)

# Default HTTP timeout (seconds) — Analytics API is slower than Data API
DEFAULT_TIMEOUT = 30.0


# ---------------------------------------------------------------------------
# Analytics-specific errors
# ---------------------------------------------------------------------------


class YouTubeAnalyticsScopeError(PublishAdapterError):
    """
    yt-analytics.readonly scope yok.

    Cagri tarafi:
      - PlatformConnection.requires_reauth = True set etmeli
      - scope_status = 'insufficient' yapmali
      - Kullaniciya 'Analytics icin yeniden yetkilendirin' mesaji gostermeli
    retryable=False: scope grant olmadan retry anlamsiz.
    """

    def __init__(
        self,
        message: str = (
            "YouTube Analytics scope eksik — yt-analytics.readonly scope grant edilmemis. "
            "Kanal ayarlarindan yeniden yetkilendirme yapin."
        ),
    ):
        super().__init__(message, error_code="analytics_scope_missing", retryable=False)


class YouTubeAnalyticsNoDataError(PublishAdapterError):
    """
    Sorgu gecerli ama hic veri donmedi.

    Yeni yuklenmis video icin normal (YouTube Analytics 24-48 saat gecikmeli).
    retryable=False: aramak yerine daha sonra cagirmak gerek.
    """

    def __init__(self, message: str = "YouTube Analytics henuz veri saglamadi."):
        super().__init__(message, error_code="analytics_no_data", retryable=False)


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


class YouTubeAnalyticsClient:
    """
    YouTube Analytics API v2 client.

    Kullanim:
        client = YouTubeAnalyticsClient()
        data = await client.query_reports(
            access_token=token,
            ids="channel==MINE",
            start_date="2025-01-01",
            end_date="2025-01-31",
            metrics=["views", "estimatedMinutesWatched"],
            dimensions=["day"],
            filters='video==abc123',
        )
    """

    def __init__(
        self,
        http_client: Optional[httpx.AsyncClient] = None,
        timeout: float = DEFAULT_TIMEOUT,
    ):
        self._http_client = http_client
        self._timeout = timeout

    def _get_client(self) -> tuple[httpx.AsyncClient, bool]:
        """Return (client, should_close). should_close=True when we created it."""
        if self._http_client is not None:
            return self._http_client, False
        return httpx.AsyncClient(timeout=self._timeout), True

    async def query_reports(
        self,
        *,
        access_token: str,
        ids: str = "channel==MINE",
        start_date: str,
        end_date: str,
        metrics: list[str],
        dimensions: Optional[list[str]] = None,
        filters: Optional[str] = None,
        sort: Optional[str] = None,
        max_results: Optional[int] = None,
        start_index: Optional[int] = None,
        currency: Optional[str] = None,
    ) -> dict:
        """
        `youtubeAnalytics.reports.query` cagrisi yapar.

        Args:
            access_token : OAuth2 access token (valid).
            ids          : Kanal veya sahip tanimlayicisi. Default 'channel==MINE'.
            start_date   : ISO format (YYYY-MM-DD).
            end_date     : ISO format (YYYY-MM-DD).
            metrics      : ["views", "estimatedMinutesWatched", ...]
            dimensions   : ["day", "video", "country", ...] (optional).
            filters      : "video==abc;country==US" (optional).
            sort         : "-views" (optional).
            max_results  : 1-200 (optional).
            start_index  : pagination (optional).

        Returns:
            YouTube Analytics API ham yanit dict'i:
            {
              "kind": "youtubeAnalytics#resultTable",
              "columnHeaders": [{"name": "day", "columnType": "DIMENSION", "dataType": "STRING"}, ...],
              "rows": [["2025-01-01", 12345, 67.5], ...]
            }

        Raises:
            YouTubeAuthError            : 401.
            YouTubeAnalyticsScopeError  : 403 (scope missing).
            YouTubeQuotaExceededError   : 403 (quota).
            YouTubeRateLimitError       : 429.
            PublishAdapterError         : 4xx/5xx other.
        """
        params: dict[str, str] = {
            "ids": ids,
            "startDate": start_date,
            "endDate": end_date,
            "metrics": ",".join(metrics),
        }
        if dimensions:
            params["dimensions"] = ",".join(dimensions)
        if filters:
            params["filters"] = filters
        if sort:
            params["sort"] = sort
        if max_results is not None:
            params["maxResults"] = str(max_results)
        if start_index is not None:
            params["startIndex"] = str(start_index)
        if currency:
            params["currency"] = currency

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        client, should_close = self._get_client()
        try:
            resp = await client.get(
                YOUTUBE_ANALYTICS_BASE,
                params=params,
                headers=headers,
            )
        except httpx.HTTPError as err:
            raise PublishAdapterError(
                f"YouTube Analytics HTTP hatasi: {err}",
                error_code="analytics_http_error",
                retryable=True,
            ) from err
        finally:
            if should_close:
                await client.aclose()

        return self._handle_response(resp)

    def _handle_response(self, resp: httpx.Response) -> dict:
        """Map HTTP responses to appropriate errors or return parsed JSON."""
        if resp.status_code == 200:
            try:
                return resp.json()
            except ValueError as err:
                raise PublishAdapterError(
                    f"YouTube Analytics JSON parse hatasi: {err}",
                    error_code="analytics_parse_error",
                    retryable=True,
                ) from err

        status = resp.status_code
        body_preview = resp.text[:500]

        if status == 401:
            raise YouTubeAuthError(
                f"YouTube Analytics 401 — token gecersiz: {body_preview}",
                error_code="analytics_unauthorized",
            )

        if status == 403:
            # 403 hem scope hem quota olabilir — body'den ayirt et
            lowered = body_preview.lower()
            if (
                "insufficientpermissions" in lowered
                or "forbidden" in lowered
                and "scope" in lowered
            ):
                raise YouTubeAnalyticsScopeError()
            if "quota" in lowered or "dailylimitexceeded" in lowered:
                raise YouTubeQuotaExceededError(
                    f"YouTube Analytics quota: {body_preview}"
                )
            # Fallback — muhtemelen scope eksik
            raise YouTubeAnalyticsScopeError(
                f"YouTube Analytics 403 — scope eksik: {body_preview}"
            )

        if status == 429:
            raise YouTubeRateLimitError(
                f"YouTube Analytics 429 rate limit: {body_preview}"
            )

        if 500 <= status < 600:
            raise PublishAdapterError(
                f"YouTube Analytics {status} transient: {body_preview}",
                error_code="analytics_transient_error",
                retryable=True,
            )

        raise PublishAdapterError(
            f"YouTube Analytics HTTP {status}: {body_preview}",
            error_code="analytics_http_error",
            retryable=False,
        )


# ---------------------------------------------------------------------------
# Metric / dimension catalogs — used by service layer
# ---------------------------------------------------------------------------

# Channel-level core metrics (time series / totals)
CHANNEL_CORE_METRICS = [
    "views",
    "estimatedMinutesWatched",
    "averageViewDuration",
    "averageViewPercentage",
    "subscribersGained",
    "subscribersLost",
    "likes",
    "shares",
    "comments",
]

# Video-level detailed metrics — "Top videos (Basic stats)" report.
# Not: Kart metrikleri (cardImpressions/cardClicks/cardClickRate) bu raporda
# desteklenmez; YouTube Analytics'te "Engagement reports" altinda ayri bir
# sorgu gerektirir. Karistirildiginda Google 400 "query is not supported"
# dondurur, bu yuzden burada kapsam disinda birakiyoruz.
VIDEO_DETAIL_METRICS = [
    "views",
    "estimatedMinutesWatched",
    "averageViewDuration",
    "averageViewPercentage",
    "likes",
    "shares",
    "comments",
    "subscribersGained",
]

# Engagement card / end-screen metrics
ENGAGEMENT_METRICS = [
    "cardImpressions",
    "cardClicks",
    "cardClickRate",
    "endScreenElementImpressions",
    "endScreenElementClicks",
    "endScreenElementClickRate",
]


def default_date_range(days: int = 28) -> tuple[str, str]:
    """Return (start_date, end_date) as YYYY-MM-DD strings, inclusive."""
    end = date.today() - timedelta(days=1)  # yesterday (today data nadiren complete)
    start = end - timedelta(days=days - 1)
    return start.isoformat(), end.isoformat()


def rows_to_dicts(response: dict) -> list[dict]:
    """
    Convert reports.query response to a list of row dicts keyed by column name.

    Input:
      {"columnHeaders": [{"name": "day"}, {"name": "views"}], "rows": [["2025-01-01", 123]]}
    Output:
      [{"day": "2025-01-01", "views": 123}]
    """
    headers = response.get("columnHeaders", [])
    rows = response.get("rows") or []
    keys = [h.get("name", f"col_{i}") for i, h in enumerate(headers)]
    return [dict(zip(keys, row)) for row in rows]


def scale_metric_value(raw: float, metric: str) -> float:
    """
    Normalize metric values to sensible units.

    - averageViewPercentage: already 0-100 from API, normalize to 0-1.
    - averageViewDuration: seconds (unchanged).
    - rates (cardClickRate etc.): 0-1 (unchanged).
    - counts: integer/float (unchanged).
    """
    if metric == "averageViewPercentage" and raw is not None:
        return float(raw) / 100.0
    return float(raw) if raw is not None else 0.0
