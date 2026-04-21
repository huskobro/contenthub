/**
 * Aurora User YouTube Analytics — user.analytics.youtube override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/youtube-analytics.html
 * Veri: fetchYtChannelTotals + fetchYtTopVideos + fetchYtLastSync (gerçek
 * YouTube Analytics snapshot). Bağlantı seçimi useMyConnections üzerinden
 * yapılır; varsayılan olarak ilk YouTube bağlantısı seçilir.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchYtChannelTotals,
  fetchYtTopVideos,
  fetchYtLastSync,
  triggerYtSync,
} from "../../api/youtubeAnalyticsApi";
import { useMyConnections } from "../../hooks/useConnections";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../hooks/useToast";
import { toastMessageFromError } from "../../lib/errorUtils";
import {
  AuroraButton,
  AuroraSpark,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";
import { Icon } from "./icons";

const WINDOWS: { value: number; label: string }[] = [
  { value: 7, label: "7g" },
  { value: 28, label: "28g" },
  { value: 90, label: "90g" },
];

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtSeconds(s: number | null): string {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const ss = String(Math.round(s % 60)).padStart(2, "0");
  return `${String(m).padStart(2, "0")}:${ss}`;
}

function fmtPct(p: number | null): string {
  if (p == null) return "—";
  return `${p.toFixed(1)}%`;
}

export function AuroraUserYouTubeAnalyticsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const connQ = useMyConnections({ platform: "youtube", limit: 50 });
  const ytConnections = useMemo(
    () => (connQ.data?.items ?? []).filter((c) => c.platform === "youtube"),
    [connQ.data],
  );

  const [windowDays, setWindowDays] = useState<number>(28);
  const [connId, setConnId] = useState<string | null>(null);
  const activeConnId = connId ?? ytConnections[0]?.id ?? null;
  const activeConn = ytConnections.find((c) => c.id === activeConnId);

  const totalsQ = useQuery({
    queryKey: ["yt-analytics", "totals", activeConnId, windowDays],
    queryFn: () => fetchYtChannelTotals(activeConnId!, windowDays),
    enabled: !!activeConnId,
    staleTime: 60_000,
  });
  const topVideosQ = useQuery({
    queryKey: ["yt-analytics", "top-videos", activeConnId, windowDays],
    queryFn: () => fetchYtTopVideos(activeConnId!, windowDays, 5),
    enabled: !!activeConnId,
  });
  const lastSyncQ = useQuery({
    queryKey: ["yt-analytics", "last-sync", activeConnId],
    queryFn: () => fetchYtLastSync(activeConnId!),
    enabled: !!activeConnId,
    staleTime: 30_000,
  });

  const syncM = useMutation({
    mutationFn: () => triggerYtSync(activeConnId!, windowDays, "manual"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yt-analytics"] });
      toast.success("YouTube senkron tetiklendi");
    },
    onError: (err) => {
      // Faz 4: provider failures used to vanish — surface them.
      toast.error(toastMessageFromError(err));
    },
  });

  const totals = totalsQ.data;
  const daily = totals?.daily ?? [];
  const viewSeries = useMemo(
    () => (daily.length > 0 ? daily.map((d) => d.views) : new Array(12).fill(0)),
    [daily],
  );
  const subSeries = useMemo(
    () =>
      daily.length > 0
        ? daily.map((d) => d.subscribers_gained - d.subscribers_lost)
        : new Array(12).fill(0),
    [daily],
  );
  const watchSeries = useMemo(
    () => (daily.length > 0 ? daily.map((d) => d.estimated_minutes_watched) : new Array(12).fill(0)),
    [daily],
  );
  const lastSync = lastSyncQ.data?.last_sync;

  const inspector = (
    <AuroraInspector title="YT özeti">
      <AuroraInspectorSection title={`Son ${windowDays} gün`}>
        <AuroraInspectorRow label="görüntülenme" value={totals ? fmtNum(totals.totals.views) : "—"} />
        <AuroraInspectorRow
          label="net abone"
          value={totals ? (totals.totals.subscribers_net >= 0 ? "+" : "") + fmtNum(totals.totals.subscribers_net) : "—"}
        />
        <AuroraInspectorRow
          label="ort. izlenme"
          value={totals ? fmtSeconds(totals.averages.average_view_duration_seconds) : "—"}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Senkron">
        <AuroraInspectorRow label="durum" value={lastSync?.status ?? "—"} />
        <AuroraInspectorRow label="satır" value={String(lastSync?.rows_written ?? 0)} />
        <AuroraButton
          variant="secondary"
          size="sm"
          disabled={!activeConnId || syncM.isPending}
          onClick={() => syncM.mutate()}
          style={{ width: "100%", marginTop: 6 }}
        >
          {syncM.isPending ? "Senkronlanıyor…" : "Şimdi senkronla"}
        </AuroraButton>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  if (ytConnections.length === 0) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div className="page-head">
            <div>
              <h1>YouTube analitik</h1>
              <div className="sub">Bağlı YouTube kanalı yok</div>
            </div>
          </div>
          <div className="card card-pad" style={{ textAlign: "center", padding: 32 }}>
            <Icon name="alert-triangle" size={28} />
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-secondary)" }}>
              YouTube analitiği görmek için önce bir YouTube kanalı bağlamalısınız.
            </div>
            <div style={{ marginTop: 12 }}>
              <AuroraButton
                variant="primary"
                size="sm"
                onClick={() => (window.location.href = "/user/connections")}
              >
                Bağlantı yönetimine git
              </AuroraButton>
            </div>
          </div>
        </div>
        <aside className="aurora-inspector-slot">
          <AuroraInspector title="YT" />
        </aside>
      </div>
    );
  }

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>YouTube analitik</h1>
            <div className="sub">
              {activeConn?.external_account_name ?? "—"} · son {windowDays} gün
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <select
              value={activeConnId ?? ""}
              onChange={(e) => setConnId(e.target.value || null)}
              style={{
                padding: "6px 10px",
                border: "1px solid var(--border-default)",
                borderRadius: 7,
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontFamily: "inherit",
                fontSize: 12,
              }}
            >
              {ytConnections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.external_account_name ?? c.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <div className="tog">
              {WINDOWS.map((w) => (
                <button
                  key={w.value}
                  className={windowDays === w.value ? "on" : ""}
                  onClick={() => setWindowDays(w.value)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid g-4" style={{ marginBottom: 18 }}>
          {[
            ["Görüntülenme", totals ? fmtNum(totals.totals.views) : "—", viewSeries, "var(--accent-primary)"],
            [
              "Net abone",
              totals ? (totals.totals.subscribers_net >= 0 ? "+" : "") + fmtNum(totals.totals.subscribers_net) : "—",
              subSeries,
              "var(--accent-secondary)",
            ],
            [
              "İzlenme süresi",
              totals ? fmtSeconds(totals.averages.average_view_duration_seconds) : "—",
              watchSeries,
              "var(--accent-tertiary)",
            ],
            ["Beğeni", totals ? fmtNum(totals.totals.likes) : "—", viewSeries, "var(--text-muted)"],
          ].map(([k, v, series, color]) => (
            <div key={k as string} className="metric">
              <div className="accent" />
              <div className="lbl">{k}</div>
              <span className="val">{v}</span>
              <div style={{ marginTop: 8, height: 32 }}>
                <AuroraSpark data={series as number[]} color={color as string} />
              </div>
            </div>
          ))}
        </div>

        <div className="card card-pad" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Günlük görüntülenme trendi</div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              marginBottom: 14,
            }}
          >
            {daily.length} gün
          </div>
          <div style={{ height: 120 }}>
            <AuroraSpark data={viewSeries} color="var(--accent-primary)" />
          </div>
        </div>

        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>En iyi 5 video</div>
          {topVideosQ.isLoading ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Yükleniyor…</div>
          ) : (topVideosQ.data?.videos ?? []).length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Veri yok.</div>
          ) : (
            (topVideosQ.data?.videos ?? []).map((v, i, arr) => (
              <div
                key={v.platform_video_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 0",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text-muted)",
                    minWidth: 16,
                    textAlign: "right",
                  }}
                >
                  {i + 1}
                </span>
                <a
                  href={`https://www.youtube.com/watch?v=${v.platform_video_id}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    fontWeight: 500,
                    color: "var(--accent-primary-hover)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                  }}
                >
                  {v.platform_video_id}
                </a>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, minWidth: 60, textAlign: "right" }}>
                  {fmtNum(v.views)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--state-success-fg)",
                    minWidth: 50,
                    textAlign: "right",
                  }}
                >
                  {fmtPct(v.average_view_percentage)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--text-muted)",
                    minWidth: 50,
                    textAlign: "right",
                  }}
                >
                  {fmtSeconds(v.average_view_duration_seconds)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
