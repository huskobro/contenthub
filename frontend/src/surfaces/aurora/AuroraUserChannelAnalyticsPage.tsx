/**
 * Aurora User Channel Analytics — user.analytics.channels override.
 *
 * Tasarım: ContentHub_Design _System/contenthub/pages/user/channel-analytics.html
 * Veri: fetchChannelPerformance + useMyChannelProfiles (gerçek backend kanal
 * agregeleri). Sayfa, kullanıcının tüm kanallarını sıralayıp en iyi kanalı seçer
 * ya da kullanıcı manuel seçim yapabilir.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchChannelPerformance,
  type AnalyticsWindow,
} from "../../api/analyticsApi";
import { useMyChannelProfiles } from "../../hooks/useMyChannelProfiles";
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

export function AuroraUserChannelAnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const channelsQ = useMyChannelProfiles();
  const channels = channelsQ.data ?? [];
  const [windowVal, setWindowVal] = useState<AnalyticsWindow>("last_30d");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const chanQ = useQuery({
    queryKey: ["analytics", "channel-perf", windowVal, user?.id],
    queryFn: () => fetchChannelPerformance({ window: windowVal, user_id: user?.id }),
    enabled: !!user,
  });

  const rankings = chanQ.data?.channel_rankings ?? [];
  const activeId = selectedId ?? rankings[0]?.channel_id ?? channels[0]?.id ?? null;
  const active = rankings.find((r) => r.channel_id === activeId);
  const channelMeta = channels.find((c) => c.id === activeId) ?? null;

  const trend = useMemo(() => {
    const dt = chanQ.data?.daily_trend ?? [];
    return dt.length > 0 ? dt.map((d) => d.job_count) : new Array(12).fill(0);
  }, [chanQ.data]);

  const aggregateAvgDuration = chanQ.data?.avg_production_duration_seconds ?? null;

  const inspector = (
    <AuroraInspector title={channelMeta?.handle ?? channelMeta?.profile_name ?? "Kanal"}>
      <AuroraInspectorSection title="Performans">
        <AuroraInspectorRow label="iş" value={String(active?.job_count ?? 0)} />
        <AuroraInspectorRow label="tamam" value={String(active?.completed_count ?? 0)} />
        <AuroraInspectorRow label="başarı" value={fmtPct(active?.success_rate ?? null)} />
        <AuroraInspectorRow label="ort. üretim" value={fmtSeconds(aggregateAvgDuration)} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Tüm kanallar">
        <AuroraInspectorRow label="kanal" value={String(channels.length)} />
        <AuroraInspectorRow label="aktif" value={String(rankings.length)} />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Kanal analitik</h1>
            <div className="sub">
              {channelMeta?.handle ?? channelMeta?.profile_name ?? "kanal seç"} · {WINDOWS.find((w) => w.value === windowVal)?.label}
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <select
              value={activeId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
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
              <option value="">— kanal —</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.handle ?? c.profile_name}
                </option>
              ))}
            </select>
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
        </div>

        <div className="grid g-4" style={{ marginBottom: 18 }}>
          {[
            ["İş", String(active?.job_count ?? 0), trend, "var(--accent-primary)"],
            ["Tamam", String(active?.completed_count ?? 0), trend, "var(--accent-secondary)"],
            ["Başarı", fmtPct(active?.success_rate ?? null), trend, "var(--accent-tertiary)"],
            ["Ort. süre", fmtSeconds(aggregateAvgDuration), trend, "var(--text-muted)"],
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

        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Kanal sıralaması (en iyi 5)</div>
          {chanQ.isLoading ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Yükleniyor…</div>
          ) : rankings.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Veri yok.</div>
          ) : (
            rankings.slice(0, 5).map((r, i) => (
              <div
                key={r.channel_id}
                onClick={() => setSelectedId(r.channel_id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: i < 4 ? "1px solid var(--border-subtle)" : "none",
                  fontSize: 12,
                  cursor: "pointer",
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
                <span
                  style={{
                    flex: 1,
                    fontWeight: r.channel_id === activeId ? 600 : 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: r.channel_id === activeId ? "var(--accent-primary-hover)" : "var(--text-primary)",
                  }}
                >
                  {r.profile_name ?? r.channel_slug ?? r.channel_id.slice(0, 8)}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, minWidth: 60, textAlign: "right" }}>
                  {r.job_count} iş
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: (r.success_rate ?? 0) >= 80 ? "var(--state-success-fg)" : "var(--text-muted)",
                    minWidth: 48,
                    textAlign: "right",
                  }}
                >
                  {fmtPct(r.success_rate)}
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
                  {r.completed_count}/{r.failed_count}
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
