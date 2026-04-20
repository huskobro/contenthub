/**
 * Aurora Analytics Operations — admin.analytics.operations override.
 *
 * Aurora Dusk Cockpit port of legacy AnalyticsOperationsPage. Live data via
 * useAnalyticsOperations + useAnalyticsOverview + useSourceImpact. KPI strip
 * (job runtime), operations table (provider/step) and right inspector
 * (provider distribution, slowest step) keep parity with legacy figures.
 */
import { useMemo, useState } from "react";
import { useAnalyticsOperations } from "../../hooks/useAnalyticsOperations";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { useSourceImpact } from "../../hooks/useSourceImpact";
import type {
  AnalyticsWindow,
  ProviderStat,
  StepStat,
} from "../../api/analyticsApi";
import {
  AuroraPageShell,
  AuroraInspector,
  AuroraInspectorSection,
  AuroraInspectorRow,
  AuroraMeterTile,
  AuroraTable,
  AuroraStatusChip,
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
  if (v < 60) return `${v.toFixed(1)}s`;
  return `${(v / 60).toFixed(1)}dk`;
}

function fmtMs(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v / 1000).toFixed(2)}s`;
}

// --- range toggle ----------------------------------------------------------

type Range = "7g" | "30g" | "3a" | "Tüm";
const RANGE_TO_WINDOW: Record<Range, AnalyticsWindow> = {
  "7g": "last_7d",
  "30g": "last_30d",
  "3a": "last_90d",
  "Tüm": "all_time",
};

export function AuroraAnalyticsOperationsPage() {
  const [range, setRange] = useState<Range>("30g");
  const window = RANGE_TO_WINDOW[range];

  const { data: opsData, isLoading: opsLoading, isError } =
    useAnalyticsOperations(window);
  const { data: overview, isLoading: overviewLoading } =
    useAnalyticsOverview(window);
  const { data: sourceData, isLoading: sourceLoading } =
    useSourceImpact(window);

  const providerStats: ProviderStat[] = opsData?.provider_stats ?? [];
  const stepStats: StepStat[] = opsData?.step_stats ?? [];

  const sortedSteps = useMemo(
    () => [...stepStats].sort((a, b) => b.count - a.count),
    [stepStats],
  );

  const slowestStep = useMemo(() => {
    return [...stepStats]
      .filter((s) => s.avg_elapsed_seconds != null)
      .sort(
        (a, b) =>
          (b.avg_elapsed_seconds ?? 0) - (a.avg_elapsed_seconds ?? 0),
      )[0];
  }, [stepStats]);

  const totalProviderCalls = providerStats.reduce(
    (s, p) => s + p.total_calls,
    0,
  );

  const topProviders = useMemo(
    () =>
      [...providerStats]
        .sort((a, b) => b.total_calls - a.total_calls)
        .slice(0, 6),
    [providerStats],
  );

  const providerCallsTotal = topProviders.reduce(
    (s, p) => s + p.total_calls,
    0,
  ) || 1;

  // --- columns -------------------------------------------------------------

  const providerColumns = [
    {
      key: "provider_name",
      header: "Provider",
      mono: true,
      render: (p: ProviderStat) => p.provider_name,
    },
    {
      key: "provider_kind",
      header: "Tür",
      render: (p: ProviderStat) => (
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {p.provider_kind}
        </span>
      ),
    },
    {
      key: "total_calls",
      header: "Çağrı",
      align: "right" as const,
      mono: true,
      render: (p: ProviderStat) => fmtCount(p.total_calls),
    },
    {
      key: "failed_calls",
      header: "Başarısız",
      align: "right" as const,
      mono: true,
      render: (p: ProviderStat) => (
        <span
          style={{
            color:
              p.failed_calls > 0
                ? "var(--state-danger-fg)"
                : "var(--text-muted)",
          }}
        >
          {fmtCount(p.failed_calls)}
        </span>
      ),
    },
    {
      key: "error_rate",
      header: "Hata",
      align: "right" as const,
      mono: true,
      render: (p: ProviderStat) => fmtRate(p.error_rate),
    },
    {
      key: "avg_latency",
      header: "Gecikme",
      align: "right" as const,
      mono: true,
      render: (p: ProviderStat) => fmtMs(p.avg_latency_ms),
    },
  ];

  const stepColumns = [
    {
      key: "step_key",
      header: "Adım",
      mono: true,
      render: (s: StepStat) => s.step_key,
    },
    {
      key: "count",
      header: "Çalışma",
      align: "right" as const,
      mono: true,
      render: (s: StepStat) => fmtCount(s.count),
    },
    {
      key: "avg_elapsed_seconds",
      header: "Ort. süre",
      align: "right" as const,
      mono: true,
      render: (s: StepStat) => fmtSeconds(s.avg_elapsed_seconds),
    },
    {
      key: "failed_count",
      header: "Başarısız",
      align: "right" as const,
      mono: true,
      render: (s: StepStat) => (
        <span
          style={{
            color:
              s.failed_count > 0
                ? "var(--state-danger-fg)"
                : "var(--text-muted)",
          }}
        >
          {fmtCount(s.failed_count)}
        </span>
      ),
    },
  ];

  const inspector = (
    <AuroraInspector title="Operasyon">
      <AuroraInspectorSection title="İş özeti">
        <AuroraInspectorRow
          label="toplam iş"
          value={fmtCount(overview?.total_job_count)}
        />
        <AuroraInspectorRow
          label="tamamlanan"
          value={fmtCount(overview?.completed_job_count)}
        />
        <AuroraInspectorRow
          label="başarısız"
          value={fmtCount(overview?.failed_job_count)}
        />
        <AuroraInspectorRow
          label="başarı oranı"
          value={fmtRate(overview?.job_success_rate)}
        />
        <AuroraInspectorRow
          label="retry oranı"
          value={fmtRate(overview?.retry_rate)}
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Provider dağılımı">
        {topProviders.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Henüz veri yok.
          </div>
        )}
        {topProviders.map((p) => {
          const pct = Math.round((p.total_calls / providerCallsTotal) * 100);
          return (
            <div key={p.provider_name} style={{ marginBottom: 8 }}>
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
                  {p.provider_name}
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

      <AuroraInspectorSection title="En yavaş adım">
        {slowestStep ? (
          <>
            <AuroraInspectorRow
              label="adım"
              value={slowestStep.step_key}
            />
            <AuroraInspectorRow
              label="ort. süre"
              value={fmtSeconds(slowestStep.avg_elapsed_seconds)}
            />
            <AuroraInspectorRow
              label="çalışma"
              value={fmtCount(slowestStep.count)}
            />
            <AuroraInspectorRow
              label="başarısız"
              value={fmtCount(slowestStep.failed_count)}
            />
          </>
        ) : (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {opsLoading ? "Yükleniyor…" : "Adım verisi yok."}
          </div>
        )}
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Kaynak">
        <AuroraInspectorRow
          label="toplam kaynak"
          value={fmtCount(sourceData?.total_sources)}
        />
        <AuroraInspectorRow
          label="aktif kaynak"
          value={fmtCount(sourceData?.active_sources)}
        />
        <AuroraInspectorRow
          label="kullanılan haber"
          value={fmtCount(sourceData?.used_news_count)}
        />
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-analytics" data-testid="aurora-analytics-operations">
      <AuroraPageShell
        title="Operasyon Metrikleri"
        breadcrumbs={[
          { label: "Analytics", href: "/admin/analytics" },
          { label: "Operasyon" },
        ]}
        description={`İş başarı · retry · provider sağlığı · adım analizi · pencere ${range}`}
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
            Operasyon metrikleri yüklenemedi.
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
            label="Toplam iş"
            value={fmtCount(overview?.total_job_count)}
            footer={`tamamlanan ${fmtCount(overview?.completed_job_count)}`}
            loading={overviewLoading}
            data-testid="aurora-ops-kpi-total"
          />
          <AuroraMeterTile
            label="Başarı oranı"
            value={fmtRate(overview?.job_success_rate)}
            footer={
              overview
                ? `başarısız ${fmtCount(overview.failed_job_count)}`
                : "—"
            }
            tone={
              (overview?.job_success_rate ?? 0) >= 0.8 ? "success" : "default"
            }
            loading={overviewLoading}
            data-testid="aurora-ops-kpi-success"
          />
          <AuroraMeterTile
            label="Ort. render süresi"
            value={fmtSeconds(opsData?.avg_render_duration_seconds)}
            footer={`ort. üretim ${fmtSeconds(
              overview?.avg_production_duration_seconds,
            )}`}
            loading={opsLoading}
            data-testid="aurora-ops-kpi-render"
          />
          <AuroraMeterTile
            label="Retry oranı"
            value={fmtRate(overview?.retry_rate)}
            footer={`provider hatası ${fmtRate(opsData?.provider_error_rate)}`}
            tone={(overview?.retry_rate ?? 0) > 0.2 ? "warning" : "default"}
            loading={overviewLoading || opsLoading}
            data-testid="aurora-ops-kpi-retry"
          />
        </div>

        {/* Provider table */}
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
              Provider sağlığı
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
              }}
            >
              {providerStats.length} provider · {fmtCount(totalProviderCalls)}{" "}
              çağrı
            </div>
          </div>
          <AuroraTable<ProviderStat>
            columns={providerColumns}
            rows={providerStats}
            rowKey={(p) => p.provider_name}
            loading={opsLoading}
            empty={
              <span className="caption">
                Seçilen pencerede provider trace verisi yok.
              </span>
            }
            data-testid="aurora-ops-provider-table"
          />
        </div>

        {/* Step table */}
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
              Adım istatistikleri
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
              }}
            >
              {sortedSteps.length} adım
            </div>
          </div>
          <AuroraTable<StepStat>
            columns={stepColumns}
            rows={sortedSteps}
            rowKey={(s) => s.step_key}
            loading={opsLoading}
            empty={
              <span className="caption">Seçilen pencerede adım verisi yok.</span>
            }
            data-testid="aurora-ops-step-table"
          />
        </div>

        {/* Source impact mini section */}
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
            <div style={{ fontSize: 12, fontWeight: 600 }}>Kaynak etkisi</div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
              }}
            >
              sistem geneli
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            <AuroraMeterTile
              label="Toplam kaynak"
              value={fmtCount(sourceData?.total_sources ?? null)}
              footer={`aktif ${fmtCount(sourceData?.active_sources ?? null)}`}
              loading={sourceLoading}
            />
            <AuroraMeterTile
              label="Toplam tarama"
              value={fmtCount(sourceData?.total_scans ?? null)}
              footer={`başarılı ${fmtCount(
                sourceData?.successful_scans ?? null,
              )}`}
              loading={sourceLoading}
            />
            <AuroraMeterTile
              label="Toplam haber"
              value={fmtCount(sourceData?.total_news_items ?? null)}
              footer={`kullanılan ${fmtCount(
                sourceData?.used_news_count ?? null,
              )}`}
              loading={sourceLoading}
            />
            <AuroraMeterTile
              label="Bülten sayısı"
              value={fmtCount(sourceData?.bulletin_count ?? null)}
              footer="oluşturulan haber bültenleri"
              loading={sourceLoading}
            />
          </div>
        </div>
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
