/**
 * AdminYouTubeAnalyticsPage — Gate 5 B1 (user-page parity, 2026-04-15).
 *
 * Admin dashboard for YouTube Analytics API v2 snapshots across ALL
 * platform connections. Mirrors the user page's "Analytics Newsroom"
 * approach so the single-connection admin workflow stays as rich as the
 * user one, with admin-specific extras:
 *   - connection picker over every YouTube connection on the platform
 *   - manual sync triggers (single + bulk)
 *   - CSV export (ExportButton kind=channel-performance)
 *
 * Drops:
 *   - Channel-info/tab-style page header that duplicated info already in
 *     the connection picker (user feedback: "bazı veriler nedense 2 kez
 *     görünüyor").
 *   - Orphan "YouTubeAnalyticsPage" live-API section — replaced by the
 *     snapshot-backed surfaces below. The old file is removed; this page
 *     now owns /admin/analytics/youtube.
 *
 * Design parity with UserYouTubeAnalyticsPage:
 *   - Same TR label maps (TRAFFIC_SOURCE_TR, DEVICE_TYPE_TR, GENDER_TR)
 *   - Clickable KPI tiles toggle the TrendChart below (daily series)
 *   - Video rows merge title + thumbnail via useChannelVideos
 *   - Demographics grouped by age, with male/female inline bars
 *   - ShareBar for traffic/device/top-video share percentages
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSurfacePageOverride } from "../../surfaces";
import { useAdminConnections } from "../../hooks/useConnections";
import {
  useYtChannelTotals,
  useYtDemographics,
  useYtDevices,
  useYtLastSync,
  useYtTopVideos,
  useYtTrafficSources,
  useTriggerYtSync,
  useTriggerYtSyncAll,
} from "../../hooks/useYoutubeAnalytics";
import { useChannelVideos } from "../../hooks/useCredentials";
import type { YtChannelDailyRow } from "../../api/youtubeAnalyticsApi";
import {
  PageShell,
  SectionShell,
  ActionButton,
} from "../../components/design-system/primitives";
import { TrendChart } from "../../components/shared/charts/TrendChart";
import { AdminAnalyticsTabBar } from "../../components/analytics/AnalyticsTabBar";
import { SnapshotLockDisclaimer } from "../../components/analytics/SnapshotLockDisclaimer";
import { ExportButton } from "../../components/analytics/ExportButton";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WINDOW_OPTIONS: { value: number; label: string }[] = [
  { value: 7, label: "Son 7 Gün" },
  { value: 28, label: "Son 28 Gün" },
  { value: 90, label: "Son 90 Gün" },
];

// YouTube insightTrafficSourceType → TR. Ref: developers.google.com/youtube/analytics/dimensions
const TRAFFIC_SOURCE_TR: Record<string, string> = {
  ADVERTISING: "Reklam",
  ANNOTATION: "Notlar",
  CAMPAIGN_CARD: "Kampanya kartı",
  END_SCREEN: "Bitiş ekranı",
  EXT_URL: "Harici site",
  NO_LINK_EMBEDDED: "Gömülü oynatıcı",
  NO_LINK_OTHER: "Doğrudan/bilinmeyen",
  NOTIFICATION: "Bildirim",
  PLAYLIST: "Oynatma listesi",
  PROMOTED: "Öne çıkarılan",
  RELATED_VIDEO: "Önerilen video",
  SHORTS: "Shorts akışı",
  SUBSCRIBER: "Abonelik akışı",
  YT_CHANNEL: "YouTube kanalı",
  YT_OTHER_PAGE: "YouTube diğer sayfa",
  YT_SEARCH: "YouTube arama",
  HASHTAGS: "Hashtag",
  SOUND_PAGE: "Ses sayfası",
  LIVE_REDIRECT: "Canlı yönlendirme",
  VIDEO_REMIXES: "Remix",
};

const DEVICE_TYPE_TR: Record<string, string> = {
  DESKTOP: "Masaüstü",
  MOBILE: "Mobil",
  TABLET: "Tablet",
  TV: "Televizyon",
  GAME_CONSOLE: "Oyun konsolu",
  UNKNOWN_PLATFORM: "Bilinmeyen",
};

const GENDER_TR: Record<string, string> = {
  male: "Erkek",
  female: "Kadın",
  MALE: "Erkek",
  FEMALE: "Kadın",
  unspecified: "Belirtilmemiş",
  UNSPECIFIED: "Belirtilmemiş",
  user_specified: "Belirtilmemiş",
};

function trafficLabel(key: string): string {
  return TRAFFIC_SOURCE_TR[key] ?? key.replace(/_/g, " ").toLowerCase();
}
function deviceLabel(key: string): string {
  return DEVICE_TYPE_TR[key] ?? key;
}
function genderLabel(key: string): string {
  return GENDER_TR[key] ?? key;
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("tr-TR");
}

function formatHours(minutes: number | null | undefined): string {
  if (!minutes || !Number.isFinite(minutes)) return "0sa";
  const h = Math.floor(minutes / 60);
  if (h > 0) return `${h}sa ${Math.round(minutes % 60)}dk`;
  return `${Math.round(minutes)}dk`;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Backend normalizes `averageViewPercentage` + `viewerPercentage` from the
// raw 0-100 API values to 0-1 ratios (see scale_metric_value). This helper is
// ONLY for those ratio-scaled fields: avg_view_percentage + demographics
// viewer_percentage. Traffic / device share bars compute their own 0-100
// percentages inline and do not use this helper.
function formatPercent(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(1)}%`;
}

function formatSignedInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  return `${n > 0 ? "+" : ""}${n.toLocaleString("tr-TR")}`;
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "az önce";
  if (diffMin < 60) return `${diffMin} dk önce`;
  const hrs = Math.round(diffMin / 60);
  if (hrs < 24) return `${hrs} saat önce`;
  const days = Math.round(hrs / 24);
  return `${days} gün önce`;
}

// ---------------------------------------------------------------------------
// Metric catalog — KPI tile → chart series mapping
// ---------------------------------------------------------------------------

type MetricKey =
  | "views"
  | "watch_time"
  | "subs_net"
  | "likes"
  | "shares"
  | "comments"
  | "avg_duration"
  | "avg_percent";

interface TotalsBundle {
  totals: {
    views: number;
    estimated_minutes_watched: number;
    subscribers_net: number;
    likes: number;
    shares: number;
    comments: number;
  };
  averages: {
    average_view_duration_seconds: number;
    average_view_percentage: number;
  };
}

interface MetricDef {
  key: MetricKey;
  label: string;
  color: string;
  getDaily: (row: YtChannelDailyRow) => number;
  getTotal: (t: TotalsBundle) => string;
  formatY: (v: number) => string;
  note?: (t: TotalsBundle) => string | undefined;
}

const METRICS: MetricDef[] = [
  {
    key: "views",
    label: "Görüntülenme",
    color: "#6366f1",
    getDaily: (r) => r.views,
    getTotal: ({ totals }) => formatNumber(totals.views),
    formatY: (v) => formatNumber(v),
  },
  {
    key: "watch_time",
    label: "Toplam İzleme",
    color: "#0ea5e9",
    getDaily: (r) => r.estimated_minutes_watched,
    getTotal: ({ totals }) => formatHours(totals.estimated_minutes_watched),
    formatY: (v) => formatHours(v),
  },
  {
    key: "subs_net",
    label: "Net Abone",
    color: "#10b981",
    getDaily: (r) => r.subscribers_gained - r.subscribers_lost,
    getTotal: ({ totals }) => formatSignedInt(totals.subscribers_net),
    formatY: (v) => formatSignedInt(v),
    note: ({ totals }) =>
      totals.subscribers_net > 0
        ? "Artış"
        : totals.subscribers_net < 0
          ? "Düşüş"
          : "Sabit",
  },
  {
    key: "likes",
    label: "Beğeni",
    color: "#f43f5e",
    getDaily: (r) => r.likes,
    getTotal: ({ totals }) => formatNumber(totals.likes),
    formatY: (v) => formatNumber(v),
  },
  {
    key: "shares",
    label: "Paylaşım",
    color: "#f59e0b",
    getDaily: (r) => r.shares,
    getTotal: ({ totals }) => formatNumber(totals.shares),
    formatY: (v) => formatNumber(v),
  },
  {
    key: "comments",
    label: "Yorum",
    color: "#a855f7",
    getDaily: (r) => r.comments,
    getTotal: ({ totals }) => formatNumber(totals.comments),
    formatY: (v) => formatNumber(v),
  },
  {
    key: "avg_duration",
    label: "Ort. İzleme Süresi",
    color: "#14b8a6",
    getDaily: (r) => r.average_view_duration_seconds,
    getTotal: ({ averages }) =>
      formatDuration(averages.average_view_duration_seconds),
    formatY: (v) => formatDuration(v),
  },
  {
    key: "avg_percent",
    label: "Ort. İzleme %",
    color: "#ec4899",
    getDaily: (r) => r.average_view_percentage,
    getTotal: ({ averages }) => formatPercent(averages.average_view_percentage),
    formatY: (v) => formatPercent(v),
  },
];

// ---------------------------------------------------------------------------
// Local building blocks
// ---------------------------------------------------------------------------

interface KPITileProps {
  label: string;
  value: string;
  note?: string;
  active: boolean;
  color: string;
  onClick: () => void;
  testId?: string;
}

function KPITile({
  label,
  value,
  note,
  active,
  color,
  onClick,
  testId,
}: KPITileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-pressed={active}
      className={cn(
        "group relative overflow-hidden rounded-lg border text-left",
        "px-4 py-3 transition-all duration-150 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-offset-1",
        active
          ? "border-transparent bg-surface-card shadow-sm"
          : "border-border-subtle bg-surface-card/60 hover:border-border-default hover:bg-surface-card",
      )}
      style={{
        boxShadow: active ? `inset 3px 0 0 ${color}` : undefined,
      }}
    >
      <div
        className={cn(
          "text-[11px] font-medium uppercase tracking-[0.08em] transition-colors",
          active ? "text-neutral-700" : "text-neutral-500",
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-heading text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums",
          !active && "text-neutral-900",
        )}
        style={active ? { color } : undefined}
      >
        {value}
      </div>
      {note && (
        <div
          className={cn(
            "mt-1.5 text-[11px] font-medium",
            !active && "text-neutral-500",
          )}
          style={active ? { color } : undefined}
        >
          {note}
        </div>
      )}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-[3px] transition-transform duration-200 origin-left",
          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50",
        )}
        style={{ backgroundColor: color }}
      />
    </button>
  );
}

interface ShareBarProps {
  value: number;
  max: number;
  color: string;
}

function ShareBar({ value, max, color }: ShareBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminYouTubeAnalyticsPage() {
  // Faz 6 — Aurora override gate. Aktif surface Aurora ise kokpit YouTube
  // analytics render edilir; diğer surface'ler legacy sayfayı görür.
  const Override = useSurfacePageOverride("admin.analytics.youtube");
  if (Override) return <Override />;
  return <LegacyAdminYouTubeAnalyticsPage />;
}

function LegacyAdminYouTubeAnalyticsPage() {
  const { data: connectionsData, isLoading: connectionsLoading } =
    useAdminConnections({ platform: "youtube", limit: 200 });

  const connections = useMemo(
    () => (connectionsData?.items ?? []).filter((c) => c.platform === "youtube"),
    [connectionsData],
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [windowDays, setWindowDays] = useState<number>(28);
  const [activeMetric, setActiveMetric] = useState<MetricKey>("views");

  const effectiveId =
    selectedId || (connections.length > 0 ? connections[0].id : "");
  const selectedConnection = connections.find((c) => c.id === effectiveId);
  const channelProfileId = selectedConnection?.channel_profile_id ?? undefined;

  // Data hooks
  const totalsQuery = useYtChannelTotals(effectiveId || undefined, windowDays);
  const topVideosQuery = useYtTopVideos(effectiveId || undefined, windowDays, 10);
  const trafficQuery = useYtTrafficSources(effectiveId || undefined);
  const devicesQuery = useYtDevices(effectiveId || undefined);
  const demographicsQuery = useYtDemographics(effectiveId || undefined);
  const lastSyncQuery = useYtLastSync(effectiveId || undefined);

  const syncOne = useTriggerYtSync(effectiveId || undefined);
  const syncAll = useTriggerYtSyncAll();

  // Channel videos (title + thumbnail) — merge into top-videos table
  const channelVideosQuery = useChannelVideos(
    Boolean(channelProfileId),
    channelProfileId,
  );
  const videoMetaById = useMemo(() => {
    const map = new Map<
      string,
      { title: string; thumbnail_url: string | null }
    >();
    for (const v of channelVideosQuery.data?.videos ?? []) {
      map.set(v.video_id, {
        title: v.title,
        thumbnail_url: v.thumbnail_url ?? null,
      });
    }
    return map;
  }, [channelVideosQuery.data]);

  // Active metric resolver
  const currentMetric = useMemo(
    () => METRICS.find((m) => m.key === activeMetric) ?? METRICS[0],
    [activeMetric],
  );

  // Daily trend series — follows active KPI
  const trendData = useMemo(() => {
    const daily = totalsQuery.data?.daily ?? [];
    return daily.map((d) => ({
      date: d.date.slice(5),
      value: currentMetric.getDaily(d),
    }));
  }, [totalsQuery.data, currentMetric]);

  const totals = totalsQuery.data?.totals;
  const averages = totalsQuery.data?.averages;
  const totalsBundle: TotalsBundle | null =
    totals && averages ? { totals, averages } : null;

  // Share totals
  const trafficTotalViews = useMemo(
    () => (trafficQuery.data?.rows ?? []).reduce((s, r) => s + r.views, 0),
    [trafficQuery.data],
  );
  const deviceTotalViews = useMemo(
    () => (devicesQuery.data?.rows ?? []).reduce((s, r) => s + r.views, 0),
    [devicesQuery.data],
  );
  const topVideosMax = useMemo(
    () =>
      Math.max(
        0,
        ...(topVideosQuery.data?.videos ?? []).map((v) => v.views),
      ),
    [topVideosQuery.data],
  );

  // Demographics — group by age, two bars per age
  const demographicsByAge = useMemo(() => {
    const rows = demographicsQuery.data?.rows ?? [];
    const groups = new Map<string, Map<string, number>>();
    for (const r of rows) {
      if (!groups.has(r.age_group)) groups.set(r.age_group, new Map());
      groups.get(r.age_group)!.set(r.gender, r.viewer_percentage);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [demographicsQuery.data]);

  const demoMax = useMemo(() => {
    let max = 0;
    for (const r of demographicsQuery.data?.rows ?? []) {
      if (r.viewer_percentage > max) max = r.viewer_percentage;
    }
    return max;
  }, [demographicsQuery.data]);

  // Viewer percentages across all age×gender rows should sum to ~1.0 (0-1
  // ratio scale from backend). If YouTube omits thin segments it can land
  // noticeably under 100% — surface that to the user rather than silently
  // showing a lopsided breakdown.
  const demoCoverage = useMemo(() => {
    let sum = 0;
    for (const r of demographicsQuery.data?.rows ?? []) {
      sum += r.viewer_percentage;
    }
    return sum;
  }, [demographicsQuery.data]);

  // Sync status chip
  const syncStatus = lastSyncQuery.data?.last_sync?.status ?? null;
  const syncStatusLabel =
    syncStatus === "ok"
      ? "senkron ✓"
      : syncStatus === "partial"
        ? "kısmi"
        : syncStatus === "failed"
          ? "hata"
          : syncStatus === "running"
            ? "çalışıyor"
            : null;
  const syncStatusColor =
    syncStatus === "ok"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : syncStatus === "partial"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : syncStatus === "failed"
          ? "bg-rose-100 text-rose-700 border-rose-200"
          : syncStatus === "running"
            ? "bg-sky-100 text-sky-700 border-sky-200"
            : "bg-neutral-100 text-neutral-600 border-neutral-200";

  return (
    <PageShell
      title="YouTube Analytics (Admin)"
      subtitle="Tüm YouTube bağlantıları için snapshot tabanlı metrikler — tıklanabilir KPI tile'ları günlük grafiği yeniler."
      breadcrumb={[
        { label: "Analytics", to: "/admin/analytics" },
        { label: "YouTube (Tüm Kanallar)" },
      ]}
      testId="admin-yt-analytics"
      actions={
        <div className="flex items-center gap-2">
          {syncStatusLabel && (
            <span
              className={cn(
                "hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                syncStatusColor,
              )}
              title={`Son senkron: ${syncStatusLabel}`}
            >
              {syncStatusLabel}
            </span>
          )}
          <ExportButton kind="channel-performance" label="Performans CSV" />
          <ActionButton
            variant="secondary"
            onClick={() => syncAll.mutate()}
            disabled={syncAll.isPending}
            data-testid="admin-yt-sync-all"
          >
            {syncAll.isPending ? "Senkronlanıyor…" : "Tümünü Senkronla"}
          </ActionButton>
        </div>
      }
    >
      <AdminAnalyticsTabBar />
      <Link
        to="/admin/analytics"
        className="inline-block mb-3 text-sm text-brand-600 no-underline"
      >
        ← Analytics&apos;e dön
      </Link>

      <SnapshotLockDisclaimer />

      {/* Connection picker */}
      <SectionShell title="Bağlantı Seçimi" testId="admin-yt-connection-picker">
        {connectionsLoading ? (
          <p className="text-sm text-neutral-500">Bağlantılar yükleniyor…</p>
        ) : connections.length === 0 ? (
          <p
            className="text-sm text-neutral-600"
            data-testid="admin-yt-no-connections"
          >
            Henüz tanımlı bir YouTube bağlantısı yok.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-neutral-700">
              Kanal:{" "}
              <select
                value={effectiveId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="ml-1 rounded border border-neutral-300 bg-white px-2 py-1 text-sm"
                data-testid="admin-yt-connection-select"
              >
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.external_account_name ??
                      c.channel_profile_name ??
                      c.id.slice(0, 8)}
                    {c.user_display_name ? ` — ${c.user_display_name}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-neutral-700">
              Pencere:{" "}
              <select
                value={windowDays}
                onChange={(e) => setWindowDays(Number(e.target.value))}
                className="ml-1 rounded border border-neutral-300 bg-white px-2 py-1 text-sm"
                data-testid="admin-yt-window-select"
              >
                {WINDOW_OPTIONS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
            <ActionButton
              variant="secondary"
              onClick={() => syncOne.mutate(undefined)}
              disabled={!effectiveId || syncOne.isPending}
              data-testid="admin-yt-sync-one"
            >
              {syncOne.isPending ? "Senkronlanıyor…" : "Bu Kanalı Senkronla"}
            </ActionButton>
            {lastSyncQuery.data?.last_sync && (
              <span
                className="text-xs text-neutral-500"
                data-testid="admin-yt-last-sync"
              >
                Son senkron:{" "}
                <strong className="text-neutral-700">
                  {formatRelativeTime(
                    lastSyncQuery.data.last_sync.finished_at ??
                      lastSyncQuery.data.last_sync.started_at,
                  )}
                </strong>
              </span>
            )}
          </div>
        )}
      </SectionShell>

      {effectiveId && (
        <>
          {/* ─────────── KPI Tiles + Trend Chart ─────────── */}
          <SectionShell
            title={`Kanal Toplamları — Son ${windowDays} Gün`}
            description="Bir metriğin üzerine tıklayın — aşağıdaki grafik o metriğin günlük serisine geçer."
            testId="admin-yt-channel-totals"
          >
            {totalsQuery.isLoading && (
              <p className="text-sm text-neutral-500">Yükleniyor…</p>
            )}
            {totalsQuery.isError && (
              <p className="text-sm text-red-600">
                Veriler alınamadı. Senkronlama gerekebilir.
              </p>
            )}
            {totalsQuery.data && (totalsQuery.data.daily ?? []).length === 0 && (
              <p className="text-sm text-neutral-500">
                Henüz snapshot yok. Sağ üstten "Tümünü Senkronla" veya seçili
                kanal için "Bu Kanalı Senkronla" diyerek ilk veri çekimini
                başlatın.
              </p>
            )}
            {totalsBundle && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
                  {METRICS.map((m) => (
                    <KPITile
                      key={m.key}
                      label={m.label}
                      value={m.getTotal(totalsBundle)}
                      note={m.note?.(totalsBundle)}
                      active={activeMetric === m.key}
                      color={m.color}
                      onClick={() => setActiveMetric(m.key)}
                      testId={`admin-yt-kpi-${m.key}`}
                    />
                  ))}
                </div>

                <div className="mt-5 rounded-lg border border-border-subtle bg-surface-card p-4">
                  <div className="mb-2 flex items-baseline justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: currentMetric.color }}
                      />
                      <h3 className="text-sm font-semibold text-neutral-800">
                        {currentMetric.label} — Günlük Seyir
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                      son {windowDays} gün
                    </span>
                  </div>
                  <TrendChart
                    data={trendData}
                    xKey="date"
                    yKey="value"
                    yLabel={currentMetric.label}
                    color={currentMetric.color}
                    formatY={currentMetric.formatY}
                    height={240}
                    emptyMessage="Günlük veri yok"
                    testId={`admin-yt-trend-${activeMetric}`}
                  />
                </div>
              </>
            )}
          </SectionShell>

          {/* ─────────── Top Videos (with thumbnails + titles) ─────────── */}
          <SectionShell title="En Çok İzlenen Videolar" testId="admin-yt-top-videos">
            {topVideosQuery.isLoading && (
              <p className="text-sm text-neutral-500">Yükleniyor…</p>
            )}
            {topVideosQuery.data &&
              topVideosQuery.data.videos.length === 0 && (
                <p className="text-sm text-neutral-500">
                  Bu pencere için video metriği yok. Senkronlama gerekebilir.
                </p>
              )}
            {topVideosQuery.data && topVideosQuery.data.videos.length > 0 && (
              <div
                className="overflow-x-auto rounded-lg border border-border-subtle"
                data-testid="admin-yt-top-videos-table"
              >
                <table className="min-w-full divide-y divide-border-subtle text-sm">
                  <thead className="bg-surface-inset">
                    <tr>
                      <th className="w-10 px-3 py-2 text-left font-medium text-neutral-500">
                        #
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-neutral-500">
                        Video
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-neutral-500">
                        Görüntülenme
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-neutral-500">
                        İzleme
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-neutral-500">
                        Ort. Süre
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-neutral-500">
                        Ort. %
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-neutral-500">
                        Beğeni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-surface-card">
                    {topVideosQuery.data.videos.map((v, i) => {
                      const meta = videoMetaById.get(v.platform_video_id);
                      const title = meta?.title ?? v.platform_video_id;
                      const thumb = meta?.thumbnail_url;
                      const watchUrl = `https://www.youtube.com/watch?v=${v.platform_video_id}`;
                      return (
                        <tr
                          key={v.platform_video_id}
                          className="hover:bg-surface-inset/60"
                          data-testid={`admin-yt-top-row-${v.platform_video_id}`}
                        >
                          <td className="px-3 py-2 text-right text-[12px] font-mono tabular-nums text-neutral-400">
                            {i + 1}
                          </td>
                          <td className="px-3 py-2">
                            <a
                              href={watchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 no-underline"
                              title={title}
                            >
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt=""
                                  className="h-10 w-[72px] shrink-0 rounded object-cover ring-1 ring-neutral-200"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="h-10 w-[72px] shrink-0 rounded bg-surface-inset ring-1 ring-border-subtle flex items-center justify-center text-[10px] text-neutral-400 font-mono">
                                  no img
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="max-w-[360px] truncate text-[13px] font-medium text-neutral-800 group-hover:text-brand-700">
                                  {title}
                                </div>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-neutral-400">
                                    {v.platform_video_id}
                                  </span>
                                  <div className="flex-1 min-w-[60px] max-w-[120px]">
                                    <ShareBar
                                      value={v.views}
                                      max={topVideosMax}
                                      color="#6366f1"
                                    />
                                  </div>
                                </div>
                              </div>
                            </a>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium text-neutral-800">
                            {formatNumber(v.views)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                            {formatHours(v.estimated_minutes_watched)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                            {formatDuration(v.average_view_duration_seconds)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                            {formatPercent(v.average_view_percentage)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                            {formatNumber(v.likes)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionShell>

          {/* ─────────── Demographics ─────────── */}
          <SectionShell
            title="Demografi"
            description="Yaş grubu başına izleyici yüzdesi; her yaş için erkek/kadın ayrımı."
            testId="admin-yt-demographics"
          >
            {demographicsQuery.isLoading && (
              <p className="text-sm text-neutral-500">Yükleniyor…</p>
            )}
            {demographicsQuery.data &&
              demographicsQuery.data.rows.length === 0 && (
                <p className="text-sm text-neutral-500">
                  Demografi verisi yok.
                </p>
              )}
            {demographicsByAge.length > 0 && (
              <div className="space-y-2">
                {demoCoverage < 0.95 && (
                  <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    Kapsam: {formatPercent(demoCoverage)}. YouTube Analytics API
                    bazı yaş/cinsiyet segmentleri için yeterli izleyici
                    döndürmediğinde ilgili bar'ları üretmez; bu yüzden tablo
                    eksik görünebilir.
                  </p>
                )}
                {demographicsByAge.map(([age, genders]) => {
                  const label = age.replace(/^age/i, "").replace("_", "-");
                  return (
                    <div
                      key={age}
                      className="grid grid-cols-[64px_1fr] items-center gap-3"
                    >
                      <div className="text-right font-mono text-xs text-neutral-500">
                        {label}
                      </div>
                      <div className="space-y-1">
                        {[...genders.entries()]
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([gender, pct]) => {
                            const color =
                              gender.toLowerCase() === "female"
                                ? "#ec4899"
                                : gender.toLowerCase() === "male"
                                  ? "#0ea5e9"
                                  : "#9ca3af";
                            const width =
                              demoMax > 0
                                ? Math.max(2, (pct / demoMax) * 100)
                                : 0;
                            return (
                              <div
                                key={gender}
                                className="flex items-center gap-2"
                              >
                                <div className="w-16 text-[11px] text-neutral-600">
                                  {genderLabel(gender)}
                                </div>
                                <div className="relative h-4 flex-1 overflow-hidden rounded bg-neutral-100">
                                  <div
                                    className="h-full rounded transition-[width] duration-500"
                                    style={{
                                      width: `${width}%`,
                                      backgroundColor: color,
                                    }}
                                  />
                                </div>
                                <div className="w-14 text-right font-mono text-[11px] tabular-nums text-neutral-700">
                                  {formatPercent(pct)}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionShell>

          {/* ─────────── Traffic sources + Devices (side-by-side) ─────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionShell
              title="Trafik Kaynakları"
              description="İzleyicilerin videolarınıza nereden ulaştığı."
              testId="admin-yt-traffic"
            >
              {trafficQuery.data && trafficQuery.data.rows.length === 0 && (
                <p className="text-sm text-neutral-500">
                  Trafik kaynağı verisi yok.
                </p>
              )}
              {trafficQuery.data && trafficQuery.data.rows.length > 0 && (
                <ul className="space-y-2">
                  {trafficQuery.data.rows
                    .slice()
                    .sort((a, b) => b.views - a.views)
                    .map((r) => {
                      const pct =
                        trafficTotalViews > 0
                          ? (r.views / trafficTotalViews) * 100
                          : 0;
                      return (
                        <li
                          key={r.traffic_source_type}
                          className="flex items-center gap-3"
                        >
                          <div className="w-36 truncate text-sm text-neutral-700">
                            {trafficLabel(r.traffic_source_type)}
                          </div>
                          <div className="flex-1">
                            <ShareBar
                              value={r.views}
                              max={trafficTotalViews}
                              color="#f59e0b"
                            />
                          </div>
                          <div className="w-14 text-right font-mono text-[11px] tabular-nums text-neutral-600">
                            {pct.toFixed(1)}%
                          </div>
                          <div className="w-16 text-right tabular-nums text-[12px] text-neutral-500">
                            {formatNumber(r.views)}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </SectionShell>

            <SectionShell
              title="Cihaz Kırılımı"
              description="İzlenmelerin hangi cihazdan geldiği."
              testId="admin-yt-devices"
            >
              {devicesQuery.data && devicesQuery.data.rows.length === 0 && (
                <p className="text-sm text-neutral-500">Cihaz verisi yok.</p>
              )}
              {devicesQuery.data && devicesQuery.data.rows.length > 0 && (
                <ul className="space-y-2">
                  {devicesQuery.data.rows
                    .slice()
                    .sort((a, b) => b.views - a.views)
                    .map((r) => {
                      const pct =
                        deviceTotalViews > 0
                          ? (r.views / deviceTotalViews) * 100
                          : 0;
                      return (
                        <li
                          key={r.device_type}
                          className="flex items-center gap-3"
                        >
                          <div className="w-36 truncate text-sm text-neutral-700">
                            {deviceLabel(r.device_type)}
                          </div>
                          <div className="flex-1">
                            <ShareBar
                              value={r.views}
                              max={deviceTotalViews}
                              color="#14b8a6"
                            />
                          </div>
                          <div className="w-14 text-right font-mono text-[11px] tabular-nums text-neutral-600">
                            {pct.toFixed(1)}%
                          </div>
                          <div className="w-16 text-right tabular-nums text-[12px] text-neutral-500">
                            {formatNumber(r.views)}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </SectionShell>
          </div>
        </>
      )}
    </PageShell>
  );
}
