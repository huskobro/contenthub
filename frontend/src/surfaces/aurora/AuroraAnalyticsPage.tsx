/**
 * Aurora Analytics — port of design/contenthub/pages/admin/analytics.html.
 * KPI strip + bar chart (günlük) + line chart (kümülatif) + top content table
 * + inspector. Uses live analytics overview hook; bar/line + top-content
 * are illustrative seeds keyed off real numbers where possible.
 *
 * Faz 6 P0-4 scope: structure-first port. Bar/top-content liste değerleri
 * gerçek kanal endpoint'lerine bağlanmadan önce demo seed üzerinden çalışır.
 */
import { useMemo, useState, type ReactNode } from "react";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { useDashboardSummary } from "../../hooks/useDashboardSummary";
import { useChannelOverview } from "../../hooks/useChannelOverview";
import {
  AuroraSpark,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraStatusChip,
} from "./primitives";

// --- helpers ---------------------------------------------------------------

function fmtCount(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
function fmtRate(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}
function fmtSeconds(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v < 60) return `${Math.round(v)}s`;
  const m = Math.floor(v / 60);
  const s = Math.round(v % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// --- helpers ---------------------------------------------------------------

const DAY_LABELS_TR = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function dayLabelFromIso(iso: string): string {
  try {
    const d = new Date(iso);
    return DAY_LABELS_TR[d.getDay()];
  } catch {
    return "—";
  }
}

// --- component -------------------------------------------------------------

type Range = "7g" | "30g" | "3a" | "Yıl";
const RANGE_TO_WINDOW: Record<Range, "last_7d" | "last_30d" | "last_90d" | "all_time"> = {
  "7g": "last_7d",
  "30g": "last_30d",
  "3a": "last_90d",
  "Yıl": "all_time",
};

export function AuroraAnalyticsPage() {
  const [range, setRange] = useState<Range>("7g");
  const window = RANGE_TO_WINDOW[range];
  const { data: overview } = useAnalyticsOverview(window);
  const { data: dashboard } = useDashboardSummary({ window });
  const { data: channelOverview } = useChannelOverview(window);
  const yt = channelOverview?.youtube;

  // Live daily trend (publish_count) — last 7 günü grafiklerde kullan
  const dailyTrend = dashboard?.daily_trend ?? [];
  const dailyPublish = dailyTrend.slice(-7).map((d) => ({
    label: dayLabelFromIso(d.date),
    value: d.publish_count,
  }));
  const weeklyJobSeries = dailyTrend.map((d) => d.job_count);
  const weeklyPublishSeries = dailyTrend.map((d) => d.publish_count);
  const sparkSeries =
    weeklyPublishSeries.length >= 2 ? weeklyPublishSeries : [0, 0];
  const dayMax = dailyPublish.length
    ? Math.max(...dailyPublish.map((d) => d.value), 1)
    : 1;

  // Modül dağılımı — top 5
  const topModules = (dashboard?.module_distribution ?? [])
    .slice()
    .sort((a, b) => b.total_jobs - a.total_jobs)
    .slice(0, 5);
  const moduleTotal = topModules.reduce((s, m) => s + m.total_jobs, 0) || 1;

  const kpis = useMemo(() => {
    return [
      {
        k: "Tamamlanan iş",
        v: fmtCount(overview?.completed_job_count),
        d: overview?.job_success_rate != null ? fmtRate(overview.job_success_rate) : "—",
        t: "pos" as const,
      },
      {
        k: "Yayınlanan",
        v: fmtCount(overview?.published_count),
        d: overview?.publish_success_rate != null ? fmtRate(overview.publish_success_rate) : "—",
        t: "pos" as const,
      },
      {
        k: "Ort. üretim süresi",
        v: fmtSeconds(overview?.avg_production_duration_seconds),
        d: overview?.retry_rate != null ? `retry ${fmtRate(overview.retry_rate)}` : "—",
        t: "neutral" as const,
      },
      {
        k: "Onay bekleyen",
        v: fmtCount(overview?.review_pending_count),
        d: overview?.publish_backlog_count != null ? `backlog ${overview.publish_backlog_count}` : "—",
        t: "neutral" as const,
      },
    ];
  }, [overview]);

  const inspector = (
    <AuroraInspector title="Özet">
      <AuroraInspectorSection title="Bu dönem">
        <AuroraInspectorRow
          label="toplam iş"
          value={fmtCount(overview?.total_job_count)}
        />
        <AuroraInspectorRow
          label="tamamlanan"
          value={fmtCount(overview?.completed_job_count)}
        />
        <AuroraInspectorRow
          label="başarısız iş"
          value={fmtCount(overview?.failed_job_count)}
        />
        <AuroraInspectorRow
          label="yayın bekleyen"
          value={fmtCount(overview?.publish_backlog_count)}
        />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Modül dağılımı">
        {topModules.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Henüz veri yok.
          </div>
        )}
        {topModules.map((m) => {
          const pct = Math.round((m.total_jobs / moduleTotal) * 100);
          return (
            <div key={m.module_type} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-muted)",
                  }}
                >
                  {m.module_type.replace(/_/g, " ")}
                </span>
                <span style={{ color: "var(--text-secondary)" }}>{pct}%</span>
              </div>
              <div className="trend-bar">
                <div className="fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-analytics">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Analitik</h1>
            <div className="sub">Tüm kanallar · {range}</div>
          </div>
          <div className="hstack">
            <div className="tog">
              {(["7g", "30g", "3a", "Yıl"] as Range[]).map((r) => (
                <button
                  key={r}
                  className={range === r ? "on" : ""}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Snapshot-lock disclaimer */}
        <div
          role="note"
          data-testid="aurora-snapshot-lock-disclaimer"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "8px 12px",
            marginBottom: 14,
            borderRadius: 8,
            background: "var(--state-info-bg, rgba(99,102,241,0.08))",
            border: "1px solid var(--state-info-border, rgba(99,102,241,0.3))",
            color: "var(--text-secondary)",
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          <span style={{ fontSize: 12 }}>🔒</span>
          <span>
            Aşağıdaki metrikler, her işin çalıştığı andaki snapshot-lock
            değerleri (ayarlar, şablonlar, prompt sürümleri) üzerinden
            hesaplanır. Admin panelindeki güncel yapılandırma ile birebir
            uyuşmayabilir.
          </span>
        </div>

        {/* KPI strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 18,
          }}
        >
          {kpis.map((k, i) => (
            <div
              key={i}
              style={{
                padding: "14px 16px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                }}
              >
                {k.k}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {k.v}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color:
                      k.t === "pos"
                        ? "var(--state-success-fg)"
                        : "var(--text-muted)",
                  }}
                >
                  {k.d}
                </span>
              </div>
              <div style={{ marginTop: 8, height: 32 }}>
                <AuroraSpark data={sparkSeries.slice(-8)} height={32} />
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div
            className="chart-card"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
            }}
          >
            <div className="chart-title">Günlük yayın</div>
            <div className="chart-sub">son 7 gün · publish_count</div>
            <div className="bar-chart">
              {dailyPublish.length === 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    padding: "20px 0",
                  }}
                >
                  Henüz veri yok.
                </div>
              )}
              {dailyPublish.map((d, i) => (
                <div key={i} className="bar-col">
                  <div className="val">{d.value}</div>
                  <div
                    className="bar"
                    style={{ height: `${(d.value / dayMax) * 100}%` }}
                  />
                  <div className="lbl">{d.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div
            className="chart-card"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
            }}
          >
            <div className="chart-title">İş hacmi</div>
            <div className="chart-sub">
              {weeklyJobSeries.length} gün · job_count
            </div>
            <div className="line-chart">
              {weeklyJobSeries.length >= 2 ? (
                <AuroraSpark data={weeklyJobSeries} height={120} />
              ) : (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    padding: "20px 0",
                  }}
                >
                  Henüz veri yok.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* YouTube kanal özeti — useChannelOverview */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              padding: "0 4px",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              YouTube kanal özeti
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
              }}
            >
              {channelOverview?.window ?? window} · publish snapshot
            </div>
          </div>
          <div
            style={{
              padding: "14px 16px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
            }}
          >
            <ChannelStat
              label="Yayın denemesi"
              value={fmtCount(yt?.total_publish_attempts)}
            />
            <ChannelStat
              label="Yayınlanan"
              value={fmtCount(yt?.published_count)}
              chip={
                yt?.has_publish_history ? (
                  <AuroraStatusChip tone="success">aktif</AuroraStatusChip>
                ) : (
                  <AuroraStatusChip tone="neutral">yok</AuroraStatusChip>
                )
              }
            />
            <ChannelStat
              label="Başarısız"
              value={fmtCount(yt?.failed_count)}
              chip={
                (yt?.failed_count ?? 0) > 0 ? (
                  <AuroraStatusChip tone="danger">dikkat</AuroraStatusChip>
                ) : null
              }
            />
            <ChannelStat
              label="Başarı oranı"
              value={fmtRate(yt?.publish_success_rate)}
            />
            <ChannelStat
              label="Taslak"
              value={fmtCount(yt?.draft_count)}
            />
            <ChannelStat
              label="Devam eden"
              value={fmtCount(yt?.in_progress_count)}
            />
            <ChannelStat
              label="Son yayın"
              value={
                yt?.last_published_at
                  ? new Date(yt.last_published_at).toLocaleString("tr-TR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"
              }
            />
            <ChannelStat
              label="Geçmiş"
              value={yt?.has_publish_history ? "Var" : "Yok"}
            />
          </div>
        </div>

        {/* Modül performansı — gerçek module_distribution verisi */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              padding: "0 4px",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Modül performansı
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
              }}
            >
              {topModules.length} modül · {moduleTotal} iş
            </div>
          </div>
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div className="table-row table-head">
              <span>Modül</span>
              <span>Toplam</span>
              <span>Tamamlanan</span>
              <span>Başarı</span>
              <span>Pay</span>
            </div>
            {topModules.length === 0 && (
              <div
                className="table-row"
                style={{ color: "var(--text-muted)", fontSize: 11 }}
              >
                <span>Henüz modül üretimi yok.</span>
                <span>—</span>
                <span>—</span>
                <span>—</span>
                <span>—</span>
              </div>
            )}
            {topModules.map((m) => {
              const pct = Math.round((m.total_jobs / moduleTotal) * 100);
              const success =
                m.total_jobs > 0
                  ? Math.round((m.completed_jobs / m.total_jobs) * 100)
                  : 0;
              return (
                <div key={m.module_type} className="table-row">
                  <span
                    style={{
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "var(--text-primary)",
                    }}
                  >
                    {m.module_type.replace(/_/g, " ")}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    {m.total_jobs}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    {m.completed_jobs}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color:
                        success >= 80
                          ? "var(--state-success-fg)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {success}%
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div className="trend-bar" style={{ flex: 1 }}>
                      <div className="fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        minWidth: 28,
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}

interface ChannelStatProps {
  label: string;
  value: string;
  chip?: ReactNode;
}

function ChannelStat({ label, value, chip }: ChannelStatProps) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {value}
        </span>
        {chip}
      </div>
    </div>
  );
}
