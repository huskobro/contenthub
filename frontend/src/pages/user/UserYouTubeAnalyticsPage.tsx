/**
 * UserYouTubeAnalyticsPage — Sprint 1 / Faz YT-A1.
 *
 * User-facing dashboard for real YouTube Analytics API v2 snapshots.
 * Pulls data from /api/v1/analytics/youtube/* endpoints which are
 * backed by YouTubeAnalyticsService daily snapshots (not local aggregates).
 *
 * Redesign (2026-04-14): "Analytics Newsroom" — KPI tile'ları tiklanabilir
 * toggle; secili metric grafikte canli olarak yansiyor. Top videolar icin
 * thumbnail + baslik, channel-videos endpoint'iyle video_id uzerinden
 * merge. Demografi / trafik kaynaklari / cihaz kirilimi TR label'lari.
 */

import { useMemo, useState } from "react";
import { useMyConnections } from "../../hooks/useConnections";
import {
  useYtChannelTotals,
  useYtDemographics,
  useYtDevices,
  useYtLastSync,
  useYtTopVideos,
  useYtTrafficSources,
  useTriggerYtSync,
} from "../../hooks/useYoutubeAnalytics";
import { useChannelVideos } from "../../hooks/useCredentials";
import type { YtChannelDailyRow } from "../../api/youtubeAnalyticsApi";
import {
  PageShell,
  SectionShell,
} from "../../components/design-system/primitives";
import { TrendChart } from "../../components/shared/charts/TrendChart";
import { YouTubeVideoManagementSheet } from "../../components/youtube/YouTubeVideoManagementSheet";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Constants & label maps
// ---------------------------------------------------------------------------

const WINDOW_OPTIONS: { value: number; label: string }[] = [
  { value: 7, label: "Son 7 Gün" },
  { value: 28, label: "Son 28 Gün" },
  { value: 90, label: "Son 90 Gün" },
];

// YouTube insightTrafficSourceType → Turkce okunabilir karsilik.
// Referans: https://developers.google.com/youtube/analytics/dimensions#Traffic_Source_Dimensions
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

// YouTube deviceType → Turkce
const DEVICE_TYPE_TR: Record<string, string> = {
  DESKTOP: "Masaüstü",
  MOBILE: "Mobil",
  TABLET: "Tablet",
  TV: "Televizyon",
  GAME_CONSOLE: "Oyun konsolu",
  UNKNOWN_PLATFORM: "Bilinmeyen",
};

// Gender → TR
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
  if (n === null || n === undefined) return "\u2014";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("tr-TR");
}

function formatHours(minutes: number | null | undefined): string {
  if (!minutes) return "0sa";
  const h = Math.floor(minutes / 60);
  if (h > 0) return `${h}sa ${Math.round(minutes % 60)}dk`;
  return `${Math.round(minutes)}dk`;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "\u2014";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPercent(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) return "\u2014";
  return `${(ratio * 100).toFixed(1)}%`;
}

function formatIsoDateTime(v: string | null): string {
  if (!v) return "\u2014";
  try {
    return new Date(v).toLocaleString("tr-TR");
  } catch {
    return v;
  }
}

function formatSignedInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n === 0) return "0";
  return `${n > 0 ? "+" : ""}${n.toLocaleString("tr-TR")}`;
}

// ---------------------------------------------------------------------------
// Metric catalog — KPI tile -> chart series mapping
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

interface MetricDef {
  key: MetricKey;
  label: string;
  color: string; // chart + accent color
  getDaily: (row: YtChannelDailyRow) => number;
  getTotal: (t: NonNullable<ReturnType<typeof pickTotals>>) => string;
  formatY: (v: number) => string;
  note?: (t: NonNullable<ReturnType<typeof pickTotals>>) => string | undefined;
}

// Small helper used by MetricDef — wraps totals for tile value lookup
function pickTotals(totals: {
  views: number;
  estimated_minutes_watched: number;
  subscribers_net: number;
  likes: number;
  shares: number;
  comments: number;
}, averages: {
  average_view_duration_seconds: number;
  average_view_percentage: number;
}) {
  return { totals, averages };
}

const METRICS: MetricDef[] = [
  {
    key: "views",
    label: "Görüntülenme",
    color: "#6366f1", // indigo
    getDaily: (r) => r.views,
    getTotal: ({ totals }) => formatNumber(totals.views),
    formatY: (v) => formatNumber(v),
  },
  {
    key: "watch_time",
    label: "Toplam İzleme",
    color: "#0ea5e9", // sky
    getDaily: (r) => r.estimated_minutes_watched,
    getTotal: ({ totals }) => formatHours(totals.estimated_minutes_watched),
    formatY: (v) => formatHours(v),
  },
  {
    key: "subs_net",
    label: "Net Abone",
    color: "#10b981", // emerald
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
    color: "#f43f5e", // rose
    getDaily: (r) => r.likes,
    getTotal: ({ totals }) => formatNumber(totals.likes),
    formatY: (v) => formatNumber(v),
  },
  {
    key: "shares",
    label: "Paylaşım",
    color: "#f59e0b", // amber
    getDaily: (r) => r.shares,
    getTotal: ({ totals }) => formatNumber(totals.shares),
    formatY: (v) => formatNumber(v),
  },
  {
    key: "comments",
    label: "Yorum",
    color: "#a855f7", // purple
    getDaily: (r) => r.comments,
    getTotal: ({ totals }) => formatNumber(totals.comments),
    formatY: (v) => formatNumber(v),
  },
  {
    key: "avg_duration",
    label: "Ort. İzleme Süresi",
    color: "#14b8a6", // teal
    getDaily: (r) => r.average_view_duration_seconds,
    getTotal: ({ averages }) =>
      formatDuration(averages.average_view_duration_seconds),
    formatY: (v) => formatDuration(v),
  },
  {
    key: "avg_percent",
    label: "Ort. İzleme %",
    color: "#ec4899", // pink
    getDaily: (r) => r.average_view_percentage,
    getTotal: ({ averages }) => formatPercent(averages.average_view_percentage),
    formatY: (v) => formatPercent(v),
  },
];

// ---------------------------------------------------------------------------
// Small UI building blocks (local — kept out of design system to stay scoped)
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
      {/* Bottom accent bar — visual anchor for "active" state */}
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

/** Thin horizontal bar — used inline in tables for share %. */
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

export function UserYouTubeAnalyticsPage() {
  const [windowDays, setWindowDays] = useState<number>(28);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [activeMetric, setActiveMetric] = useState<MetricKey>("views");

  // User parity: video management Sheet (thumbnails / metadata / captions)
  const [mgmtSheetOpen, setMgmtSheetOpen] = useState(false);
  const [mgmtVideo, setMgmtVideo] = useState<
    | {
        video_id: string;
        title: string;
        thumbnail_url?: string | null;
      }
    | null
  >(null);

  // Load the user's YouTube connections
  const connectionsQuery = useMyConnections({ platform: "youtube" });
  const youtubeConnections = useMemo(
    () => connectionsQuery.data?.items ?? [],
    [connectionsQuery.data],
  );

  // Auto-select first connection when loaded
  const activeConnectionId =
    selectedConnectionId ||
    (youtubeConnections.length > 0 ? youtubeConnections[0].id : "");

  const activeConnection = youtubeConnections.find(
    (c) => c.id === activeConnectionId,
  );

  // Real-API data hooks
  const totalsQuery = useYtChannelTotals(activeConnectionId || undefined, windowDays);
  const topVideosQuery = useYtTopVideos(activeConnectionId || undefined, windowDays, 10);
  const demographicsQuery = useYtDemographics(activeConnectionId || undefined);
  const trafficQuery = useYtTrafficSources(activeConnectionId || undefined);
  const devicesQuery = useYtDevices(activeConnectionId || undefined);
  const lastSyncQuery = useYtLastSync(activeConnectionId || undefined);
  const syncMutation = useTriggerYtSync(activeConnectionId || undefined);

  // Channel videos (title + thumbnail) — merged into top-videos table by video_id.
  // Only fire when we know the channel profile id behind this connection.
  const channelProfileId = activeConnection?.channel_profile_id ?? undefined;
  const channelVideosQuery = useChannelVideos(
    Boolean(channelProfileId),
    channelProfileId,
  );
  const videoMetaById = useMemo(() => {
    const map = new Map<string, { title: string; thumbnail_url: string | null }>();
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

  // Daily trend series — follows the active KPI
  const trendData = useMemo(() => {
    const daily = totalsQuery.data?.daily ?? [];
    return daily.map((d) => ({
      date: d.date.slice(5), // MM-DD
      value: currentMetric.getDaily(d),
    }));
  }, [totalsQuery.data, currentMetric]);

  const totals = totalsQuery.data?.totals;
  const averages = totalsQuery.data?.averages;
  const totalsBundle = totals && averages ? pickTotals(totals, averages) : null;

  // Traffic + devices totals for share %
  const trafficTotalViews = useMemo(
    () => (trafficQuery.data?.rows ?? []).reduce((s, r) => s + r.views, 0),
    [trafficQuery.data],
  );
  const deviceTotalViews = useMemo(
    () => (devicesQuery.data?.rows ?? []).reduce((s, r) => s + r.views, 0),
    [devicesQuery.data],
  );

  // Top videos max views (for inline share bar)
  const topVideosMax = useMemo(
    () =>
      Math.max(
        0,
        ...(topVideosQuery.data?.videos ?? []).map((v) => v.views),
      ),
    [topVideosQuery.data],
  );

  // Demographics — group by age_group, then two bars (male / female) inside.
  const demographicsByAge = useMemo(() => {
    const rows = demographicsQuery.data?.rows ?? [];
    const groups = new Map<string, Map<string, number>>();
    for (const r of rows) {
      if (!groups.has(r.age_group)) groups.set(r.age_group, new Map());
      groups.get(r.age_group)!.set(r.gender, r.viewer_percentage);
    }
    // sort age groups numerically (age13-17, age18-24, ...)
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [demographicsQuery.data]);

  const demoMax = useMemo(() => {
    let max = 0;
    for (const r of demographicsQuery.data?.rows ?? []) {
      if (r.viewer_percentage > max) max = r.viewer_percentage;
    }
    return max;
  }, [demographicsQuery.data]);

  // Viewer percentages across all age×gender rows should sum to ~1.0 (backend
  // normalises 0-100 API values to 0-1 ratios). YouTube omits segments with
  // too few viewers — surface coverage so a lopsided breakdown is obvious.
  const demoCoverage = useMemo(() => {
    let sum = 0;
    for (const r of demographicsQuery.data?.rows ?? []) {
      sum += r.viewer_percentage;
    }
    return sum;
  }, [demographicsQuery.data]);

  // Render branches
  const noYouTubeConnection =
    !connectionsQuery.isLoading && youtubeConnections.length === 0;
  const connectionRequiresReauth = activeConnection?.requires_reauth;

  // Last sync status chip (small)
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
      title="YouTube Analytics"
      subtitle="Gerçek YouTube Analytics API v2 verilerinden günlük görünüm, izlenme süresi, demografi ve trafik kaynakları."
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
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="rounded-md border border-border-default bg-surface-card px-3 py-1.5 text-sm text-neutral-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {WINDOW_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => syncMutation.mutate({ windowDays, runKind: "manual" })}
            disabled={!activeConnectionId || syncMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {syncMutation.isPending ? "Senkron ediliyor..." : "Şimdi Senkron Et"}
          </button>
        </div>
      }
    >
      {/* Empty / error states */}
      {connectionsQuery.isLoading && (
        <SectionShell title="Yükleniyor">
          <p className="text-sm text-neutral-600">Kanallar yükleniyor...</p>
        </SectionShell>
      )}

      {noYouTubeConnection && (
        <SectionShell title="YouTube bağlantınız yok">
          <p className="text-sm text-neutral-600">
            YouTube Analytics verilerini görüntülemek için önce bir YouTube kanalı
            bağlamanız gerekiyor.
          </p>
          <a
            href="/user/connections"
            className="mt-3 inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Bağlantı Merkezi'ne Git
          </a>
        </SectionShell>
      )}

      {/* Connection selector (if multiple) */}
      {youtubeConnections.length > 1 && (
        <SectionShell title="Kanal Seç">
          <div className="flex flex-wrap gap-2">
            {youtubeConnections.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedConnectionId(c.id)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  c.id === activeConnectionId
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-neutral-300 text-neutral-700 hover:border-neutral-400"
                }`}
              >
                {c.external_account_name || c.external_account_id || c.id.slice(0, 6)}
              </button>
            ))}
          </div>
        </SectionShell>
      )}

      {connectionRequiresReauth && (
        <SectionShell
          title="Yeniden yetkilendirme gerekli"
          description="Bu kanal için yt-analytics.readonly scope eksik."
        >
          <p className="text-sm text-amber-700">
            Bu kanal için <code>yt-analytics.readonly</code> scope eksik. Gerçek metrikler için
            kanalınızı yeniden yetkilendirin.
          </p>
          <a
            href="/user/connections"
            className="mt-3 inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            Yeniden Yetkilendir
          </a>
        </SectionShell>
      )}

      {/* ─────────── KPI Tiles + Trend Chart ─────────── */}
      {activeConnectionId && !connectionRequiresReauth && (
        <SectionShell
          title={`Kanal Toplamları — Son ${windowDays} Gün`}
          description="Bir metriğin üzerine tıklayın — aşağıdaki grafik o metriğin günlük serisine geçer."
        >
          {totalsQuery.isLoading && (
            <p className="text-sm text-neutral-500">Yükleniyor...</p>
          )}
          {totalsQuery.isError && (
            <p className="text-sm text-red-600">Veriler alınamadı. Lütfen senkron edin.</p>
          )}
          {totalsQuery.data && (totalsQuery.data.daily ?? []).length === 0 && (
            <p className="text-sm text-neutral-500">
              Henüz snapshot yok. Sağ üstten "Şimdi Senkron Et" diyerek ilk veri çekimini başlatın.
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
                    testId={`yt-kpi-${m.key}`}
                  />
                ))}
              </div>

              {/* Trend chart — follows active metric */}
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
                  testId={`yt-trend-${activeMetric}`}
                />
              </div>
            </>
          )}
        </SectionShell>
      )}

      {/* ─────────── Top Videos (with thumbnails + titles) ─────────── */}
      {activeConnectionId && !connectionRequiresReauth && (
        <SectionShell title="En Çok İzlenen Videolar">
          {topVideosQuery.isLoading && <p className="text-sm text-neutral-500">Yükleniyor...</p>}
          {topVideosQuery.data && topVideosQuery.data.videos.length === 0 && (
            <p className="text-sm text-neutral-500">Video metriği yok.</p>
          )}
          {topVideosQuery.data && topVideosQuery.data.videos.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
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
                    <th className="w-24 px-3 py-2 text-right font-medium text-neutral-500">
                      Aksiyon
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
                      <tr key={v.platform_video_id} className="hover:bg-surface-inset/60">
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
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            className="rounded-md border border-brand-200 px-2 py-1 text-xs text-brand-700 hover:bg-brand-50"
                            onClick={(e) => {
                              e.preventDefault();
                              setMgmtVideo({
                                video_id: v.platform_video_id,
                                title,
                                thumbnail_url: thumb ?? null,
                              });
                              setMgmtSheetOpen(true);
                            }}
                            data-testid={`user-yt-manage-${v.platform_video_id}`}
                          >
                            Yönet
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionShell>
      )}

      {/* ─────────── Demographics ─────────── */}
      {activeConnectionId && !connectionRequiresReauth && (
        <SectionShell
          title="Demografi"
          description="Yaş grubu başına izleyici yüzdesi; her yaş için erkek/kadın ayrımı."
        >
          {demographicsQuery.isLoading && (
            <p className="text-sm text-neutral-500">Yükleniyor...</p>
          )}
          {demographicsQuery.data && demographicsQuery.data.rows.length === 0 && (
            <p className="text-sm text-neutral-500">Demografi verisi yok.</p>
          )}
          {demographicsByAge.length > 0 && (
            <div className="space-y-2">
              {demoCoverage < 0.95 && (
                <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  Kapsam: {formatPercent(demoCoverage)}. YouTube Analytics API
                  bazı yaş/cinsiyet segmentleri için yeterli izleyici
                  döndürmediğinde o segmentler tabloda görünmez; bu yüzden tablo
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
      )}

      {/* ─────────── Traffic sources + Devices (side-by-side) ─────────── */}
      {activeConnectionId && !connectionRequiresReauth && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Traffic */}
          <SectionShell
            title="Trafik Kaynakları"
            description="İzleyicilerin videolarınıza nereden ulaştığı."
          >
            {trafficQuery.data && trafficQuery.data.rows.length === 0 && (
              <p className="text-sm text-neutral-500">Trafik kaynağı verisi yok.</p>
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

          {/* Devices */}
          <SectionShell
            title="Cihaz Kırılımı"
            description="İzlenmelerin hangi cihazdan geldiği."
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
      )}

      {/* ─────────── Last sync ─────────── */}
      {activeConnectionId && (
        <SectionShell title="Son Senkron">
          {lastSyncQuery.data?.last_sync ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-neutral-700">
              <div>
                <span className="text-neutral-500">Durum:</span>{" "}
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    lastSyncQuery.data.last_sync.status === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : lastSyncQuery.data.last_sync.status === "partial"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-rose-200 bg-rose-50 text-rose-700",
                  )}
                >
                  {lastSyncQuery.data.last_sync.status}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Başlangıç:</span>{" "}
                {formatIsoDateTime(lastSyncQuery.data.last_sync.started_at)}
              </div>
              <div>
                <span className="text-neutral-500">Bitiş:</span>{" "}
                {formatIsoDateTime(lastSyncQuery.data.last_sync.finished_at)}
              </div>
              <div>
                <span className="text-neutral-500">Yazılan satır:</span>{" "}
                <span className="tabular-nums">
                  {formatNumber(lastSyncQuery.data.last_sync.rows_written)}
                </span>
              </div>
              {lastSyncQuery.data.last_sync.error_message && (
                <div className="basis-full mt-2 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700">
                  {lastSyncQuery.data.last_sync.error_message}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Henüz senkron yapılmamış.</p>
          )}
        </SectionShell>
      )}

      {/* User parity: video management Sheet */}
      <YouTubeVideoManagementSheet
        open={mgmtSheetOpen}
        onClose={() => setMgmtSheetOpen(false)}
        connectionId={activeConnectionId || undefined}
        video={mgmtVideo}
      />
    </PageShell>
  );
}
