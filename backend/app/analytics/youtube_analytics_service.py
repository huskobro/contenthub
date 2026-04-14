"""
YouTube Analytics API v2 Service — Sprint 1 (Faz YT-A1).

`YouTubeAnalyticsClient`'in uzerinde duran iş katmani.
Gercek YouTube metriklerini cekip snapshot tablolarina yazar.

Sorumluluklar:
  1. `fetch_and_store_*` — bir PlatformConnection icin Analytics API'yi
     cagir, donen ham satirlari dogrudan snapshot tablolarina upsert et.
  2. `read_*` — dashboard icin hazir okuma sorgulari (filter + aggregate).
  3. `run_daily_sync` — scheduler'in cagirdigi orchestrator; tum aktif
     YouTube connection'lari icin dun'un verilerini ceker.

Tek baslangic noktasi DBYouTubeTokenStore'dan access_token alip
YouTubeAnalyticsClient'i cagirmak. Token store scope kontrolunu kendi
yapar; biz 403 gordugumuzde PlatformConnection.requires_reauth set ederiz.

Bu servis mevcut `analytics/service.py`'yi (local publish aggregation)
DEGISTIRMEZ. Paralel olarak calisir. Frontend her iki kaynaktan da
okuyabilir.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    PlatformConnection,
    PlatformCredential,
    YouTubeAnalyticsSyncLog,
    YouTubeAudienceRetention,
    YouTubeChannelAnalyticsDaily,
    YouTubeDemographicsSnapshot,
    YouTubeDeviceSnapshot,
    YouTubeTrafficSourceSnapshot,
    YouTubeVideoAnalyticsDaily,
)
from app.publish.adapter import PublishAdapterError
from app.publish.youtube.analytics_client import (
    CHANNEL_CORE_METRICS,
    VIDEO_DETAIL_METRICS,
    YOUTUBE_ANALYTICS_SCOPE,
    YouTubeAnalyticsClient,
    YouTubeAnalyticsNoDataError,
    YouTubeAnalyticsScopeError,
    default_date_range,
    rows_to_dicts,
    scale_metric_value,
)
from app.publish.youtube.errors import YouTubeAuthError
from app.publish.youtube.token_store import DBYouTubeTokenStore

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Minimum gecikme — YouTube Analytics 24-48 saat gecikmeli veri saglar
ANALYTICS_LAG_DAYS = 1

# Varsayilan sync pencereleri
DEFAULT_DAILY_WINDOW_DAYS = 1       # scheduler her gun sadece dun'u ceker
DEFAULT_BACKFILL_DAYS = 28           # manuel backfill icin
DEFAULT_RETENTION_WINDOW_DAYS = 28   # retention curve icin pencere


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _load_connection(
    db: AsyncSession, connection_id: str
) -> Optional[PlatformConnection]:
    stmt = select(PlatformConnection).where(PlatformConnection.id == connection_id)
    return (await db.execute(stmt)).scalars().first()


def _has_analytics_scope(conn: PlatformConnection) -> bool:
    """Check whether scopes_granted JSON contains yt-analytics.readonly."""
    raw = conn.scopes_granted or ""
    if not raw:
        return False
    # Token store writes scope as space-separated (from Google); admin stores
    # as JSON list. Handle both.
    if raw.startswith("["):
        import json
        try:
            parsed = json.loads(raw)
            return YOUTUBE_ANALYTICS_SCOPE in parsed
        except json.JSONDecodeError:
            return False
    return YOUTUBE_ANALYTICS_SCOPE in raw.split()


async def _mark_requires_reauth(
    db: AsyncSession, conn: PlatformConnection, reason: str
) -> None:
    conn.requires_reauth = True
    conn.scope_status = "insufficient"
    conn.last_error = reason[:1000]
    conn.updated_at = datetime.now(timezone.utc)
    await db.commit()
    logger.warning(
        "Marked YouTube connection %s as requires_reauth: %s",
        conn.id, reason,
    )


# ---------------------------------------------------------------------------
# Upsert helpers
# ---------------------------------------------------------------------------


async def _upsert_channel_daily(
    db: AsyncSession,
    connection_id: str,
    snapshot_date: str,
    metrics: dict,
) -> int:
    """Upsert one row in youtube_channel_analytics_daily."""
    stmt = select(YouTubeChannelAnalyticsDaily).where(
        YouTubeChannelAnalyticsDaily.platform_connection_id == connection_id,
        YouTubeChannelAnalyticsDaily.snapshot_date == snapshot_date,
    )
    row = (await db.execute(stmt)).scalars().first()
    if row is None:
        row = YouTubeChannelAnalyticsDaily(
            platform_connection_id=connection_id,
            snapshot_date=snapshot_date,
        )
        db.add(row)

    row.views = int(metrics.get("views", 0) or 0)
    row.estimated_minutes_watched = int(
        metrics.get("estimatedMinutesWatched", 0) or 0
    )
    row.average_view_duration_seconds = float(
        metrics.get("averageViewDuration", 0) or 0
    )
    row.average_view_percentage = scale_metric_value(
        metrics.get("averageViewPercentage", 0) or 0,
        "averageViewPercentage",
    )
    row.subscribers_gained = int(metrics.get("subscribersGained", 0) or 0)
    row.subscribers_lost = int(metrics.get("subscribersLost", 0) or 0)
    row.likes = int(metrics.get("likes", 0) or 0)
    row.shares = int(metrics.get("shares", 0) or 0)
    row.comments = int(metrics.get("comments", 0) or 0)
    row.fetched_at = datetime.now(timezone.utc)
    return 1


async def _upsert_video_daily(
    db: AsyncSession,
    connection_id: str,
    video_id: str,
    snapshot_date: str,
    metrics: dict,
) -> int:
    """Upsert one row in youtube_video_analytics_daily."""
    stmt = select(YouTubeVideoAnalyticsDaily).where(
        YouTubeVideoAnalyticsDaily.platform_connection_id == connection_id,
        YouTubeVideoAnalyticsDaily.platform_video_id == video_id,
        YouTubeVideoAnalyticsDaily.snapshot_date == snapshot_date,
    )
    row = (await db.execute(stmt)).scalars().first()
    if row is None:
        row = YouTubeVideoAnalyticsDaily(
            platform_connection_id=connection_id,
            platform_video_id=video_id,
            snapshot_date=snapshot_date,
        )
        db.add(row)

    row.views = int(metrics.get("views", 0) or 0)
    row.estimated_minutes_watched = int(
        metrics.get("estimatedMinutesWatched", 0) or 0
    )
    row.average_view_duration_seconds = float(
        metrics.get("averageViewDuration", 0) or 0
    )
    row.average_view_percentage = scale_metric_value(
        metrics.get("averageViewPercentage", 0) or 0,
        "averageViewPercentage",
    )
    row.likes = int(metrics.get("likes", 0) or 0)
    row.shares = int(metrics.get("shares", 0) or 0)
    row.comments = int(metrics.get("comments", 0) or 0)
    row.subscribers_gained = int(metrics.get("subscribersGained", 0) or 0)
    # Kart metrikleri bu raporda dondurulmuyor (YouTube Analytics "Top
    # videos" Engagement metriklerini karistirmayi desteklemez); sutunlar
    # mevcut ise 0'da birakiliyor. Ileride Engagement raporu icin ayri
    # fetch eklenirse burada ustune yazacak.
    row.card_impressions = int(metrics.get("cardImpressions", 0) or 0)
    row.card_clicks = int(metrics.get("cardClicks", 0) or 0)
    row.card_click_rate = float(metrics.get("cardClickRate", 0) or 0)
    row.fetched_at = datetime.now(timezone.utc)
    return 1


# ---------------------------------------------------------------------------
# Fetch & store operations
# ---------------------------------------------------------------------------


class YouTubeAnalyticsService:
    """
    High-level orchestrator.

    Calls Analytics client, upserts snapshots, updates sync log,
    and handles scope/error conditions centrally.
    """

    def __init__(
        self,
        client: Optional[YouTubeAnalyticsClient] = None,
        token_store: Optional[DBYouTubeTokenStore] = None,
    ):
        self.client = client or YouTubeAnalyticsClient()
        self.token_store = token_store or DBYouTubeTokenStore()

    # -- Public API -------------------------------------------------------

    async def fetch_channel_daily(
        self,
        db: AsyncSession,
        connection_id: str,
        start_date: str,
        end_date: str,
    ) -> int:
        """Fetch day-by-day channel metrics. Returns rows written."""
        conn = await _load_connection(db, connection_id)
        if conn is None:
            logger.warning("connection %s not found", connection_id)
            return 0
        if not _has_analytics_scope(conn):
            await _mark_requires_reauth(
                db, conn,
                "yt-analytics.readonly scope yok — reauth gerekli.",
            )
            return 0

        try:
            token = await self.token_store.get_access_token(db, connection_id)
        except YouTubeAuthError as err:
            logger.warning("auth failed for %s: %s", connection_id, err)
            return 0

        try:
            resp = await self.client.query_reports(
                access_token=token,
                ids="channel==MINE",
                start_date=start_date,
                end_date=end_date,
                metrics=CHANNEL_CORE_METRICS,
                dimensions=["day"],
                sort="day",
            )
        except YouTubeAnalyticsScopeError as err:
            await _mark_requires_reauth(db, conn, str(err))
            return 0
        except YouTubeAnalyticsNoDataError:
            return 0
        except PublishAdapterError as err:
            logger.warning(
                "channel daily fetch failed for %s: %s", connection_id, err,
            )
            raise

        rows = rows_to_dicts(resp)
        written = 0
        for row in rows:
            day = row.get("day")
            if not day:
                continue
            written += await _upsert_channel_daily(db, connection_id, day, row)
        await db.commit()
        logger.info(
            "channel daily snapshot: conn=%s rows=%d window=%s..%s",
            connection_id, written, start_date, end_date,
        )
        return written

    async def fetch_video_daily(
        self,
        db: AsyncSession,
        connection_id: str,
        start_date: str,
        end_date: str,
        *,
        max_videos: int = 50,
    ) -> int:
        """
        Fetch top videos (sorted by views) with per-video aggregate metrics.

        Not: YouTube Analytics `dimensions=video,day` kombinasyonunu ("Top
        videos" raporunun time-series varyanti) desteklemez — Google 400
        "The query is not supported" dondurur. Desteklenen rapor yalnizca
        `dimensions=video` olup her video icin pencere toplamini verir. Bu
        yuzden her video icin pencere-sonu (end_date) ile tek snapshot
        yaziyoruz; row.snapshot_date = end_date.
        """
        conn = await _load_connection(db, connection_id)
        if conn is None:
            return 0
        if not _has_analytics_scope(conn):
            await _mark_requires_reauth(
                db, conn, "yt-analytics.readonly scope yok",
            )
            return 0

        try:
            token = await self.token_store.get_access_token(db, connection_id)
        except YouTubeAuthError as err:
            logger.warning("auth failed for %s: %s", connection_id, err)
            return 0

        try:
            resp = await self.client.query_reports(
                access_token=token,
                ids="channel==MINE",
                start_date=start_date,
                end_date=end_date,
                metrics=VIDEO_DETAIL_METRICS,
                dimensions=["video"],
                sort="-views",
                max_results=max_videos,
            )
        except YouTubeAnalyticsScopeError as err:
            await _mark_requires_reauth(db, conn, str(err))
            return 0
        except PublishAdapterError as err:
            logger.warning("video daily fetch failed for %s: %s", connection_id, err)
            raise

        rows = rows_to_dicts(resp)
        written = 0
        for row in rows:
            video_id = row.get("video")
            if not video_id:
                continue
            # Pencere-sonu snapshot'i: her video icin tek satir, tarih = end_date.
            written += await _upsert_video_daily(
                db, connection_id, video_id, end_date, row,
            )
        await db.commit()
        logger.info(
            "video aggregate snapshot: conn=%s rows=%d window=%s..%s",
            connection_id, written, start_date, end_date,
        )
        return written

    async def fetch_audience_retention(
        self,
        db: AsyncSession,
        connection_id: str,
        video_id: str,
        start_date: str,
        end_date: str,
    ) -> int:
        """
        Fetch retention curve for a single video.

        Uses `elapsedVideoTimeRatio` dimension. Deletes existing rows
        for this (conn, video, window) and writes fresh data.
        """
        conn = await _load_connection(db, connection_id)
        if conn is None or not _has_analytics_scope(conn):
            return 0

        try:
            token = await self.token_store.get_access_token(db, connection_id)
        except YouTubeAuthError:
            return 0

        try:
            resp = await self.client.query_reports(
                access_token=token,
                ids="channel==MINE",
                start_date=start_date,
                end_date=end_date,
                metrics=["audienceWatchRatio", "relativeRetentionPerformance"],
                dimensions=["elapsedVideoTimeRatio"],
                filters=f"video=={video_id}",
            )
        except YouTubeAnalyticsScopeError as err:
            await _mark_requires_reauth(db, conn, str(err))
            return 0
        except PublishAdapterError as err:
            logger.warning("retention fetch failed: %s", err)
            return 0

        rows = rows_to_dicts(resp)

        # Clear old rows for this (conn, video, window)
        await db.execute(
            delete(YouTubeAudienceRetention).where(
                YouTubeAudienceRetention.platform_connection_id == connection_id,
                YouTubeAudienceRetention.platform_video_id == video_id,
                YouTubeAudienceRetention.window_start == start_date,
                YouTubeAudienceRetention.window_end == end_date,
            )
        )

        written = 0
        for row in rows:
            ratio = row.get("elapsedVideoTimeRatio")
            if ratio is None:
                continue
            db.add(
                YouTubeAudienceRetention(
                    platform_connection_id=connection_id,
                    platform_video_id=video_id,
                    elapsed_ratio=float(ratio),
                    audience_watch_ratio=float(
                        row.get("audienceWatchRatio", 0) or 0
                    ),
                    relative_retention_performance=float(
                        row.get("relativeRetentionPerformance", 0) or 0
                    ),
                    window_start=start_date,
                    window_end=end_date,
                )
            )
            written += 1
        await db.commit()
        return written

    async def fetch_demographics(
        self,
        db: AsyncSession,
        connection_id: str,
        start_date: str,
        end_date: str,
        video_id: str = "",
    ) -> int:
        """Fetch ageGroup × gender breakdown."""
        conn = await _load_connection(db, connection_id)
        if conn is None or not _has_analytics_scope(conn):
            return 0

        try:
            token = await self.token_store.get_access_token(db, connection_id)
        except YouTubeAuthError:
            return 0

        try:
            resp = await self.client.query_reports(
                access_token=token,
                ids="channel==MINE",
                start_date=start_date,
                end_date=end_date,
                metrics=["viewerPercentage"],
                dimensions=["ageGroup", "gender"],
                filters=f"video=={video_id}" if video_id else None,
            )
        except YouTubeAnalyticsScopeError as err:
            await _mark_requires_reauth(db, conn, str(err))
            return 0
        except PublishAdapterError:
            return 0

        rows = rows_to_dicts(resp)

        # Clear existing for this window
        await db.execute(
            delete(YouTubeDemographicsSnapshot).where(
                YouTubeDemographicsSnapshot.platform_connection_id == connection_id,
                YouTubeDemographicsSnapshot.platform_video_id == (video_id or ""),
                YouTubeDemographicsSnapshot.window_start == start_date,
                YouTubeDemographicsSnapshot.window_end == end_date,
            )
        )

        written = 0
        for row in rows:
            age = row.get("ageGroup") or "unknown"
            gen = row.get("gender") or "unknown"
            pct = scale_metric_value(
                row.get("viewerPercentage", 0) or 0, "averageViewPercentage"
            )
            db.add(
                YouTubeDemographicsSnapshot(
                    platform_connection_id=connection_id,
                    platform_video_id=video_id or "",
                    age_group=str(age),
                    gender=str(gen),
                    viewer_percentage=pct,
                    window_start=start_date,
                    window_end=end_date,
                )
            )
            written += 1
        await db.commit()
        return written

    async def fetch_traffic_sources(
        self,
        db: AsyncSession,
        connection_id: str,
        start_date: str,
        end_date: str,
        video_id: str = "",
    ) -> int:
        """Fetch insightTrafficSourceType breakdown."""
        conn = await _load_connection(db, connection_id)
        if conn is None or not _has_analytics_scope(conn):
            return 0

        try:
            token = await self.token_store.get_access_token(db, connection_id)
        except YouTubeAuthError:
            return 0

        try:
            resp = await self.client.query_reports(
                access_token=token,
                ids="channel==MINE",
                start_date=start_date,
                end_date=end_date,
                metrics=["views", "estimatedMinutesWatched"],
                dimensions=["insightTrafficSourceType"],
                filters=f"video=={video_id}" if video_id else None,
            )
        except YouTubeAnalyticsScopeError as err:
            await _mark_requires_reauth(db, conn, str(err))
            return 0
        except PublishAdapterError:
            return 0

        rows = rows_to_dicts(resp)

        await db.execute(
            delete(YouTubeTrafficSourceSnapshot).where(
                YouTubeTrafficSourceSnapshot.platform_connection_id == connection_id,
                YouTubeTrafficSourceSnapshot.platform_video_id == (video_id or ""),
                YouTubeTrafficSourceSnapshot.window_start == start_date,
                YouTubeTrafficSourceSnapshot.window_end == end_date,
            )
        )

        written = 0
        for row in rows:
            src = row.get("insightTrafficSourceType") or "UNKNOWN"
            db.add(
                YouTubeTrafficSourceSnapshot(
                    platform_connection_id=connection_id,
                    platform_video_id=video_id or "",
                    traffic_source_type=str(src),
                    views=int(row.get("views", 0) or 0),
                    estimated_minutes_watched=int(
                        row.get("estimatedMinutesWatched", 0) or 0
                    ),
                    window_start=start_date,
                    window_end=end_date,
                )
            )
            written += 1
        await db.commit()
        return written

    async def fetch_device_breakdown(
        self,
        db: AsyncSession,
        connection_id: str,
        start_date: str,
        end_date: str,
        video_id: str = "",
    ) -> int:
        """Fetch deviceType breakdown."""
        conn = await _load_connection(db, connection_id)
        if conn is None or not _has_analytics_scope(conn):
            return 0

        try:
            token = await self.token_store.get_access_token(db, connection_id)
        except YouTubeAuthError:
            return 0

        try:
            resp = await self.client.query_reports(
                access_token=token,
                ids="channel==MINE",
                start_date=start_date,
                end_date=end_date,
                metrics=["views", "estimatedMinutesWatched"],
                dimensions=["deviceType"],
                filters=f"video=={video_id}" if video_id else None,
            )
        except YouTubeAnalyticsScopeError as err:
            await _mark_requires_reauth(db, conn, str(err))
            return 0
        except PublishAdapterError:
            return 0

        rows = rows_to_dicts(resp)

        await db.execute(
            delete(YouTubeDeviceSnapshot).where(
                YouTubeDeviceSnapshot.platform_connection_id == connection_id,
                YouTubeDeviceSnapshot.platform_video_id == (video_id or ""),
                YouTubeDeviceSnapshot.window_start == start_date,
                YouTubeDeviceSnapshot.window_end == end_date,
            )
        )

        written = 0
        for row in rows:
            dev = row.get("deviceType") or "UNKNOWN"
            db.add(
                YouTubeDeviceSnapshot(
                    platform_connection_id=connection_id,
                    platform_video_id=video_id or "",
                    device_type=str(dev),
                    views=int(row.get("views", 0) or 0),
                    estimated_minutes_watched=int(
                        row.get("estimatedMinutesWatched", 0) or 0
                    ),
                    window_start=start_date,
                    window_end=end_date,
                )
            )
            written += 1
        await db.commit()
        return written

    # -- Orchestration -----------------------------------------------------

    async def run_sync(
        self,
        db: AsyncSession,
        connection_id: str,
        *,
        window_days: int = DEFAULT_BACKFILL_DAYS,
        trigger_source: str = "scheduler",
        run_kind: str = "daily",
    ) -> YouTubeAnalyticsSyncLog:
        """
        Sync one connection: channel daily + top videos + demographics +
        traffic sources + device breakdown.

        Writes a YouTubeAnalyticsSyncLog row for audit.
        """
        conn = await _load_connection(db, connection_id)
        if conn is None:
            raise ValueError(f"connection {connection_id} not found")

        log = YouTubeAnalyticsSyncLog(
            platform_connection_id=connection_id,
            run_kind=run_kind,
            status="running",
            trigger_source=trigger_source,
            started_at=datetime.now(timezone.utc),
        )
        db.add(log)
        await db.commit()
        await db.refresh(log)

        total_rows = 0
        error_msg: Optional[str] = None
        status = "ok"

        try:
            start, end = default_date_range(window_days)

            total_rows += await self.fetch_channel_daily(
                db, connection_id, start, end,
            )
            total_rows += await self.fetch_video_daily(
                db, connection_id, start, end, max_videos=50,
            )
            total_rows += await self.fetch_demographics(
                db, connection_id, start, end,
            )
            total_rows += await self.fetch_traffic_sources(
                db, connection_id, start, end,
            )
            total_rows += await self.fetch_device_breakdown(
                db, connection_id, start, end,
            )
        except YouTubeAnalyticsScopeError as err:
            status = "failed"
            error_msg = str(err)
        except PublishAdapterError as err:
            status = "partial" if total_rows > 0 else "failed"
            error_msg = str(err)
        except Exception as err:  # noqa: BLE001
            status = "failed"
            error_msg = f"unexpected: {err}"

        # Re-fetch log (commit during fetch could have expired it)
        log = (
            await db.execute(
                select(YouTubeAnalyticsSyncLog).where(
                    YouTubeAnalyticsSyncLog.id == log.id,
                )
            )
        ).scalars().first()
        if log is not None:
            log.status = status
            log.rows_written = total_rows
            log.error_message = error_msg[:1000] if error_msg else None
            log.finished_at = datetime.now(timezone.utc)
            await db.commit()
        return log

    async def run_daily_sync_all(
        self,
        db: AsyncSession,
        *,
        trigger_source: str = "scheduler",
    ) -> list[dict]:
        """
        Daily scheduler entry: sync every active YouTube connection.

        Returns per-connection result summary.
        """
        stmt = select(PlatformConnection).where(
            PlatformConnection.platform == "youtube",
            PlatformConnection.connection_status == "connected",
            PlatformConnection.requires_reauth == False,  # noqa: E712
        )
        conns = (await db.execute(stmt)).scalars().all()
        results: list[dict] = []
        for conn in conns:
            try:
                log = await self.run_sync(
                    db, conn.id,
                    window_days=DEFAULT_DAILY_WINDOW_DAYS + ANALYTICS_LAG_DAYS + 1,
                    trigger_source=trigger_source,
                    run_kind="daily",
                )
                results.append({
                    "connection_id": conn.id,
                    "status": log.status,
                    "rows_written": log.rows_written,
                    "error": log.error_message,
                })
            except Exception as err:  # noqa: BLE001
                logger.exception(
                    "daily sync exception for %s: %s", conn.id, err,
                )
                results.append({
                    "connection_id": conn.id,
                    "status": "failed",
                    "rows_written": 0,
                    "error": str(err),
                })
        return results


# ---------------------------------------------------------------------------
# Read-side aggregates (dashboard queries)
# ---------------------------------------------------------------------------


async def read_channel_totals(
    db: AsyncSession,
    connection_id: str,
    window_days: int = 28,
) -> dict:
    """Aggregate channel-level totals over last N days from snapshots."""
    cutoff = (date.today() - timedelta(days=window_days + 1)).isoformat()

    stmt = select(YouTubeChannelAnalyticsDaily).where(
        YouTubeChannelAnalyticsDaily.platform_connection_id == connection_id,
        YouTubeChannelAnalyticsDaily.snapshot_date >= cutoff,
    ).order_by(YouTubeChannelAnalyticsDaily.snapshot_date)

    rows = (await db.execute(stmt)).scalars().all()
    if not rows:
        return {
            "window_days": window_days,
            "daily": [],
            "totals": {
                "views": 0,
                "estimated_minutes_watched": 0,
                "subscribers_net": 0,
                "likes": 0,
                "shares": 0,
                "comments": 0,
            },
            "averages": {
                "average_view_duration_seconds": 0,
                "average_view_percentage": 0,
            },
        }

    daily = [
        {
            "date": r.snapshot_date,
            "views": r.views,
            "estimated_minutes_watched": r.estimated_minutes_watched,
            "average_view_duration_seconds": r.average_view_duration_seconds,
            "average_view_percentage": r.average_view_percentage,
            "subscribers_gained": r.subscribers_gained,
            "subscribers_lost": r.subscribers_lost,
            "likes": r.likes,
            "shares": r.shares,
            "comments": r.comments,
        }
        for r in rows
    ]

    views_total = sum(r.views for r in rows)
    minutes_total = sum(r.estimated_minutes_watched for r in rows)
    subs_net = sum(r.subscribers_gained - r.subscribers_lost for r in rows)

    return {
        "window_days": window_days,
        "daily": daily,
        "totals": {
            "views": views_total,
            "estimated_minutes_watched": minutes_total,
            "subscribers_net": subs_net,
            "likes": sum(r.likes for r in rows),
            "shares": sum(r.shares for r in rows),
            "comments": sum(r.comments for r in rows),
        },
        "averages": {
            "average_view_duration_seconds": (
                sum(r.average_view_duration_seconds for r in rows) / len(rows)
            ),
            "average_view_percentage": (
                sum(r.average_view_percentage for r in rows) / len(rows)
            ),
        },
    }


async def read_top_videos(
    db: AsyncSession,
    connection_id: str,
    window_days: int = 28,
    limit: int = 10,
) -> list[dict]:
    """Return top videos by views in window."""
    cutoff = (date.today() - timedelta(days=window_days + 1)).isoformat()

    stmt = select(YouTubeVideoAnalyticsDaily).where(
        YouTubeVideoAnalyticsDaily.platform_connection_id == connection_id,
        YouTubeVideoAnalyticsDaily.snapshot_date >= cutoff,
    )
    rows = (await db.execute(stmt)).scalars().all()

    agg: dict[str, dict] = {}
    for r in rows:
        a = agg.setdefault(r.platform_video_id, {
            "platform_video_id": r.platform_video_id,
            "views": 0,
            "estimated_minutes_watched": 0,
            "likes": 0,
            "shares": 0,
            "comments": 0,
            "average_view_duration_seconds": 0.0,
            "average_view_percentage": 0.0,
            "_count": 0,
        })
        a["views"] += r.views
        a["estimated_minutes_watched"] += r.estimated_minutes_watched
        a["likes"] += r.likes
        a["shares"] += r.shares
        a["comments"] += r.comments
        a["average_view_duration_seconds"] += r.average_view_duration_seconds
        a["average_view_percentage"] += r.average_view_percentage
        a["_count"] += 1

    out = []
    for a in agg.values():
        count = a.pop("_count") or 1
        a["average_view_duration_seconds"] /= count
        a["average_view_percentage"] /= count
        out.append(a)

    out.sort(key=lambda x: x["views"], reverse=True)
    return out[:limit]


async def read_retention_curve(
    db: AsyncSession,
    connection_id: str,
    video_id: str,
) -> list[dict]:
    """Return retention curve (ratio → watch_ratio) for a video."""
    stmt = select(YouTubeAudienceRetention).where(
        YouTubeAudienceRetention.platform_connection_id == connection_id,
        YouTubeAudienceRetention.platform_video_id == video_id,
    ).order_by(
        YouTubeAudienceRetention.window_end.desc(),
        YouTubeAudienceRetention.elapsed_ratio,
    )
    rows = (await db.execute(stmt)).scalars().all()

    # Take latest window only
    if not rows:
        return []
    latest_end = rows[0].window_end
    return [
        {
            "elapsed_ratio": r.elapsed_ratio,
            "audience_watch_ratio": r.audience_watch_ratio,
            "relative_retention_performance": r.relative_retention_performance,
        }
        for r in rows
        if r.window_end == latest_end
    ]


async def read_demographics(
    db: AsyncSession,
    connection_id: str,
    video_id: str = "",
) -> list[dict]:
    stmt = select(YouTubeDemographicsSnapshot).where(
        YouTubeDemographicsSnapshot.platform_connection_id == connection_id,
        YouTubeDemographicsSnapshot.platform_video_id == video_id,
    ).order_by(
        YouTubeDemographicsSnapshot.window_end.desc(),
    )
    rows = (await db.execute(stmt)).scalars().all()
    if not rows:
        return []
    latest = rows[0].window_end
    return [
        {
            "age_group": r.age_group,
            "gender": r.gender,
            "viewer_percentage": r.viewer_percentage,
        }
        for r in rows
        if r.window_end == latest
    ]


async def read_traffic_sources(
    db: AsyncSession,
    connection_id: str,
    video_id: str = "",
) -> list[dict]:
    stmt = select(YouTubeTrafficSourceSnapshot).where(
        YouTubeTrafficSourceSnapshot.platform_connection_id == connection_id,
        YouTubeTrafficSourceSnapshot.platform_video_id == video_id,
    ).order_by(YouTubeTrafficSourceSnapshot.window_end.desc())
    rows = (await db.execute(stmt)).scalars().all()
    if not rows:
        return []
    latest = rows[0].window_end
    return [
        {
            "traffic_source_type": r.traffic_source_type,
            "views": r.views,
            "estimated_minutes_watched": r.estimated_minutes_watched,
        }
        for r in rows
        if r.window_end == latest
    ]


async def read_devices(
    db: AsyncSession,
    connection_id: str,
    video_id: str = "",
) -> list[dict]:
    stmt = select(YouTubeDeviceSnapshot).where(
        YouTubeDeviceSnapshot.platform_connection_id == connection_id,
        YouTubeDeviceSnapshot.platform_video_id == video_id,
    ).order_by(YouTubeDeviceSnapshot.window_end.desc())
    rows = (await db.execute(stmt)).scalars().all()
    if not rows:
        return []
    latest = rows[0].window_end
    return [
        {
            "device_type": r.device_type,
            "views": r.views,
            "estimated_minutes_watched": r.estimated_minutes_watched,
        }
        for r in rows
        if r.window_end == latest
    ]


async def read_last_sync(
    db: AsyncSession,
    connection_id: str,
) -> Optional[dict]:
    """Return the most recent sync log entry for a connection."""
    stmt = select(YouTubeAnalyticsSyncLog).where(
        YouTubeAnalyticsSyncLog.platform_connection_id == connection_id,
    ).order_by(YouTubeAnalyticsSyncLog.started_at.desc()).limit(1)
    row = (await db.execute(stmt)).scalars().first()
    if row is None:
        return None
    return {
        "id": row.id,
        "status": row.status,
        "run_kind": row.run_kind,
        "trigger_source": row.trigger_source,
        "started_at": row.started_at.isoformat() if row.started_at else None,
        "finished_at": row.finished_at.isoformat() if row.finished_at else None,
        "rows_written": row.rows_written,
        "error_message": row.error_message,
    }
