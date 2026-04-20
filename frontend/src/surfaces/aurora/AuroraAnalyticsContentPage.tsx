/**
 * Aurora Analytics Content — admin.analytics.content override.
 *
 * Aurora Dusk Cockpit port of legacy AnalyticsContentPage. Uses live
 * useContentMetrics + useTemplateImpact + useAnalyticsFilters; KPI strip,
 * content/module table and right inspector keep parity with legacy data.
 */
import { useMemo, useState } from "react";
import { useContentMetrics } from "../../hooks/useContentMetrics";
import { useTemplateImpact } from "../../hooks/useTemplateImpact";
import type { AnalyticsWindow, TemplateImpact } from "../../api/analyticsApi";
import {
  AuroraPageShell,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraMeterTile,
  AuroraTable,
  AuroraStatusChip,
  AuroraSpark,
} from "./primitives";

// --- helpers ---------------------------------------------------------------

function fmtCount(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

function fmtRate(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function fmtSeconds(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v < 60) return `${Math.round(v)}s`;
  if (v < 3600) return `${(v / 60).toFixed(1)}dk`;
  return `${(v / 3600).toFixed(1)}sa`;
}

// --- range toggle ----------------------------------------------------------

type Range = "7g" | "30g" | "3a" | "Tüm";
const RANGE_TO_WINDOW: Record<Range, AnalyticsWindow> = {
  "7g": "last_7d",
  "30g": "last_30d",
  "3a": "last_90d",
  "Tüm": "all_time",
};

interface ModuleRow {
  module_type: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  success_rate: number | null;
  avg_production_duration_seconds: number | null;
  avg_render_duration_seconds: number | null;
  retry_rate: number | null;
}

export function AuroraAnalyticsContentPage() {
  const [range, setRange] = useState<Range>("Tüm");
  const window = RANGE_TO_WINDOW[range];
  const { data, isLoading, isError } = useContentMetrics(window);
  const { data: tplData, isLoading: tplLoading } = useTemplateImpact(window);

  const modules = data?.module_distribution ?? [];
  const moduleTotal = modules.reduce((s, m) => s + m.total_jobs, 0) || 1;

  const topModules = useMemo(
    () =>
      [...modules]
        .sort((a, b) => b.total_jobs - a.total_jobs)
        .slice(0, 6),
    [modules],
  );

  const topTemplate = useMemo(() => {
    const stats = tplData?.template_stats ?? [];
    return [...stats]
      .filter((t) => t.total_jobs > 0)
      .sort((a, b) => (b.success_rate ?? 0) - (a.success_rate ?? 0))[0];
  }, [tplData]);

  const successRate =
    data && data.content_output_count > 0
      ? data.published_content_count / data.content_output_count
      : null;

  // Spark visualization seed — module count distribution
  const moduleSparkSeries =
    modules.length > 0 ? modules.map((m) => m.total_jobs) : [0, 0];

  const moduleColumns = [
    {
      key: "module_type",
      header: "Modül",
      render: (m: ModuleRow) => (
        <span style={{ fontWeight: 500 }}>
          {m.module_type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "total_jobs",
      header: "Toplam",
      align: "right" as const,
      mono: true,
      render: (m: ModuleRow) => fmtCount(m.total_jobs),
    },
    {
      key: "completed_jobs",
      header: "Tamamlanan",
      align: "right" as const,
      mono: true,
      render: (m: ModuleRow) => fmtCount(m.completed_jobs),
    },
    {
      key: "failed_jobs",
      header: "Başarısız",
      align: "right" as const,
      mono: true,
      render: (m: ModuleRow) => (
        <span
          style={{
            color:
              m.failed_jobs > 0
                ? "var(--state-danger-fg)"
                : "var(--text-muted)",
          }}
        >
          {fmtCount(m.failed_jobs)}
        </span>
      ),
    },
    {
      key: "success_rate",
      header: "Başarı",
      align: "right" as const,
      mono: true,
      render: (m: ModuleRow) => (
        <span
          style={{
            color:
              (m.success_rate ?? 0) >= 0.8
                ? "var(--state-success-fg)"
                : "var(--text-secondary)",
          }}
        >
          {fmtRate(m.success_rate)}
        </span>
      ),
    },
    {
      key: "avg_production_duration_seconds",
      header: "Ort. süre",
      align: "right" as const,
      mono: true,
      render: (m: ModuleRow) => fmtSeconds(m.avg_production_duration_seconds),
    },
    {
      key: "retry_rate",
      header: "Retry",
      align: "right" as const,
      mono: true,
      render: (m: ModuleRow) => fmtRate(m.retry_rate),
    },
  ];

  const inspector = (
    <AuroraInspector title="Özet">
      <AuroraInspectorSection title="Bu pencere">
        <AuroraInspectorRow
          label="toplam içerik"
          value={fmtCount(data?.content_output_count)}
        />
        <AuroraInspectorRow
          label="yayınlanan"
          value={fmtCount(data?.published_content_count)}
        />
        <AuroraInspectorRow label="başarı %" value={fmtRate(successRate)} />
        <AuroraInspectorRow
          label="ort. yayına kadar"
          value={fmtSeconds(data?.avg_time_to_publish_seconds)}
        />
        <AuroraInspectorRow
          label="aktif şablon"
          value={fmtCount(data?.active_template_count)}
        />
        <AuroraInspectorRow
          label="aktif blueprint"
          value={fmtCount(data?.active_blueprint_count)}
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

      <AuroraInspectorSection title="En performanslı şablon">
        {topTemplate ? (
          <>
            <AuroraInspectorRow
              label="şablon"
              value={
                topTemplate.template_name ??
                topTemplate.template_id ??
                "—"
              }
            />
            <AuroraInspectorRow
              label="toplam iş"
              value={fmtCount(topTemplate.total_jobs)}
            />
            <AuroraInspectorRow
              label="başarı"
              value={fmtRate(topTemplate.success_rate)}
            />
            <AuroraInspectorRow
              label="ort. süre"
              value={fmtSeconds(
                topTemplate.avg_production_duration_seconds,
              )}
            />
          </>
        ) : (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {tplLoading ? "Yükleniyor…" : "Şablon verisi yok."}
          </div>
        )}
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-analytics" data-testid="aurora-analytics-content">
      <AuroraPageShell
        title="İçerik Performansı"
        breadcrumbs={[
          { label: "Analytics", href: "/admin/analytics" },
          { label: "İçerik Performansı" },
        ]}
        description={`Modül dağılımı · üretim oranı · şablon etkisi · pencere ${range}`}
        actions={
          <div className="tog">
            {(["7g", "30g", "3a", "Tüm"] as Range[]).map((r) => (
              <button
                key={r}
                className={range === r ? "on" : ""}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        }
      >
        {isError && (
          <AuroraStatusChip tone="danger">
            İçerik metrikleri yüklenemedi.
          </AuroraStatusChip>
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
            label="Toplam içerik"
            value={fmtCount(data?.content_output_count)}
            footer={
              data
                ? `${data.content_type_breakdown.length} tip`
                : "—"
            }
            spark={
              <AuroraSpark
                data={moduleSparkSeries}
                color="var(--accent-primary)"
                height={28}
              />
            }
            loading={isLoading}
            data-testid="aurora-content-kpi-total"
          />
          <AuroraMeterTile
            label="Yayınlanan"
            value={fmtCount(data?.published_content_count)}
            footer={successRate != null ? `başarı ${fmtRate(successRate)}` : "—"}
            tone="success"
            loading={isLoading}
            data-testid="aurora-content-kpi-published"
          />
          <AuroraMeterTile
            label="Başarı oranı"
            value={fmtRate(successRate)}
            footer={
              data
                ? `${data.published_content_count}/${data.content_output_count}`
                : "—"
            }
            loading={isLoading}
            data-testid="aurora-content-kpi-success"
          />
          <AuroraMeterTile
            label="Ort. yayına kadar"
            value={fmtSeconds(data?.avg_time_to_publish_seconds)}
            footer={
              data ? `aktif blueprint ${data.active_blueprint_count}` : "—"
            }
            loading={isLoading}
            data-testid="aurora-content-kpi-avg"
          />
        </div>

        {/* Content type breakdown */}
        {data && data.content_type_breakdown.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 8,
                padding: "0 4px",
              }}
            >
              İçerik tipi kırılımı
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {data.content_type_breakdown.map((ct) => (
                <div
                  key={ct.type}
                  style={{
                    padding: "10px 16px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 10,
                    minWidth: 140,
                    textAlign: "center",
                  }}
                  data-testid={`aurora-content-type-${ct.type}`}
                >
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {ct.count}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 4,
                      textTransform: "lowercase",
                    }}
                  >
                    {ct.type.replace(/_/g, " ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Module performance table */}
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
              Modül performansı
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
              }}
            >
              {modules.length} modül · {moduleTotal} iş
            </div>
          </div>
          <AuroraTable<ModuleRow>
            columns={moduleColumns}
            rows={modules}
            rowKey={(m) => m.module_type}
            loading={isLoading}
            empty={
              <span className="caption">Henüz modül üretimi bulunmuyor.</span>
            }
            data-testid="aurora-content-module-table"
          />
        </div>

        {/* Template impact */}
        {tplData && tplData.template_stats.length > 0 && (
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
              <div style={{ fontSize: 12, fontWeight: 600 }}>Şablon etkisi</div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                }}
              >
                {tplData.template_stats.length} şablon
              </div>
            </div>
            <AuroraTable<TemplateImpact>
              columns={[
                {
                  key: "template_name",
                  header: "Şablon",
                  render: (t) => t.template_name ?? t.template_id ?? "—",
                },
                {
                  key: "total_jobs",
                  header: "Toplam",
                  align: "right" as const,
                  mono: true,
                  render: (t) => fmtCount(t.total_jobs),
                },
                {
                  key: "completed_jobs",
                  header: "Tamamlanan",
                  align: "right" as const,
                  mono: true,
                  render: (t) => fmtCount(t.completed_jobs),
                },
                {
                  key: "failed_jobs",
                  header: "Başarısız",
                  align: "right" as const,
                  mono: true,
                  render: (t) => fmtCount(t.failed_jobs),
                },
                {
                  key: "success_rate",
                  header: "Başarı",
                  align: "right" as const,
                  mono: true,
                  render: (t) => fmtRate(t.success_rate),
                },
                {
                  key: "avg_production_duration_seconds",
                  header: "Ort. süre",
                  align: "right" as const,
                  mono: true,
                  render: (t) =>
                    fmtSeconds(t.avg_production_duration_seconds),
                },
              ]}
              rows={tplData.template_stats}
              rowKey={(t) => t.template_id ?? t.template_name ?? "?"}
              loading={tplLoading}
              empty={
                <span className="caption">Şablon bazlı veri bulunmuyor.</span>
              }
              data-testid="aurora-content-template-table"
            />
          </div>
        )}
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
