/**
 * Aurora Admin YouTube Analytics — admin.analytics.youtube override.
 *
 * Aurora Dusk Cockpit port of legacy AdminYouTubeAnalyticsPage. Live data via
 * useAdminConnections + useYtChannelTotals + useYtTopVideos + useYtLastSync,
 * with manual sync mutations preserved (useTriggerYtSync /
 * useTriggerYtSyncAll). KPI strip (subscribers, views, avg watch time) +
 * trend chart + right inspector (top channel/video) keep parity with legacy.
 */
import { useMemo, useState } from "react";
import { useAdminConnections } from "../../hooks/useConnections";
import {
  useYtChannelTotals,
  useYtLastSync,
  useYtTopVideos,
  useYtTrafficSources,
  useTriggerYtSync,
  useTriggerYtSyncAll,
} from "../../hooks/useYoutubeAnalytics";
import {
  AuroraButton,
  AuroraPageShell,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraMeterTile,
  AuroraTable,
  AuroraStatusChip,
  AuroraSpark,
} from "./primitives";
import { useToast } from "../../hooks/useToast";
import { toastMessageFromError } from "../../lib/errorUtils";

// --- helpers ---------------------------------------------------------------

function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("tr-TR");
}

function fmtSeconds(s: number | null | undefined): string {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const ss = String(Math.round(s % 60)).padStart(2, "0");
  return `${String(m).padStart(2, "0")}:${ss}`;
}

function fmtPct(p: number | null | undefined): string {
  if (p == null) return "—";
  return `${p.toFixed(1)}%`;
}

function fmtHours(minutes: number | null | undefined): string {
  if (!minutes || !Number.isFinite(minutes)) return "0sa";
  const h = Math.floor(minutes / 60);
  if (h > 0) return `${h}sa ${Math.round(minutes % 60)}dk`;
  return `${Math.round(minutes)}dk`;
}

function fmtSignedInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  return `${n > 0 ? "+" : ""}${n.toLocaleString("tr-TR")}`;
}

const WINDOW_OPTIONS: { value: number; label: string }[] = [
  { value: 7, label: "7g" },
  { value: 28, label: "28g" },
  { value: 90, label: "90g" },
];

interface VideoRow {
  platform_video_id: string;
  views: number;
  likes: number;
  estimated_minutes_watched: number;
  average_view_duration_seconds: number;
  average_view_percentage: number;
}

export function AuroraAdminYouTubeAnalyticsPage() {
  const toast = useToast();
  const { data: connectionsData, isLoading: connectionsLoading } =
    useAdminConnections({ platform: "youtube", limit: 200 });

  const connections = useMemo(
    () =>
      (connectionsData?.items ?? []).filter((c) => c.platform === "youtube"),
    [connectionsData],
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [windowDays, setWindowDays] = useState<number>(28);

  const effectiveId =
    selectedId || (connections.length > 0 ? connections[0].id : "");
  const selectedConnection = connections.find((c) => c.id === effectiveId);

  const totalsQuery = useYtChannelTotals(effectiveId || undefined, windowDays);
  const topVideosQuery = useYtTopVideos(effectiveId || undefined, windowDays, 10);
  const trafficQuery = useYtTrafficSources(effectiveId || undefined);
  const lastSyncQuery = useYtLastSync(effectiveId || undefined);

  const syncOne = useTriggerYtSync(effectiveId || undefined);
  const syncAll = useTriggerYtSyncAll();

  const totals = totalsQuery.data;
  const daily = totals?.daily ?? [];
  const topVideos = topVideosQuery.data?.videos ?? [];
  const lastSync = lastSyncQuery.data?.last_sync;

  const viewSeries = useMemo(
    () => (daily.length > 0 ? daily.map((d) => d.views) : [0, 0]),
    [daily],
  );
  const subSeries = useMemo(
    () =>
      daily.length > 0
        ? daily.map((d) => d.subscribers_gained - d.subscribers_lost)
        : [0, 0],
    [daily],
  );
  const watchSeries = useMemo(
    () =>
      daily.length > 0 ? daily.map((d) => d.estimated_minutes_watched) : [0, 0],
    [daily],
  );
  const likeSeries = useMemo(
    () => (daily.length > 0 ? daily.map((d) => d.likes) : [0, 0]),
    [daily],
  );

  const topVideo = topVideos[0];
  const topVideoUrl = topVideo
    ? `https://www.youtube.com/watch?v=${topVideo.platform_video_id}`
    : "#";

  const trafficRows = trafficQuery.data?.rows ?? [];
  const trafficTotalViews = trafficRows.reduce((s, r) => s + r.views, 0) || 1;

  const syncStatus = lastSync?.status ?? null;
  const syncTone =
    syncStatus === "ok"
      ? "success"
      : syncStatus === "partial"
        ? "warning"
        : syncStatus === "failed"
          ? "danger"
          : syncStatus === "running"
            ? "info"
            : "neutral";

  const videoColumns = [
    {
      key: "rank",
      header: "#",
      align: "right" as const,
      mono: true,
      width: "44px",
      render: (_v: VideoRow, i: number) => i + 1,
    },
    {
      key: "video",
      header: "Video",
      render: (v: VideoRow) => (
        <a
          href={`https://www.youtube.com/watch?v=${v.platform_video_id}`}
          target="_blank"
          rel="noreferrer"
          style={{
            color: "var(--accent-primary-hover)",
            textDecoration: "none",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          {v.platform_video_id}
        </a>
      ),
    },
    {
      key: "views",
      header: "Görüntülenme",
      align: "right" as const,
      mono: true,
      render: (v: VideoRow) => fmtNum(v.views),
    },
    {
      key: "watch",
      header: "İzleme",
      align: "right" as const,
      mono: true,
      render: (v: VideoRow) => fmtHours(v.estimated_minutes_watched),
    },
    {
      key: "avg_duration",
      header: "Ort. süre",
      align: "right" as const,
      mono: true,
      render: (v: VideoRow) => fmtSeconds(v.average_view_duration_seconds),
    },
    {
      key: "avg_pct",
      header: "Ort. %",
      align: "right" as const,
      mono: true,
      render: (v: VideoRow) => fmtPct(v.average_view_percentage),
    },
    {
      key: "likes",
      header: "Beğeni",
      align: "right" as const,
      mono: true,
      render: (v: VideoRow) => fmtNum(v.likes),
    },
  ];

  const inspector = (
    <AuroraInspector title="YouTube">
      <AuroraInspectorSection title={`Son ${windowDays} gün`}>
        <AuroraInspectorRow
          label="görüntülenme"
          value={totals ? fmtNum(totals.totals.views) : "—"}
        />
        <AuroraInspectorRow
          label="izleme"
          value={totals ? fmtHours(totals.totals.estimated_minutes_watched) : "—"}
        />
        <AuroraInspectorRow
          label="net abone"
          value={totals ? fmtSignedInt(totals.totals.subscribers_net) : "—"}
        />
        <AuroraInspectorRow
          label="ort. izlenme"
          value={
            totals
              ? fmtSeconds(totals.averages.average_view_duration_seconds)
              : "—"
          }
        />
        <AuroraInspectorRow
          label="ort. %"
          value={
            totals
              ? fmtPct((totals.averages.average_view_percentage ?? 0) * 100)
              : "—"
          }
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="En performanslı kanal">
        {selectedConnection ? (
          <>
            <AuroraInspectorRow
              label="kanal"
              value={
                selectedConnection.external_account_name ??
                selectedConnection.channel_profile_name ??
                selectedConnection.id.slice(0, 8)
              }
            />
            {selectedConnection.user_display_name && (
              <AuroraInspectorRow
                label="sahip"
                value={selectedConnection.user_display_name}
              />
            )}
            <AuroraInspectorRow
              label="bağlantı sayısı"
              value={fmtNum(connections.length)}
            />
          </>
        ) : (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Bağlantı seçili değil.
          </div>
        )}
      </AuroraInspectorSection>

      <AuroraInspectorSection title="En iyi video">
        {topVideo ? (
          <>
            <AuroraInspectorRow
              label="video"
              value={
                <a
                  href={topVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "var(--accent-primary-hover)",
                    textDecoration: "none",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {topVideo.platform_video_id}
                </a>
              }
            />
            <AuroraInspectorRow
              label="görüntülenme"
              value={fmtNum(topVideo.views)}
            />
            <AuroraInspectorRow
              label="ort. süre"
              value={fmtSeconds(topVideo.average_view_duration_seconds)}
            />
            <AuroraInspectorRow
              label="ort. %"
              value={fmtPct(topVideo.average_view_percentage)}
            />
          </>
        ) : (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {topVideosQuery.isLoading ? "Yükleniyor…" : "Veri yok."}
          </div>
        )}
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Senkron">
        <AuroraInspectorRow label="durum" value={syncStatus ?? "—"} />
        <AuroraInspectorRow
          label="satır"
          value={fmtNum(lastSync?.rows_written ?? 0)}
        />
        <AuroraButton
          variant="secondary"
          size="sm"
          disabled={!effectiveId || syncOne.isPending}
          onClick={() =>
            syncOne.mutate(undefined, {
              onSuccess: () =>
                toast.success("Bu YouTube kanalı için senkron tetiklendi"),
              onError: (err) => toast.error(toastMessageFromError(err)),
            })
          }
          style={{ width: "100%", marginTop: 6 }}
        >
          {syncOne.isPending ? "Senkronlanıyor…" : "Bu kanalı senkronla"}
        </AuroraButton>
        <AuroraButton
          variant="ghost"
          size="sm"
          disabled={syncAll.isPending}
          onClick={() =>
            syncAll.mutate(undefined, {
              onSuccess: () =>
                toast.success("Tüm YouTube kanalları için senkron tetiklendi"),
              onError: (err) => toast.error(toastMessageFromError(err)),
            })
          }
          style={{ width: "100%", marginTop: 6 }}
        >
          {syncAll.isPending ? "Senkronlanıyor…" : "Tümünü senkronla"}
        </AuroraButton>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-analytics" data-testid="aurora-analytics-youtube">
      <AuroraPageShell
        title="YouTube Analytics (Admin)"
        breadcrumbs={[
          { label: "Analytics", href: "/admin/analytics" },
          { label: "YouTube" },
        ]}
        description={
          selectedConnection
            ? `${
                selectedConnection.external_account_name ??
                selectedConnection.channel_profile_name ??
                selectedConnection.id.slice(0, 8)
              } · son ${windowDays} gün`
            : `Tüm YouTube bağlantıları · pencere ${windowDays} gün`
        }
        actions={
          <div className="hstack" style={{ gap: 8 }}>
            {syncStatus && (
              <AuroraStatusChip tone={syncTone}>{syncStatus}</AuroraStatusChip>
            )}
            <select
              value={effectiveId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={connectionsLoading || connections.length === 0}
              style={{
                padding: "6px 10px",
                border: "1px solid var(--border-default)",
                borderRadius: 7,
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontFamily: "inherit",
                fontSize: 12,
              }}
              data-testid="aurora-yt-connection-select"
            >
              {connections.length === 0 && (
                <option value="">Bağlantı yok</option>
              )}
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.external_account_name ??
                    c.channel_profile_name ??
                    c.id.slice(0, 8)}
                  {c.user_display_name ? ` — ${c.user_display_name}` : ""}
                </option>
              ))}
            </select>
            <div className="tog">
              {WINDOW_OPTIONS.map((w) => (
                <button
                  key={w.value}
                  className={windowDays === w.value ? "on" : ""}
                  onClick={() => setWindowDays(w.value)}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <AuroraButton
              variant="secondary"
              size="sm"
              disabled={!effectiveId || syncOne.isPending}
              onClick={() =>
                syncOne.mutate(undefined, {
                  onSuccess: () =>
                    toast.success("Bu YouTube kanalı için senkron tetiklendi"),
                  onError: (err) => toast.error(toastMessageFromError(err)),
                })
              }
            >
              {syncOne.isPending ? "Senkron…" : "Senkronla"}
            </AuroraButton>
          </div>
        }
      >
        {connections.length === 0 && !connectionsLoading && (
          <div
            className="card card-pad"
            style={{ textAlign: "center", padding: 32 }}
            data-testid="aurora-yt-no-connections"
          >
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Henüz tanımlı bir YouTube bağlantısı yok.
            </div>
          </div>
        )}

        {connections.length > 0 && (
          <>
            {/* KPI strip */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <AuroraMeterTile
                label="Görüntülenme"
                value={totals ? fmtNum(totals.totals.views) : "—"}
                footer={`${daily.length} gün`}
                spark={
                  <AuroraSpark
                    data={viewSeries}
                    color="var(--accent-primary)"
                    height={28}
                  />
                }
                loading={totalsQuery.isLoading}
                data-testid="aurora-yt-kpi-views"
              />
              <AuroraMeterTile
                label="Net abone"
                value={
                  totals ? fmtSignedInt(totals.totals.subscribers_net) : "—"
                }
                footer={`beğeni ${totals ? fmtNum(totals.totals.likes) : "—"}`}
                tone={
                  (totals?.totals.subscribers_net ?? 0) > 0
                    ? "success"
                    : (totals?.totals.subscribers_net ?? 0) < 0
                      ? "warning"
                      : "default"
                }
                spark={
                  <AuroraSpark
                    data={subSeries}
                    color="var(--accent-secondary)"
                    height={28}
                  />
                }
                loading={totalsQuery.isLoading}
                data-testid="aurora-yt-kpi-subs"
              />
              <AuroraMeterTile
                label="Ort. izleme süresi"
                value={
                  totals
                    ? fmtSeconds(
                        totals.averages.average_view_duration_seconds,
                      )
                    : "—"
                }
                footer={`toplam ${
                  totals ? fmtHours(totals.totals.estimated_minutes_watched) : "—"
                }`}
                spark={
                  <AuroraSpark
                    data={watchSeries}
                    color="var(--accent-tertiary)"
                    height={28}
                  />
                }
                loading={totalsQuery.isLoading}
                data-testid="aurora-yt-kpi-watch"
              />
              <AuroraMeterTile
                label="Beğeni"
                value={totals ? fmtNum(totals.totals.likes) : "—"}
                footer={`yorum ${
                  totals ? fmtNum(totals.totals.comments) : "—"
                }`}
                spark={
                  <AuroraSpark
                    data={likeSeries}
                    color="var(--text-muted)"
                    height={28}
                  />
                }
                loading={totalsQuery.isLoading}
                data-testid="aurora-yt-kpi-likes"
              />
            </div>

            {/* Trend chart */}
            <div
              className="card card-pad"
              style={{ marginBottom: 14 }}
              data-testid="aurora-yt-trend"
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  Günlük görüntülenme trendi
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-muted)",
                  }}
                >
                  son {windowDays} gün · {daily.length} nokta
                </div>
              </div>
              <div style={{ height: 140 }}>
                <AuroraSpark
                  data={viewSeries}
                  color="var(--accent-primary)"
                  height={140}
                />
              </div>
            </div>

            {/* Top videos */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                  padding: "0 4px",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  En çok izlenen videolar
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-muted)",
                  }}
                >
                  {topVideos.length} video
                </div>
              </div>
              <AuroraTable<VideoRow>
                columns={videoColumns}
                rows={topVideos}
                rowKey={(v) => v.platform_video_id}
                loading={topVideosQuery.isLoading}
                empty={
                  <span className="caption">
                    Bu pencere için video metriği yok.
                  </span>
                }
                data-testid="aurora-yt-top-videos-table"
              />
            </div>

            {/* Traffic sources */}
            {trafficRows.length > 0 && (
              <div className="card card-pad">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    Trafik kaynakları
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                    }}
                  >
                    toplam {fmtNum(trafficTotalViews)}
                  </div>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {trafficRows
                    .slice()
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 8)
                    .map((r) => {
                      const pct = (r.views / trafficTotalViews) * 100;
                      return (
                        <li
                          key={r.traffic_source_type}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "160px 1fr 60px 60px",
                            gap: 10,
                            alignItems: "center",
                            padding: "6px 0",
                            fontSize: 12,
                          }}
                        >
                          <span
                            style={{
                              color: "var(--text-secondary)",
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                            }}
                          >
                            {r.traffic_source_type}
                          </span>
                          <div className="trend-bar">
                            <div
                              className="fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              textAlign: "right",
                              color: "var(--text-muted)",
                            }}
                          >
                            {pct.toFixed(1)}%
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              textAlign: "right",
                            }}
                          >
                            {fmtNum(r.views)}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </>
        )}
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
