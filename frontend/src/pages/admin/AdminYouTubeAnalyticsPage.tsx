/**
 * AdminYouTubeAnalyticsPage — Gate 5 B1.
 *
 * Admin dashboard for YouTube Analytics API v2 snapshots across ALL
 * platform connections. Complements YouTubeAnalyticsPage (which targets
 * the active admin's own single connection via the YouTube Data API):
 *
 *   YouTubeAnalyticsPage     → live channel+video stats, single connection
 *   AdminYouTubeAnalyticsPage → snapshot aggregates, cross-connection view,
 *                                manual backfill controls
 *
 * Surface:
 *   1. Connection picker (all YouTube connections, admin-scope)
 *   2. Last-sync banner + per-connection sync action
 *   3. Channel totals (views, watch minutes, net subscribers, engagement)
 *   4. Top videos snapshot table
 *   5. Traffic-source / device / demographics breakdown donuts
 *
 * All metrics carry a SnapshotLockDisclaimer: numbers reflect the locked
 * settings/templates each underlying job ran with, not current admin
 * configuration.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import {
  PageShell,
  SectionShell,
  MetricTile,
  MetricGrid,
  DataTable,
  ActionButton,
} from "../../components/design-system/primitives";
import { SnapshotLockDisclaimer } from "../../components/analytics/SnapshotLockDisclaimer";
import { ExportButton } from "../../components/analytics/ExportButton";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString("tr-TR");
}

function fmtPercent(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}sn`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}dk ${s}sn`;
}

function fmtRelativeTime(iso: string | null | undefined): string {
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
// Window options
// ---------------------------------------------------------------------------

const WINDOW_OPTIONS: { value: number; label: string }[] = [
  { value: 7, label: "Son 7 Gün" },
  { value: 28, label: "Son 28 Gün" },
  { value: 90, label: "Son 90 Gün" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminYouTubeAnalyticsPage() {
  const { data: connectionsData, isLoading: connectionsLoading } = useAdminConnections({
    platform: "youtube",
    limit: 200,
  });
  const connections = useMemo(
    () => (connectionsData?.items ?? []).filter((c) => c.platform === "youtube"),
    [connectionsData],
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [windowDays, setWindowDays] = useState<number>(28);

  // Auto-pick first connection once loaded
  const effectiveId =
    selectedId || (connections.length > 0 ? connections[0].id : "");

  const { data: totals, isLoading: totalsLoading } = useYtChannelTotals(
    effectiveId || undefined,
    windowDays,
  );
  const { data: topVideos, isLoading: topLoading } = useYtTopVideos(
    effectiveId || undefined,
    windowDays,
    10,
  );
  const { data: traffic } = useYtTrafficSources(effectiveId || undefined);
  const { data: devices } = useYtDevices(effectiveId || undefined);
  const { data: demographics } = useYtDemographics(effectiveId || undefined);
  const { data: lastSync } = useYtLastSync(effectiveId || undefined);

  const syncOne = useTriggerYtSync(effectiveId || undefined);
  const syncAll = useTriggerYtSyncAll();

  const selectedConnection = connections.find((c) => c.id === effectiveId);

  return (
    <PageShell
      title="YouTube Analytics (Admin)"
      subtitle="Tüm YouTube bağlantıları için snapshot tabanlı metrikler."
      breadcrumb={[
        { label: "Analytics", to: "/admin/analytics" },
        { label: "YouTube (Tüm Kanallar)" },
      ]}
      testId="admin-yt-analytics"
      actions={
        <div className="flex gap-2 items-center">
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
          <p className="text-sm text-neutral-600" data-testid="admin-yt-no-connections">
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
                    {c.external_account_name ?? c.channel_profile_name ?? c.id.slice(0, 8)}
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
            {lastSync?.last_sync && (
              <span
                className="text-xs text-neutral-500"
                data-testid="admin-yt-last-sync"
              >
                Son senkron:{" "}
                <strong className="text-neutral-700">
                  {fmtRelativeTime(lastSync.last_sync.finished_at ?? lastSync.last_sync.started_at)}
                </strong>
                {lastSync.last_sync.status !== "ok" && (
                  <span
                    className={cn(
                      "ml-2 rounded px-2 py-0.5 text-[10px] uppercase",
                      lastSync.last_sync.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700",
                    )}
                  >
                    {lastSync.last_sync.status}
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </SectionShell>

      {effectiveId && (
        <>
          {/* Channel totals */}
          <SectionShell
            title={`Kanal Toplamları${selectedConnection?.external_account_name ? ` — ${selectedConnection.external_account_name}` : ""}`}
            testId="admin-yt-channel-totals"
          >
            <MetricGrid>
              <MetricTile
                label="Görüntüleme"
                value={fmtNum(totals?.totals.views)}
                note={`Son ${windowDays} gün`}
                loading={totalsLoading}
                testId="admin-yt-metric-views"
              />
              <MetricTile
                label="İzleme Dakikası"
                value={fmtNum(totals?.totals.estimated_minutes_watched)}
                note="Tahmini toplam izleme"
                loading={totalsLoading}
                testId="admin-yt-metric-minutes"
              />
              <MetricTile
                label="Net Abone"
                value={fmtNum(totals?.totals.subscribers_net)}
                note="Kazanılan − Kaybedilen"
                loading={totalsLoading}
                testId="admin-yt-metric-subs-net"
              />
              <MetricTile
                label="Beğeni"
                value={fmtNum(totals?.totals.likes)}
                loading={totalsLoading}
                testId="admin-yt-metric-likes"
              />
              <MetricTile
                label="Paylaşım"
                value={fmtNum(totals?.totals.shares)}
                loading={totalsLoading}
                testId="admin-yt-metric-shares"
              />
              <MetricTile
                label="Yorum"
                value={fmtNum(totals?.totals.comments)}
                loading={totalsLoading}
                testId="admin-yt-metric-comments"
              />
              <MetricTile
                label="Ort. İzleme Süresi"
                value={fmtDuration(totals?.averages.average_view_duration_seconds)}
                note="Video başına"
                loading={totalsLoading}
                testId="admin-yt-metric-avg-duration"
              />
              <MetricTile
                label="Ort. İzleme %"
                value={fmtPercent(totals?.averages.average_view_percentage)}
                note="Video başına"
                loading={totalsLoading}
                testId="admin-yt-metric-avg-pct"
              />
            </MetricGrid>
          </SectionShell>

          {/* Top videos */}
          <SectionShell title="En İyi Videolar (Snapshot)" testId="admin-yt-top-videos">
            <DataTable
              columns={[
                {
                  key: "platform_video_id",
                  header: "Video ID",
                  render: (v) => (
                    <a
                      href={`https://youtu.be/${v.platform_video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 no-underline hover:underline"
                    >
                      {v.platform_video_id.slice(0, 11)}
                    </a>
                  ),
                },
                { key: "views", header: "Görüntüleme", render: (v) => fmtNum(v.views) },
                {
                  key: "estimated_minutes_watched",
                  header: "Dakika",
                  render: (v) => fmtNum(v.estimated_minutes_watched),
                },
                { key: "likes", header: "Beğeni", render: (v) => fmtNum(v.likes) },
                { key: "comments", header: "Yorum", render: (v) => fmtNum(v.comments) },
                {
                  key: "average_view_duration_seconds",
                  header: "Ort. Süre",
                  render: (v) => fmtDuration(v.average_view_duration_seconds),
                },
                {
                  key: "average_view_percentage",
                  header: "Ort. %",
                  render: (v) => fmtPercent(v.average_view_percentage),
                },
              ]}
              data={topVideos?.videos ?? []}
              keyFn={(v) => v.platform_video_id}
              loading={topLoading}
              emptyMessage="Bu pencere için snapshot bulunmuyor. Senkronlama gerekebilir."
              testId="admin-yt-top-videos-table"
              rowTestIdPrefix="admin-yt-top-row"
            />
          </SectionShell>

          {/* Traffic / Devices / Demographics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SectionShell title="Trafik Kaynakları" testId="admin-yt-traffic">
              {(!traffic?.rows || traffic.rows.length === 0) ? (
                <p className="text-sm text-neutral-500">Veri yok.</p>
              ) : (
                <ul className="m-0 flex flex-col gap-1 p-0">
                  {traffic.rows.slice(0, 8).map((t) => (
                    <li
                      key={t.traffic_source_type}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-neutral-700">{t.traffic_source_type}</span>
                      <span className="text-neutral-500 tabular-nums">{fmtNum(t.views)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionShell>
            <SectionShell title="Cihaz Kırılımı" testId="admin-yt-devices">
              {(!devices?.rows || devices.rows.length === 0) ? (
                <p className="text-sm text-neutral-500">Veri yok.</p>
              ) : (
                <ul className="m-0 flex flex-col gap-1 p-0">
                  {devices.rows.map((d) => (
                    <li
                      key={d.device_type}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-neutral-700">{d.device_type}</span>
                      <span className="text-neutral-500 tabular-nums">{fmtNum(d.views)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionShell>
            <SectionShell title="Demografi" testId="admin-yt-demographics">
              {(!demographics?.rows || demographics.rows.length === 0) ? (
                <p className="text-sm text-neutral-500">Veri yok.</p>
              ) : (
                <ul className="m-0 flex flex-col gap-1 p-0">
                  {demographics.rows.slice(0, 10).map((r, i) => (
                    <li
                      key={`${r.age_group}-${r.gender}-${i}`}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-neutral-700">
                        {r.age_group} · {r.gender}
                      </span>
                      <span className="text-neutral-500 tabular-nums">
                        {fmtPercent(r.viewer_percentage)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionShell>
          </div>
        </>
      )}
    </PageShell>
  );
}
