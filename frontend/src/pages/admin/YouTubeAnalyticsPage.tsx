/**
 * YouTube Analytics — Full Channel Overview
 *
 * Shows ALL channel videos (not just ContentHub-published), with a clear
 * ContentHub badge on published videos. Fully theme-native: uses only
 * design system primitives, Tailwind token classes, and semantic --ch-* vars.
 *
 * Layout:
 *   1. Connection status banner (health at a glance)
 *   2. Channel header card (avatar, name, subscribers, video count)
 *   3. Metric tiles (quick KPIs from real data only)
 *   4. Filter bar + video table (all channel videos, filterable)
 *   5. Sheet detail panel (per-video deep info + trend)
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  useYouTubeStatus,
  useYouTubeChannelInfo,
  useChannelVideos,
  useVideoStatsTrend,
} from "../../hooks/useCredentials";
import type { ChannelVideoItem } from "../../api/credentialsApi";
import {
  PageShell,
  SectionShell,
  MetricTile,
  MetricGrid,
  DataTable,
  FilterBar,
  FilterInput,
  FilterSelect,
  StatusBadge,
  ActionButton,
  Pagination,
} from "../../components/design-system/primitives";
import { Sheet } from "../../components/design-system/Sheet";
import { EmptyState } from "../../components/design-system/EmptyState";
import { YouTubeVideoManagementSheet } from "../../components/youtube/YouTubeVideoManagementSheet";
import { cn } from "../../lib/cn";
import { formatDateShort, formatDateTime } from "../../lib/formatDate";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString("tr-TR");
}

function fmtNumFull(n: number): string {
  return n.toLocaleString("tr-TR");
}

function engagementRate(views: number, likes: number, comments: number): string {
  if (views === 0) return "—";
  return (((likes + comments) / views) * 100).toFixed(2) + "%";
}

function parseDuration(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "—";
  const h = parseInt(m[1] ?? "0");
  const min = parseInt(m[2] ?? "0");
  const sec = parseInt(m[3] ?? "0");
  if (h > 0) return `${h}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function isWithinDays(dateStr: string | null | undefined, days: number): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date >= cutoff;
}

// ---------------------------------------------------------------------------
// Sort / Filter types
// ---------------------------------------------------------------------------

type SourceFilter = "all" | "contenthub" | "other";
type SortKey = "newest" | "oldest" | "most_views" | "least_views";

const SOURCE_FILTER_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "contenthub", label: "ContentHub" },
  { value: "other", label: "Diğer" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "En Yeni" },
  { value: "oldest", label: "En Eski" },
  { value: "most_views", label: "En Çok Görüntülenen" },
  { value: "least_views", label: "En Az Görüntülenen" },
];

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Connection Status Banner
// ---------------------------------------------------------------------------

// Extracts the HTTP status code from an ApiError-like error object
function getErrorStatus(err: unknown): number | null {
  if (err && typeof err === "object" && "status" in err) {
    return (err as { status: number }).status;
  }
  return null;
}

function getErrorMessage(err: unknown): string | null {
  if (err instanceof Error) return err.message;
  return null;
}

function ConnectionBanner({
  isConnected,
  scopeOk,
  channelOk,
  videosError,
  channelError,
}: {
  isConnected: boolean;
  scopeOk: boolean;
  channelOk: boolean;
  videosError: Error | null;
  channelError: boolean;
}) {
  if (!isConnected) {
    return (
      <div
        className="flex items-start gap-3 p-4 rounded-lg border border-border-subtle bg-surface-card mb-4"
        data-testid="yt-status-disconnected"
      >
        <span className="text-2xl shrink-0 mt-0.5">📡</span>
        <div>
          <p className="m-0 text-base font-semibold text-neutral-900">
            YouTube hesabı bağlı değil
          </p>
          <p className="m-0 mt-1 text-sm text-neutral-600">
            Kanal verilerini görmek için{" "}
            <Link to="/admin/settings" className="text-brand-600 hover:underline">
              Ayarlar → Kimlik Bilgileri
            </Link>{" "}
            sayfasından YouTube OAuth bağlantısını tamamlayın.
          </p>
        </div>
      </div>
    );
  }

  if (!scopeOk) {
    return (
      <div
        className="flex items-start gap-3 p-4 rounded-lg border border-warning/30 bg-warning-light mb-4"
        data-testid="yt-status-scope-warning"
      >
        <span className="text-2xl shrink-0 mt-0.5">⚠️</span>
        <div>
          <p className="m-0 text-base font-semibold text-warning-text">
            Yetersiz izin (scope mismatch)
          </p>
          <p className="m-0 mt-1 text-sm text-neutral-600">
            Token mevcut ama kanal bilgileri ve istatistikler için gereken izinler eksik.{" "}
            <Link to="/admin/settings" className="text-brand-600 hover:underline">
              Ayarlar → Kimlik Bilgileri
            </Link>{" "}
            sayfasından bağlantıyı kesip yeniden bağlanın.
          </p>
        </div>
      </div>
    );
  }

  if (channelError) {
    return (
      <div
        className="flex items-start gap-3 p-4 rounded-lg border border-error/20 bg-error-light mb-4"
        data-testid="yt-status-channel-error"
      >
        <span className="text-2xl shrink-0 mt-0.5">❌</span>
        <div>
          <p className="m-0 text-base font-semibold text-error-text">
            Kanal bilgisi alınamadı
          </p>
          <p className="m-0 mt-1 text-sm text-neutral-600">
            OAuth bağlantısı mevcut ancak YouTube API kanal bilgisi döndürmedi.
            Token süresi dolmuş veya geçersiz olabilir.
          </p>
        </div>
      </div>
    );
  }

  if (videosError) {
    const errStatus = getErrorStatus(videosError);
    const errMsg = getErrorMessage(videosError);
    const isNotFound = errStatus === 404;
    const isScope = errStatus === 403;

    return (
      <div
        className="flex items-start gap-3 p-4 rounded-lg border border-warning/30 bg-warning-light mb-4"
        data-testid="yt-status-videos-error"
      >
        <span className="text-2xl shrink-0 mt-0.5">⚠️</span>
        <div>
          <p className="m-0 text-base font-semibold text-warning-text">
            {isNotFound
              ? "Video listesi endpoint'i bulunamadı"
              : isScope
                ? "Video listesi için yetki yetersiz"
                : "Video listesi alınamadı"}
          </p>
          <p className="m-0 mt-1 text-sm text-neutral-600">
            {isNotFound
              ? "Backend sunucusu eski versiyonu yüklemiş görünüyor. Uygulamayı yeniden başlatın (start.sh veya ContentHub.command)."
              : isScope
                ? "OAuth token'ınızın yeterli izni yok. Ayarlar sayfasından bağlantıyı yeniden kurun."
                : `Kanal bağlantısı sağlıklı ancak video listesi çekilirken hata oluştu${errMsg ? `: ${errMsg}` : ""}. Sayfayı yenileyin.`}
          </p>
        </div>
      </div>
    );
  }

  if (channelOk) {
    return (
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-success/20 bg-success-light mb-4"
        data-testid="yt-status-ok"
      >
        <span className="text-base">✅</span>
        <span className="text-sm font-medium text-success-text">
          Kanal bağlantısı sağlıklı — veriler güncel
        </span>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Channel Header Card
// ---------------------------------------------------------------------------

function ChannelHeader({
  channelTitle,
  channelId,
  thumbnailUrl,
  subscriberCount,
  videoCount,
}: {
  channelTitle: string | null;
  channelId: string | null;
  thumbnailUrl: string | null;
  subscriberCount: string | null;
  videoCount: string | null;
}) {
  return (
    <SectionShell testId="yt-channel-header">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Avatar */}
        {thumbnailUrl && (
          <div className="shrink-0">
            <img
              src={thumbnailUrl}
              alt={channelTitle ?? "Kanal"}
              className="w-14 h-14 rounded-full border-2 border-brand-200 shadow-sm"
            />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2 className="m-0 text-lg font-bold text-neutral-900 font-heading tracking-[-0.02em] truncate">
            {channelTitle ?? "Bilinmeyen Kanal"}
          </h2>
          {channelId && (
            <p className="m-0 mt-0.5 text-xs text-neutral-500 font-mono truncate">
              {channelId}
            </p>
          )}
        </div>

        {/* Stats badges */}
        <div className="flex gap-6 shrink-0">
          {subscriberCount && (
            <div className="text-center">
              <p className="m-0 text-xl font-bold text-neutral-900 tabular-nums font-heading">
                {fmtNum(Number(subscriberCount))}
              </p>
              <p className="m-0 text-xs text-neutral-500 font-medium">Abone</p>
            </div>
          )}
          {videoCount && (
            <div className="text-center">
              <p className="m-0 text-xl font-bold text-neutral-900 tabular-nums font-heading">
                {fmtNum(Number(videoCount))}
              </p>
              <p className="m-0 text-xs text-neutral-500 font-medium">Video</p>
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// ContentHub Badge — small, premium, token-native
// ---------------------------------------------------------------------------

function ContentHubBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs font-bold bg-brand-100 text-brand-700 whitespace-nowrap"
      title="ContentHub ile yayınlandı"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
        <rect width="10" height="10" rx="2" fill="currentColor" opacity="0.25" />
        <path d="M3 5l1.5 1.5L7 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      HUB
    </span>
  );
}

// ---------------------------------------------------------------------------
// Video Detail Panel (for Sheet)
// ---------------------------------------------------------------------------

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-2 border-b border-border-subtle">
      <span className="w-[140px] shrink-0 text-sm text-neutral-500 font-medium">
        {label}
      </span>
      <span className="text-sm text-neutral-800 break-words [overflow-wrap:anywhere]">
        {children}
      </span>
    </div>
  );
}

function TrendSparkline({ snapshots }: { snapshots: { view_count: number }[] }) {
  if (snapshots.length < 2) return null;

  const counts = snapshots.map((s) => s.view_count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const range = max - min || 1;
  const W = 200;
  const H = 48;
  const pts = counts
    .map((v, i) => {
      const x = (i / (counts.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const trend = counts[counts.length - 1] - counts[0];
  const strokeColor = trend >= 0 ? "var(--ch-success-base, #34b849)" : "var(--ch-error, #e53e3e)";

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <p className="m-0 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
          Görüntülenme Trendi
        </p>
        <span
          className={cn(
            "text-xs font-bold tabular-nums",
            trend >= 0 ? "text-success-text" : "text-error-text",
          )}
        >
          {trend >= 0 ? "▲" : "▼"} {fmtNum(Math.abs(trend))}
        </span>
      </div>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <polyline
          points={pts}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function VideoDetailPanel({ video, onManage }: { video: ChannelVideoItem | null; onManage?: () => void }) {
  const trendQuery = useVideoStatsTrend(video?.video_id ?? null);

  if (!video) {
    return (
      <div className="text-neutral-500 text-sm p-2">
        Detay görmek için bir video seçin.
      </div>
    );
  }

  const em = <span className="text-neutral-400">—</span>;
  const eng = engagementRate(video.view_count, video.like_count, video.comment_count);

  return (
    <div>
      {/* Thumbnail */}
      {video.thumbnail_url && (
        <div className="mb-4 rounded-md overflow-hidden border border-border-subtle">
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-auto block"
          />
        </div>
      )}

      {/* Title + badge */}
      <div className="flex items-start gap-2 mb-3">
        <h3 className="m-0 text-base font-bold text-neutral-900 leading-snug flex-1">
          {video.title || video.video_id}
        </h3>
        {video.is_contenthub && <ContentHubBadge />}
      </div>

      {/* Info rows */}
      <div className="bg-surface-card border border-border-subtle rounded-lg p-3 mb-4">
        <DetailRow label="Yayın Tarihi">
          {video.published_at ? formatDateTime(video.published_at) : em}
        </DetailRow>
        <DetailRow label="Süre">{parseDuration(video.duration)}</DetailRow>
        <DetailRow label="Görüntülenme">
          <span className="font-bold tabular-nums">{fmtNumFull(video.view_count)}</span>
        </DetailRow>
        <DetailRow label="Beğeni">
          <span className="tabular-nums">{fmtNumFull(video.like_count)}</span>
        </DetailRow>
        <DetailRow label="Yorum">
          <span className="tabular-nums">{fmtNumFull(video.comment_count)}</span>
        </DetailRow>
        <DetailRow label="Etkileşim">
          <span className="tabular-nums">{eng}</span>
        </DetailRow>
        <DetailRow label="Kaynak">
          {video.is_contenthub ? (
            <StatusBadge status="published" label="ContentHub" size="sm" />
          ) : (
            <span className="text-neutral-500">Doğrudan kanal</span>
          )}
        </DetailRow>
      </div>

      {/* Trend chart */}
      {trendQuery.isLoading && (
        <p className="text-xs text-neutral-500">Trend verisi yükleniyor...</p>
      )}
      {trendQuery.data && trendQuery.data.snapshots.length > 0 && (
        <div className="bg-surface-inset border border-border-subtle rounded-lg p-3 mb-4">
          <TrendSparkline snapshots={trendQuery.data.snapshots} />

          {/* Snapshot table */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="text-left py-1 px-2 text-neutral-500 font-semibold">Tarih</th>
                  <th className="text-right py-1 px-2 text-neutral-500 font-semibold">Görüntülenme</th>
                  <th className="text-right py-1 px-2 text-neutral-500 font-semibold">Beğeni</th>
                  <th className="text-right py-1 px-2 text-neutral-500 font-semibold">Yorum</th>
                </tr>
              </thead>
              <tbody>
                {trendQuery.data.snapshots.map((s, i) => (
                  <tr key={i} className="border-t border-border-subtle">
                    <td className="py-1 px-2 text-neutral-600 font-mono tabular-nums">
                      {formatDateShort(s.snapshot_at, "—")}
                    </td>
                    <td className="py-1 px-2 text-right text-neutral-800 font-mono tabular-nums font-medium">
                      {fmtNumFull(s.view_count)}
                    </td>
                    <td className="py-1 px-2 text-right text-neutral-600 font-mono tabular-nums">
                      {fmtNumFull(s.like_count)}
                    </td>
                    <td className="py-1 px-2 text-right text-neutral-600 font-mono tabular-nums">
                      {fmtNumFull(s.comment_count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {trendQuery.data && trendQuery.data.snapshots.length === 0 && (
        <p className="text-xs text-neutral-500 italic">
          Henüz snapshot verisi yok — her sorgulamada otomatik kaydedilir.
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-3 flex-wrap">
        <a
          href={`https://www.youtube.com/watch?v=${video.video_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-surface-card text-neutral-700 no-underline hover:bg-neutral-50 hover:border-brand-400 transition-all duration-fast"
        >
          ▶ YouTube'da Aç
        </a>
        {onManage && (
          <ActionButton
            variant="primary"
            size="sm"
            onClick={onManage}
            data-testid="yt-open-video-management"
          >
            ✎ Yönet
          </ActionButton>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function YouTubeAnalyticsPage() {
  // State
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mgmtSheetOpen, setMgmtSheetOpen] = useState(false);

  // Data fetching
  const { data: ytStatus, isLoading: statusLoading } = useYouTubeStatus();
  const {
    data: channelInfo,
    isLoading: channelLoading,
    isError: channelError,
  } = useYouTubeChannelInfo();
  const {
    data: channelVideos,
    isLoading: videosLoading,
    isError: videosIsError,
    error: videosErrorObj,
  } = useChannelVideos(
    ytStatus?.has_credentials === true && ytStatus?.scope_ok !== false,
  );

  const isLoading = statusLoading || channelLoading;
  const isConnected = ytStatus?.has_credentials === true;
  const scopeOk = ytStatus?.scope_ok !== false;
  const channelOk = !channelError && !!channelInfo?.connected;
  // Typed error object for detailed error display
  const videosError: Error | null = videosIsError
    ? (videosErrorObj instanceof Error ? videosErrorObj : new Error("Video listesi alınamadı"))
    : null;

  // All videos
  const allVideos = channelVideos?.videos ?? [];

  // Filter + sort + search
  const processedVideos = useMemo(() => {
    let list = [...allVideos];

    // Source filter
    if (sourceFilter === "contenthub") {
      list = list.filter((v) => v.is_contenthub);
    } else if (sourceFilter === "other") {
      list = list.filter((v) => !v.is_contenthub);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((v) => v.title.toLowerCase().includes(q));
    }

    // Sort
    list.sort((a, b) => {
      switch (sortKey) {
        case "newest":
          return (b.published_at ?? "").localeCompare(a.published_at ?? "");
        case "oldest":
          return (a.published_at ?? "").localeCompare(b.published_at ?? "");
        case "most_views":
          return b.view_count - a.view_count;
        case "least_views":
          return a.view_count - b.view_count;
      }
    });

    return list;
  }, [allVideos, sourceFilter, sortKey, searchQuery]);

  // Pagination
  const totalFiltered = processedVideos.length;
  const pagedVideos = processedVideos.slice(page, page + PAGE_SIZE);

  // Reset page when filters change
  const handleSourceFilter = (v: SourceFilter) => {
    setSourceFilter(v);
    setPage(0);
  };
  const handleSort = (v: SortKey) => {
    setSortKey(v);
    setPage(0);
  };
  const handleSearch = (v: string) => {
    setSearchQuery(v);
    setPage(0);
  };

  // Selected video for detail panel
  const selectedVideo = allVideos.find((v) => v.video_id === selectedVideoId) ?? null;

  // Derived metrics (from ALL videos, unfiltered)
  const totalViews = allVideos.reduce((s, v) => s + v.view_count, 0);
  const totalLikes = allVideos.reduce((s, v) => s + v.like_count, 0);
  const totalComments = allVideos.reduce((s, v) => s + v.comment_count, 0);
  const hubCount = allVideos.filter((v) => v.is_contenthub).length;
  const recentCount = allVideos.filter((v) => isWithinDays(v.published_at, 30)).length;
  const avgViews = allVideos.length > 0 ? Math.round(totalViews / allVideos.length) : 0;

  // Top video
  const topVideo =
    allVideos.length > 0
      ? allVideos.reduce((a, b) => (a.view_count > b.view_count ? a : b))
      : null;

  const hasFilters = sourceFilter !== "all" || searchQuery.trim() !== "";

  // Table columns
  const columns = [
    {
      key: "title",
      header: "Video",
      width: "auto",
      render: (v: ChannelVideoItem) => (
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          <div className="shrink-0 w-[72px] h-[40px] rounded-sm overflow-hidden bg-neutral-100 border border-border-subtle relative">
            {v.thumbnail_url ? (
              <img
                src={v.thumbnail_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">
                ▶
              </div>
            )}
            {/* Duration overlay */}
            {v.duration && (
              <span className="absolute bottom-0 right-0 bg-neutral-900/80 text-white text-[10px] font-mono px-1 py-px rounded-tl-sm leading-tight">
                {parseDuration(v.duration)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1.5">
              <a
                href={`https://www.youtube.com/watch?v=${v.video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-medium text-neutral-900 leading-snug hover:text-brand-600 hover:underline transition-colors duration-fast line-clamp-2 no-underline"
              >
                {v.title || v.video_id}
              </a>
              {v.is_contenthub && <ContentHubBadge />}
            </div>
            {v.published_at && (
              <p className="m-0 mt-0.5 text-xs text-neutral-500 tabular-nums">
                {formatDateShort(v.published_at)}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "views",
      header: "Görüntülenme",
      align: "right" as const,
      width: "100px",
      render: (v: ChannelVideoItem) => (
        <span className="text-sm font-medium text-neutral-800 tabular-nums">
          {fmtNum(v.view_count)}
        </span>
      ),
    },
    {
      key: "likes",
      header: "Beğeni",
      align: "right" as const,
      width: "80px",
      render: (v: ChannelVideoItem) => (
        <span className="text-sm text-neutral-600 tabular-nums">
          {fmtNum(v.like_count)}
        </span>
      ),
    },
    {
      key: "comments",
      header: "Yorum",
      align: "right" as const,
      width: "80px",
      render: (v: ChannelVideoItem) => (
        <span className="text-sm text-neutral-600 tabular-nums">
          {fmtNum(v.comment_count)}
        </span>
      ),
    },
    {
      key: "engagement",
      header: "Etkileşim",
      align: "right" as const,
      width: "90px",
      render: (v: ChannelVideoItem) => (
        <span className="text-sm text-neutral-500 tabular-nums">
          {engagementRate(v.view_count, v.like_count, v.comment_count)}
        </span>
      ),
    },
  ];

  return (
    <PageShell
      title="YouTube Analytics"
      subtitle="Kanal performansı ve tüm video istatistikleri"
      testId="yt-analytics"
    >
      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 py-12 text-sm text-neutral-500">
          <span className="animate-spin inline-block">⏳</span> Kanal bilgileri yükleniyor...
        </div>
      )}

      {/* Status banner */}
      {!isLoading && (
        <ConnectionBanner
          isConnected={isConnected}
          scopeOk={scopeOk}
          channelOk={channelOk}
          videosError={videosError}
          channelError={channelError}
        />
      )}

      {/* Disconnected empty state */}
      {!isLoading && !isConnected && (
        <SectionShell testId="yt-empty">
          <EmptyState
            illustration="no-analytics"
            title="YouTube Bağlantısı Gerekli"
            description="Kanal verilerini ve video istatistiklerini görmek için YouTube hesabınızı bağlayın."
            action={{
              label: "Ayarlara Git",
              onClick: () => {
                window.location.href = "/admin/settings";
              },
              variant: "primary",
            }}
          />
        </SectionShell>
      )}

      {/* Scope warning - no further content */}
      {!isLoading && isConnected && !scopeOk && (
        <SectionShell testId="yt-scope-empty">
          <EmptyState
            illustration="error"
            title="İzinler Yetersiz"
            description="Kanal ve video verilerine erişmek için OAuth bağlantısını yeniden kurmanız gerekiyor."
            action={{
              label: "Ayarlara Git",
              onClick: () => {
                window.location.href = "/admin/settings";
              },
              variant: "primary",
            }}
          />
        </SectionShell>
      )}

      {/* Connected + scope OK — main content */}
      {!isLoading && isConnected && scopeOk && (
        <>
          {/* Channel header */}
          {channelInfo && channelInfo.connected && (
            <ChannelHeader
              channelTitle={channelInfo.channel_title}
              channelId={channelInfo.channel_id}
              thumbnailUrl={channelInfo.thumbnail_url}
              subscriberCount={channelInfo.subscriber_count}
              videoCount={channelInfo.video_count}
            />
          )}

          {/* Metric tiles — only from real data */}
          {!videosLoading && !videosError && allVideos.length > 0 && (
            <MetricGrid>
              <MetricTile
                label="Toplam Görüntülenme"
                value={fmtNum(totalViews)}
                note={fmtNumFull(totalViews) + " toplam"}
                testId="yt-metric-views"
              />
              <MetricTile
                label="Toplam Beğeni"
                value={fmtNum(totalLikes)}
                note={engagementRate(totalViews, totalLikes, totalComments) + " etkileşim"}
                testId="yt-metric-likes"
              />
              <MetricTile
                label="ContentHub Videoları"
                value={String(hubCount)}
                note={`${allVideos.length} video içinden`}
                testId="yt-metric-hub"
              />
              <MetricTile
                label="Son 30 Gün"
                value={String(recentCount)}
                note={recentCount > 0 ? "yeni video" : "yeni video yok"}
                testId="yt-metric-recent"
              />
              <MetricTile
                label="Ortalama Görüntülenme"
                value={fmtNum(avgViews)}
                note="video başına"
                testId="yt-metric-avg"
              />
              {topVideo && (
                <MetricTile
                  label="En Çok İzlenen"
                  value={fmtNum(topVideo.view_count)}
                  note={
                    topVideo.title.length > 40
                      ? topVideo.title.slice(0, 40) + "..."
                      : topVideo.title
                  }
                  testId="yt-metric-top"
                />
              )}
            </MetricGrid>
          )}

          {/* Videos loading */}
          {videosLoading && (
            <SectionShell testId="yt-videos-loading">
              <div className="flex items-center gap-2 py-8 px-4 text-sm text-neutral-500">
                <span className="animate-spin inline-block">⏳</span> Video listesi yükleniyor...
              </div>
            </SectionShell>
          )}

          {/* Videos table */}
          {!videosLoading && !videosError && (
            <SectionShell
              title="Kanal Videoları"
              description={`${allVideos.length} video · ${hubCount} ContentHub yayını`}
              flush
              testId="yt-videos-section"
            >
              {/* Filter bar */}
              <div className="px-4 pt-3">
                <FilterBar testId="yt-filter-bar">
                  <FilterInput
                    type="text"
                    placeholder="Video ara..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    data-testid="yt-search"
                  />
                  <FilterSelect
                    value={sourceFilter}
                    onChange={(e) =>
                      handleSourceFilter(e.target.value as SourceFilter)
                    }
                    data-testid="yt-filter-source"
                  >
                    {SOURCE_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </FilterSelect>
                  <FilterSelect
                    value={sortKey}
                    onChange={(e) => handleSort(e.target.value as SortKey)}
                    data-testid="yt-filter-sort"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </FilterSelect>
                  {hasFilters && (
                    <ActionButton
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSourceFilter("all");
                        setSearchQuery("");
                        setPage(0);
                      }}
                    >
                      Temizle
                    </ActionButton>
                  )}
                </FilterBar>
              </div>

              {/* Table */}
              <DataTable
                columns={columns}
                data={pagedVideos}
                keyFn={(v) => v.video_id}
                onRowClick={(v) => {
                  setSelectedVideoId(v.video_id);
                  setSheetOpen(true);
                }}
                selectedKey={selectedVideoId}
                loading={false}
                emptyMessage={
                  hasFilters
                    ? "Filtreye uygun video bulunamadı"
                    : "Kanalda video bulunamadı"
                }
                testId="yt-videos-table"
                rowTestIdPrefix="yt-video-row"
              />

              {/* Pagination */}
              <Pagination
                offset={page}
                limit={PAGE_SIZE}
                total={totalFiltered}
                onPrev={() => setPage(Math.max(0, page - PAGE_SIZE))}
                onNext={() => setPage(page + PAGE_SIZE)}
                testId="yt-pagination"
              />
            </SectionShell>
          )}

          {/* Info note */}
          <div className="mt-2 px-4 py-3 rounded-lg border border-border-subtle bg-surface-inset text-xs text-neutral-500 leading-relaxed">
            <span className="font-medium text-neutral-600">ℹ️</span>{" "}
            Zaman serisi verileri ContentHub'ın yerel snapshot'larından oluşturulur.
            Demografik veriler ve izlenme süresi için YouTube Analytics API ek OAuth scope
            gerektirir.
          </div>
        </>
      )}

      {/* Detail Sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Video Detayı"
        width="440px"
        testId="yt-detail-sheet"
      >
        <VideoDetailPanel
          video={selectedVideo}
          onManage={() => {
            setSheetOpen(false);
            setMgmtSheetOpen(true);
          }}
        />
      </Sheet>

      {/* Management Sheet — thumbnails.set / captions / videos.update */}
      <YouTubeVideoManagementSheet
        open={mgmtSheetOpen}
        onClose={() => setMgmtSheetOpen(false)}
        connectionId={ytStatus?.connection_id ?? undefined}
        video={
          selectedVideo
            ? {
                video_id: selectedVideo.video_id,
                title: selectedVideo.title,
                thumbnail_url: selectedVideo.thumbnail_url,
              }
            : null
        }
      />
    </PageShell>
  );
}
