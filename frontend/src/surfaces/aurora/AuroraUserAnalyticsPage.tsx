/**
 * Aurora User Analytics — user.analytics.overview override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/analytics.html
 * Veri: useDashboardSummary + useChannelPerformance (gerçek backend agregeleri).
 * Hardcoded grafik/sayı yok — tüm KPI ve sıralamalar API yanıtından gelir.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardSummary,
  fetchChannelPerformance,
  type AnalyticsWindow,
} from "../../api/analyticsApi";
import { useAuthStore } from "../../stores/authStore";
import {
  AuroraSpark,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
} from "./primitives";

const WINDOWS: { value: AnalyticsWindow; label: string }[] = [
  { value: "last_7d", label: "7g" },
  { value: "last_30d", label: "30g" },
  { value: "last_90d", label: "3a" },
  { value: "all_time", label: "tümü" },
];

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

export function AuroraUserAnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const [windowVal, setWindowVal] = useState<AnalyticsWindow>("last_7d");

  const dashQ = useQuery({
    queryKey: ["analytics", "dashboard", windowVal, user?.id],
    queryFn: () => fetchDashboardSummary({ window: windowVal, user_id: user?.id }),
    refetchInterval: 60_000,
    enabled: !!user,
  });

  const chanQ = useQuery({
    queryKey: ["analytics", "channel-perf", windowVal, user?.id],
    queryFn: () => fetchChannelPerformance({ window: windowVal, user_id: user?.id }),
    enabled: !!user,
  });

  const summary = dashQ.data;
  const chan = chanQ.data;

  const dailyTrend = summary?.daily_trend ?? [];
  const trendSeries = useMemo(
    () => (dailyTrend.length > 0 ? dailyTrend.map((d) => d.job_count) : new Array(12).fill(0)),
    [dailyTrend],
  );
  const publishTrend = useMemo(
    () => (dailyTrend.length > 0 ? dailyTrend.map((d) => d.publish_count) : new Array(12).fill(0)),
    [dailyTrend],
  );

  const channelRankings = chan?.channel_rankings ?? [];
  const maxJob = Math.max(1, ...channelRankings.map((c) => c.job_count));

  const inspector = (
    <AuroraInspector title="Bu pencere">
      <AuroraInspectorSection title="Performans">
        <AuroraInspectorRow label="toplam iş" value={String(summary?.total_jobs ?? 0)} />
        <AuroraInspectorRow label="aktif" value={String(summary?.active_jobs ?? 0)} />
        <AuroraInspectorRow label="başarı %" value={fmtPct(summary?.publish_success_rate ?? null)} />
        <AuroraInspectorRow label="ort. üretim" value={fmtSeconds(summary?.avg_production_duration_seconds ?? null)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Yayın">
        <AuroraInspectorRow label="toplam yayın" value={String(summary?.total_publish ?? 0)} />
        <AuroraInspectorRow label="kuyruk" value={String(summary?.queue_size ?? 0)} />
        <AuroraInspectorRow label="hatalı iş" value={String(summary?.failed_job_count ?? 0)} />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Analitik</h1>
            <div className="sub">
              Tüm kanallar · pencere {WINDOWS.find((w) => w.value === windowVal)?.label}
            </div>
          </div>
          <div className="tog">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                className={windowVal === w.value ? "on" : ""}
                onClick={() => setWindowVal(w.value)}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid g-4" style={{ marginBottom: 18 }}>
          {[
            ["Toplam iş", String(summary?.total_jobs ?? 0), trendSeries, "var(--accent-primary)"],
            ["Yayın", String(summary?.total_publish ?? 0), publishTrend, "var(--accent-secondary)"],
            ["Başarı oranı", fmtPct(summary?.publish_success_rate ?? null), trendSeries, "var(--accent-tertiary)"],
            ["Ort. süre", fmtSeconds(summary?.avg_production_duration_seconds ?? null), trendSeries, "var(--text-muted)"],
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

        <div className="grid g-2" style={{ marginBottom: 18 }}>
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Kanal karşılaştırması</div>
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
              {WINDOWS.find((w) => w.value === windowVal)?.label} penceresi
            </div>
            {channelRankings.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {chanQ.isLoading ? "Yükleniyor…" : "Veri yok."}
              </div>
            )}
            {channelRankings.slice(0, 6).map((ch) => {
              const pct = Math.round((ch.job_count / maxJob) * 100);
              return (
                <div key={ch.channel_id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                      {ch.profile_name ?? ch.channel_slug ?? ch.channel_id.slice(0, 8)}
                    </span>
                    <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {ch.job_count} iş · {fmtPct(ch.success_rate)}
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "var(--bg-inset)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "var(--gradient-brand)",
                        borderRadius: 2,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Günlük üretim eğilimi</div>
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
              {dailyTrend.length} gün
            </div>
            <div style={{ height: 120 }}>
              <AuroraSpark data={trendSeries} color="var(--accent-primary)" />
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-head">
            <div className="title">Modül dağılımı</div>
          </div>
          <div className="card">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 80px 80px 80px",
                gap: 10,
                padding: "10px 14px",
                background: "var(--bg-inset)",
                borderBottom: "1px solid var(--border-default)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              <span>Modül</span>
              <span>İş</span>
              <span>Tamam</span>
              <span>Başarı</span>
              <span>Süre</span>
            </div>
            {(summary?.module_distribution ?? []).length === 0 ? (
              <div style={{ padding: 18, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                {dashQ.isLoading ? "Yükleniyor…" : "Veri yok."}
              </div>
            ) : (
              summary!.module_distribution.map((m, i, arr) => (
                <div
                  key={m.module_type}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 80px 80px 80px",
                    gap: 10,
                    padding: "11px 14px",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    fontSize: 12,
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{m.module_type}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{m.total_jobs}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{m.completed_jobs}</span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: (m.success_rate ?? 0) >= 80 ? "var(--state-success-fg)" : "var(--text-muted)",
                    }}
                  >
                    {fmtPct(m.success_rate)}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    {fmtSeconds(m.avg_production_duration_seconds)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
