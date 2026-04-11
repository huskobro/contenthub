/**
 * UserYouTubeAnalyticsPage — Sprint 1 / Faz YT-A1.
 *
 * User-facing dashboard for real YouTube Analytics API v2 snapshots.
 * Pulls data from /api/v1/analytics/youtube/* endpoints which are
 * backed by YouTubeAnalyticsService daily snapshots (not local aggregates).
 *
 * Structure:
 *   1. Connection selector (user's YouTube channels)
 *   2. Window selector (7/28/90 days)
 *   3. Channel totals tiles (views, watch time, subs, avg duration, %)
 *   4. Daily trend chart (views over time)
 *   5. Top videos table (by views)
 *   6. Demographics donut (age/gender)
 *   7. Traffic sources breakdown
 *   8. Device breakdown
 *   9. Last sync status + manual sync button
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
import {
  PageShell,
  SectionShell,
  MetricGrid,
  MetricTile,
} from "../../components/design-system/primitives";
import { TrendChart } from "../../components/shared/charts/TrendChart";
import { YouTubeVideoManagementSheet } from "../../components/youtube/YouTubeVideoManagementSheet";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WINDOW_OPTIONS: { value: number; label: string }[] = [
  { value: 7, label: "Son 7 Gün" },
  { value: 28, label: "Son 28 Gün" },
  { value: 90, label: "Son 90 Gün" },
];

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserYouTubeAnalyticsPage() {
  const [windowDays, setWindowDays] = useState<number>(28);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");

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

  // Daily trend series
  const trendData = useMemo(() => {
    const daily = totalsQuery.data?.daily ?? [];
    return daily.map((d) => ({
      date: d.date.slice(5), // MM-DD
      value: d.views,
    }));
  }, [totalsQuery.data]);

  const totals = totalsQuery.data?.totals;
  const averages = totalsQuery.data?.averages;

  // Traffic + devices totals for share %
  const trafficTotalViews = useMemo(
    () => (trafficQuery.data?.rows ?? []).reduce((s, r) => s + r.views, 0),
    [trafficQuery.data],
  );
  const deviceTotalViews = useMemo(
    () => (devicesQuery.data?.rows ?? []).reduce((s, r) => s + r.views, 0),
    [devicesQuery.data],
  );

  // Render branches
  const noYouTubeConnection = !connectionsQuery.isLoading && youtubeConnections.length === 0;
  const connectionRequiresReauth = activeConnection?.requires_reauth;

  return (
    <PageShell
      title="YouTube Analytics"
      subtitle="Gerçek YouTube Analytics API v2 verilerinden günlük görünüm, izlenme süresi, demografi ve trafik kaynakları."
      actions={
        <div className="flex items-center gap-2">
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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

      {/* Channel totals */}
      {activeConnectionId && !connectionRequiresReauth && (
        <SectionShell title={`Kanal Toplamları — Son ${windowDays} Gün`}>
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
          {totals && (
            <MetricGrid>
              <MetricTile label="Görüntülenme" value={formatNumber(totals.views)} />
              <MetricTile
                label="Toplam İzleme"
                value={formatHours(totals.estimated_minutes_watched)}
              />
              <MetricTile
                label="Net Abone"
                value={formatNumber(totals.subscribers_net)}
                note={totals.subscribers_net >= 0 ? "Pozitif" : "Negatif"}
              />
              <MetricTile label="Beğeni" value={formatNumber(totals.likes)} />
              <MetricTile label="Paylaşım" value={formatNumber(totals.shares)} />
              <MetricTile label="Yorum" value={formatNumber(totals.comments)} />
              <MetricTile
                label="Ort. İzleme Süresi"
                value={formatDuration(averages?.average_view_duration_seconds)}
              />
              <MetricTile
                label="Ort. İzleme %"
                value={formatPercent(averages?.average_view_percentage)}
              />
            </MetricGrid>
          )}
        </SectionShell>
      )}

      {/* Trend */}
      {activeConnectionId && trendData.length > 0 && (
        <SectionShell title="Günlük Görüntülenme">
          <TrendChart
            data={trendData}
            xKey="date"
            yKey="value"
            height={240}
            emptyMessage="Günlük veri yok"
          />
        </SectionShell>
      )}

      {/* Top videos */}
      {activeConnectionId && !connectionRequiresReauth && (
        <SectionShell title="En Çok İzlenen Videolar">
          {topVideosQuery.isLoading && <p className="text-sm text-neutral-500">Yükleniyor...</p>}
          {topVideosQuery.data && topVideosQuery.data.videos.length === 0 && (
            <p className="text-sm text-neutral-500">Video metriği yok.</p>
          )}
          {topVideosQuery.data && topVideosQuery.data.videos.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-neutral-600">
                      Video ID
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-600">
                      Görüntülenme
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-600">
                      İzleme
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-600">
                      Ort. Süre
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-600">
                      Ort. %
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-600">
                      Beğeni
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-600">
                      Aksiyon
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {topVideosQuery.data.videos.map((v) => (
                    <tr key={v.platform_video_id}>
                      <td className="px-3 py-2 font-mono text-xs text-neutral-700">
                        {v.platform_video_id}
                      </td>
                      <td className="px-3 py-2 text-right">{formatNumber(v.views)}</td>
                      <td className="px-3 py-2 text-right">
                        {formatHours(v.estimated_minutes_watched)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatDuration(v.average_view_duration_seconds)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatPercent(v.average_view_percentage)}
                      </td>
                      <td className="px-3 py-2 text-right">{formatNumber(v.likes)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded-md border border-brand-200 text-brand-600 hover:bg-brand-50"
                          onClick={() => {
                            setMgmtVideo({
                              video_id: v.platform_video_id,
                              title: v.platform_video_id,
                              thumbnail_url: null,
                            });
                            setMgmtSheetOpen(true);
                          }}
                          data-testid={`user-yt-manage-${v.platform_video_id}`}
                        >
                          Yönet
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionShell>
      )}

      {/* Demographics */}
      {activeConnectionId && !connectionRequiresReauth && (
        <SectionShell title="Demografi (Yaş + Cinsiyet)">
          {demographicsQuery.isLoading && (
            <p className="text-sm text-neutral-500">Yükleniyor...</p>
          )}
          {demographicsQuery.data && demographicsQuery.data.rows.length === 0 && (
            <p className="text-sm text-neutral-500">Demografi verisi yok.</p>
          )}
          {demographicsQuery.data && demographicsQuery.data.rows.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {demographicsQuery.data.rows.map((r, i) => (
                <div
                  key={i}
                  className="rounded-md border border-neutral-200 bg-white px-3 py-2"
                >
                  <div className="text-xs text-neutral-500">
                    {r.age_group} · {r.gender}
                  </div>
                  <div className="text-lg font-semibold text-neutral-900">
                    {formatPercent(r.viewer_percentage)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionShell>
      )}

      {/* Traffic sources */}
      {activeConnectionId && !connectionRequiresReauth && (
        <SectionShell title="Trafik Kaynakları">
          {trafficQuery.data && trafficQuery.data.rows.length === 0 && (
            <p className="text-sm text-neutral-500">Trafik kaynağı verisi yok.</p>
          )}
          {trafficQuery.data && trafficQuery.data.rows.length > 0 && (
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-neutral-600">
                    Kaynak
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-600">
                    Görüntülenme
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-600">
                    Pay
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {trafficQuery.data.rows
                  .slice()
                  .sort((a, b) => b.views - a.views)
                  .map((r) => (
                    <tr key={r.traffic_source_type}>
                      <td className="px-3 py-2">{r.traffic_source_type}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(r.views)}</td>
                      <td className="px-3 py-2 text-right">
                        {trafficTotalViews > 0
                          ? `${((r.views / trafficTotalViews) * 100).toFixed(1)}%`
                          : "\u2014"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </SectionShell>
      )}

      {/* Devices */}
      {activeConnectionId && !connectionRequiresReauth && (
        <SectionShell title="Cihaz Kırılımı">
          {devicesQuery.data && devicesQuery.data.rows.length === 0 && (
            <p className="text-sm text-neutral-500">Cihaz verisi yok.</p>
          )}
          {devicesQuery.data && devicesQuery.data.rows.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {devicesQuery.data.rows.map((r) => (
                <div
                  key={r.device_type}
                  className="rounded-md border border-neutral-200 bg-white p-3"
                >
                  <div className="text-xs uppercase tracking-wide text-neutral-500">
                    {r.device_type}
                  </div>
                  <div className="mt-1 text-xl font-semibold text-neutral-900">
                    {formatNumber(r.views)}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {deviceTotalViews > 0
                      ? `${((r.views / deviceTotalViews) * 100).toFixed(1)}% pay`
                      : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionShell>
      )}

      {/* Last sync */}
      {activeConnectionId && (
        <SectionShell title="Son Senkron">
          {lastSyncQuery.data?.last_sync ? (
            <div className="text-sm text-neutral-700">
              <div>
                <span className="text-neutral-500">Durum:</span>{" "}
                <span
                  className={
                    lastSyncQuery.data.last_sync.status === "ok"
                      ? "font-medium text-emerald-600"
                      : lastSyncQuery.data.last_sync.status === "partial"
                        ? "font-medium text-amber-600"
                        : "font-medium text-red-600"
                  }
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
                {formatNumber(lastSyncQuery.data.last_sync.rows_written)}
              </div>
              {lastSyncQuery.data.last_sync.error_message && (
                <div className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
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
