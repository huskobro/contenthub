/**
 * AuroraChannelPerformancePage — admin.analytics.channels override.
 *
 * Aurora Dusk Cockpit port of AdminChannelPerformancePage.
 * Layout:
 *  - Sol/üst: Breadcrumb (Analytics → Channels), KPI strip ve kanal listesi
 *    tablosu (isim, abone yerine job_count, görüntülenme yerine completed,
 *    son video yerine durum, performans skoru).
 *  - Sağ: AuroraInspector (toplam kanal, en performanslı, en az aktif).
 *
 * Veri: useChannelPerformance hook'u (gerçek backend agregeleri).
 * KPI'lar production + publish + engagement metrikleri özetler.
 */
import { useMemo, useState } from "react";
import { useChannelPerformance } from "../../hooks/useChannelPerformance";
import {
  AuroraPageShell,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraButton,
  AuroraStatusChip,
  AuroraCard,
  AuroraTable,
  AuroraMeterTile,
  AuroraSpark,
  type AuroraColumn,
  type AuroraStatusTone,
} from "./primitives";
import type { AnalyticsWindow, ChannelRanking } from "../../api/analyticsApi";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WINDOWS: { value: AnalyticsWindow; label: string }[] = [
  { value: "last_7d", label: "7g" },
  { value: "last_30d", label: "30g" },
  { value: "last_90d", label: "3a" },
  { value: "all_time", label: "tümü" },
];

function fmtCount(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function fmtPct(p: number | null | undefined): string {
  if (p == null) return "—";
  // Backend bazen 0..1 bazen 0..100 dönebilir; channel-performance success_rate 0..100.
  return `${p.toFixed(1)}%`;
}

function fmtRate01(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function fmtSeconds(s: number | null | undefined): string {
  if (s == null) return "—";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const ss = String(Math.round(s % 60)).padStart(2, "0");
  return `${m}:${ss}`;
}

function statusTone(status: string): AuroraStatusTone {
  if (status === "active" || status === "connected") return "success";
  if (status === "pending" || status === "queued") return "warning";
  if (status === "error" || status === "failed" || status === "disconnected") return "danger";
  return "neutral";
}

function performanceTone(score: number | null): AuroraStatusTone {
  if (score == null) return "neutral";
  if (score >= 80) return "success";
  if (score >= 50) return "info";
  if (score >= 25) return "warning";
  return "danger";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuroraChannelPerformancePage() {
  const [windowVal, setWindowVal] = useState<AnalyticsWindow>("last_30d");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const { data, isLoading, isError } = useChannelPerformance({ window: windowVal });

  const rankings: ChannelRanking[] = data?.channel_rankings ?? [];
  const trend = useMemo(() => {
    const dt = data?.daily_trend ?? [];
    return dt.length > 0 ? dt.map((d) => d.job_count) : [];
  }, [data?.daily_trend]);

  const topChannel = useMemo(() => {
    if (rankings.length === 0) return null;
    return [...rankings].sort((a, b) => (b.success_rate ?? 0) - (a.success_rate ?? 0))[0];
  }, [rankings]);

  const leastActive = useMemo(() => {
    if (rankings.length === 0) return null;
    return [...rankings].sort((a, b) => a.job_count - b.job_count)[0];
  }, [rankings]);

  const columns: AuroraColumn<ChannelRanking>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Kanal",
        render: (r) => (
          <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
            {r.profile_name || r.channel_slug || r.channel_id.slice(0, 8)}
          </span>
        ),
      },
      {
        key: "job_count",
        header: "İş",
        align: "right",
        mono: true,
        render: (r) => fmtCount(r.job_count),
      },
      {
        key: "completed",
        header: "Tamam",
        align: "right",
        mono: true,
        render: (r) => fmtCount(r.completed_count),
      },
      {
        key: "failed",
        header: "Hata",
        align: "right",
        mono: true,
        render: (r) => (
          <span style={{ color: r.failed_count > 0 ? "var(--state-danger-fg)" : "var(--text-muted)" }}>
            {fmtCount(r.failed_count)}
          </span>
        ),
      },
      {
        key: "score",
        header: "Performans",
        align: "right",
        render: (r) => (
          <AuroraStatusChip tone={performanceTone(r.success_rate)}>
            {fmtPct(r.success_rate)}
          </AuroraStatusChip>
        ),
      },
      {
        key: "status",
        header: "Durum",
        align: "right",
        render: (r) => (
          <AuroraStatusChip tone={statusTone(r.status)}>{r.status}</AuroraStatusChip>
        ),
      },
    ],
    [],
  );

  const inspector = (
    <AuroraInspector title="Kanal özeti">
      <AuroraInspectorSection title="Genel">
        <AuroraInspectorRow label="toplam kanal" value={String(rankings.length)} />
        <AuroraInspectorRow
          label="aktif bağlantı"
          value={`${data?.connected_connections ?? 0}/${data?.total_connections ?? 0}`}
        />
        <AuroraInspectorRow label="toplam iş" value={fmtCount(data?.total_jobs)} />
        <AuroraInspectorRow label="tamamlanan" value={fmtCount(data?.completed_jobs)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="En performanslı">
        {topChannel ? (
          <>
            <AuroraInspectorRow
              label="kanal"
              value={topChannel.profile_name || topChannel.channel_slug}
            />
            <AuroraInspectorRow label="başarı" value={fmtPct(topChannel.success_rate)} />
            <AuroraInspectorRow label="iş" value={String(topChannel.job_count)} />
          </>
        ) : (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Veri yok.</div>
        )}
      </AuroraInspectorSection>
      <AuroraInspectorSection title="En az aktif">
        {leastActive ? (
          <>
            <AuroraInspectorRow
              label="kanal"
              value={leastActive.profile_name || leastActive.channel_slug}
            />
            <AuroraInspectorRow label="iş" value={String(leastActive.job_count)} />
            <AuroraInspectorRow label="başarı" value={fmtPct(leastActive.success_rate)} />
          </>
        ) : (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Veri yok.</div>
        )}
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  const windowSelector = (
    <div className="tog">
      {WINDOWS.map((w) => (
        <AuroraButton
          key={w.value}
          variant={windowVal === w.value ? "primary" : "ghost"}
          size="sm"
          onClick={() => setWindowVal(w.value)}
        >
          {w.label}
        </AuroraButton>
      ))}
    </div>
  );

  return (
    <div className="aurora-dashboard">
      <AuroraPageShell
        title="Kanal Performansı"
        breadcrumbs={[
          { label: "Analytics", href: "/admin/analytics" },
          { label: "Channels" },
        ]}
        description="Kanal bazlı üretim, yayın ve etkileşim performansı."
        actions={windowSelector}
        data-testid="aurora-admin-channel-performance"
      >
        {isError && (
          <AuroraCard pad="default">
            <span style={{ color: "var(--state-danger-fg)", fontSize: 12 }}>
              Veriler yüklenirken hata oluştu.
            </span>
          </AuroraCard>
        )}

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
            label="Toplam İş"
            value={fmtCount(data?.total_jobs)}
            delta={{
              value: data?.job_success_rate != null ? fmtRate01(data.job_success_rate) : "—",
              tone: "up",
            }}
            spark={trend.length >= 2 ? <AuroraSpark data={trend.slice(-12)} /> : undefined}
            loading={isLoading}
            data-testid="kpi-total-jobs"
          />
          <AuroraMeterTile
            label="Yayınlanan"
            value={fmtCount(data?.published_count)}
            delta={{
              value:
                data?.publish_success_rate != null
                  ? fmtRate01(data.publish_success_rate)
                  : "—",
              tone: "up",
            }}
            loading={isLoading}
            data-testid="kpi-published"
          />
          <AuroraMeterTile
            label="Yorum Yanıtı"
            value={`${fmtCount(data?.replied_comments)}/${fmtCount(data?.total_comments)}`}
            delta={{
              value: data?.reply_rate != null ? fmtRate01(data.reply_rate) : "—",
              tone: "flat",
            }}
            loading={isLoading}
            data-testid="kpi-reply"
          />
          <AuroraMeterTile
            label="Ort. Üretim"
            value={fmtSeconds(data?.avg_production_duration_seconds)}
            delta={{
              value: data?.retry_rate != null ? `retry ${fmtRate01(data.retry_rate)}` : "—",
              tone: "flat",
            }}
            loading={isLoading}
            data-testid="kpi-avg-duration"
          />
        </div>

        {/* Channel listesi */}
        <AuroraTable<ChannelRanking>
          columns={columns}
          rows={rankings}
          rowKey={(r) => r.channel_id}
          onRowClick={(r) => setSelectedChannelId(r.channel_id)}
          selectedKey={selectedChannelId}
          loading={isLoading}
          empty={<span className="caption">Bu pencerede kanal aktivitesi yok.</span>}
          data-testid="channel-rank-table"
        />
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
