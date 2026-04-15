import { Link } from "react-router-dom";
import { useAnalyticsOperations } from "../../hooks/useAnalyticsOperations";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { useSourceImpact } from "../../hooks/useSourceImpact";
import { usePromptAssemblyMetrics } from "../../hooks/usePromptAssemblyMetrics";
import { useAnalyticsFilters } from "../../hooks/useAnalyticsFilters";
import type { AnalyticsWindow, StepStat, ProviderStat, SourceStat, AssemblyModuleStat, AssemblyProviderStat } from "../../api/analyticsApi";
import { cn } from "../../lib/cn";
import {
  PageShell,
  SectionShell,
  MetricTile,
  MetricGrid,
  DataTable,
  Mono,
  StatusBadge,
} from "../../components/design-system/primitives";
import { AdminAnalyticsFilterBar } from "../../components/analytics/AdminAnalyticsFilterBar";
import { ProviderLatencyChart } from "../../components/analytics/ProviderLatencyChart";
import { StepDurationChart } from "../../components/analytics/StepDurationChart";
import { SystemScopeNote } from "../../components/analytics/SystemScopeNote";
import { ExportButton } from "../../components/analytics/ExportButton";

/* ------------------------------------------------------------------ */
/* Formatters                                                         */
/* ------------------------------------------------------------------ */

function fmtRate(v: number | null | undefined): string {
  if (v == null) return "\u2014";
  return `${(v * 100).toFixed(1)}%`;
}

function fmtSeconds(v: number | null | undefined): string {
  if (v == null) return "\u2014";
  if (v < 60) return `${v.toFixed(1)}s`;
  return `${(v / 60).toFixed(1)}dk`;
}

function fmtCount(v: number | null | undefined): string {
  if (v == null) return "\u2014";
  return String(v);
}

function fmtCost(p: ProviderStat): { text: string; badge: string; badgeStatus: string } {
  if (p.total_estimated_cost_usd != null && p.total_estimated_cost_usd > 0) {
    const hasTokens = (p.total_input_tokens ?? 0) > 0 || (p.total_output_tokens ?? 0) > 0;
    return {
      text: `$${p.total_estimated_cost_usd.toFixed(4)}`,
      badge: hasTokens ? "actual" : "estimated",
      badgeStatus: hasTokens ? "success" : "warning",
    };
  }
  return { text: "\u2014", badge: "unsupported", badgeStatus: "neutral" };
}

/* ------------------------------------------------------------------ */
/* Column definitions                                                 */
/* ------------------------------------------------------------------ */

const providerColumns = [
  {
    key: "provider_name",
    header: "Provider",
    render: (p: ProviderStat) => <Mono>{p.provider_name}</Mono>,
  },
  {
    key: "provider_kind",
    header: "Tur",
    render: (p: ProviderStat) => p.provider_kind,
  },
  {
    key: "total_calls",
    header: "Cagri",
    align: "right" as const,
    render: (p: ProviderStat) => fmtCount(p.total_calls),
  },
  {
    key: "failed_calls",
    header: "Basarisiz",
    align: "right" as const,
    render: (p: ProviderStat) => (
      <span className={cn(p.failed_calls > 0 ? "text-error-base" : "text-neutral-800")}>
        {fmtCount(p.failed_calls)}
      </span>
    ),
  },
  {
    key: "error_rate",
    header: "Hata Orani",
    align: "right" as const,
    render: (p: ProviderStat) => fmtRate(p.error_rate),
  },
  {
    key: "avg_latency",
    header: "Ort. Gecikme",
    align: "right" as const,
    render: (p: ProviderStat) =>
      p.avg_latency_ms != null ? `${(p.avg_latency_ms / 1000).toFixed(2)}s` : "\u2014",
  },
  {
    key: "cost",
    header: "Maliyet",
    align: "right" as const,
    render: (p: ProviderStat) => {
      const cost = fmtCost(p);
      return (
        <span>
          {cost.text}{" "}
          <span data-testid={`provider-cost-badge-${p.provider_name}`}>
            <StatusBadge status={cost.badgeStatus} label={cost.badge} size="sm" />
          </span>
        </span>
      );
    },
  },
];

const stepColumns = [
  {
    key: "step_key",
    header: "Adim",
    render: (row: StepStat) => <Mono>{row.step_key}</Mono>,
  },
  {
    key: "count",
    header: "Calisma",
    align: "right" as const,
    render: (row: StepStat) => fmtCount(row.count),
  },
  {
    key: "avg_elapsed_seconds",
    header: "Ort. Sure",
    align: "right" as const,
    render: (row: StepStat) => fmtSeconds(row.avg_elapsed_seconds),
  },
  {
    key: "failed_count",
    header: "Basarisiz",
    align: "right" as const,
    render: (row: StepStat) => (
      <span className={cn(row.failed_count > 0 ? "text-error-base" : "text-neutral-800")}>
        {fmtCount(row.failed_count)}
      </span>
    ),
  },
];

const sourceColumns = [
  {
    key: "source_name",
    header: "Kaynak",
    render: (s: SourceStat) => <Mono>{s.source_name}</Mono>,
  },
  {
    key: "source_type",
    header: "Tur",
    render: (s: SourceStat) => s.source_type,
  },
  {
    key: "status",
    header: "Durum",
    render: (s: SourceStat) => (
      <StatusBadge status={s.status === "active" ? "active" : "inactive"} label={s.status} size="sm" />
    ),
  },
  {
    key: "scan_count",
    header: "Tarama",
    align: "right" as const,
    render: (s: SourceStat) => fmtCount(s.scan_count),
  },
  {
    key: "news_count",
    header: "Haber",
    align: "right" as const,
    render: (s: SourceStat) => fmtCount(s.news_count),
  },
  {
    key: "used_news_count",
    header: "Kullanilan",
    align: "right" as const,
    render: (s: SourceStat) => fmtCount(s.used_news_count),
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

const assemblyModuleColumns = [
  {
    key: "module_scope",
    header: "Modul",
    render: (r: AssemblyModuleStat) => <Mono>{r.module_scope}</Mono>,
  },
  {
    key: "run_count",
    header: "Calisma",
    align: "right" as const,
    render: (r: AssemblyModuleStat) => fmtCount(r.run_count),
  },
  {
    key: "avg_included_blocks",
    header: "Ort. Dahil Blok",
    align: "right" as const,
    render: (r: AssemblyModuleStat) => r.avg_included_blocks.toFixed(1),
  },
  {
    key: "avg_skipped_blocks",
    header: "Ort. Atlanan Blok",
    align: "right" as const,
    render: (r: AssemblyModuleStat) => r.avg_skipped_blocks.toFixed(1),
  },
];

const assemblyProviderColumns = [
  {
    key: "provider_name",
    header: "Provider",
    render: (r: AssemblyProviderStat) => <Mono>{r.provider_name}</Mono>,
  },
  {
    key: "run_count",
    header: "Calisma",
    align: "right" as const,
    render: (r: AssemblyProviderStat) => fmtCount(r.run_count),
  },
  {
    key: "response_received_count",
    header: "Yanit Alindi",
    align: "right" as const,
    render: (r: AssemblyProviderStat) => fmtCount(r.response_received_count),
  },
  {
    key: "error_count",
    header: "Hata",
    align: "right" as const,
    render: (r: AssemblyProviderStat) => (
      <span className={cn(r.error_count > 0 ? "text-error-base" : "text-neutral-800")}>
        {fmtCount(r.error_count)}
      </span>
    ),
  },
];

export function AnalyticsOperationsPage() {
  const analyticsFilters = useAnalyticsFilters("last_30d");
  const window = analyticsFilters.filters.window;
  const { apiParams } = analyticsFilters;
  const { data, isLoading, isError } = useAnalyticsOperations(window);
  const { data: overviewData, isLoading: overviewLoading } = useAnalyticsOverview(window);
  const { data: sourceData, isLoading: sourceLoading } = useSourceImpact(window);
  const { data: assemblyData, isLoading: assemblyLoading } = usePromptAssemblyMetrics(window);

  const anyLoading = isLoading || overviewLoading;
  const stepStats: StepStat[] = data?.step_stats ?? [];
  const sortedSteps = [...stepStats].sort((a, b) => b.count - a.count);
  const providerStats: ProviderStat[] = data?.provider_stats ?? [];
  const sourceStats: SourceStat[] = sourceData?.source_stats ?? [];
  const assemblyModuleStats: AssemblyModuleStat[] = assemblyData?.module_stats ?? [];
  const assemblyProviderStats: AssemblyProviderStat[] = assemblyData?.provider_stats ?? [];

  return (
    <PageShell
      title="Operasyon Metrikleri"
      subtitle="Is basari, uretim suresi, retry ve adim bazli detaylar."
      breadcrumb={[
        { label: "Analytics", to: "/admin/analytics" },
        { label: "Operasyon Metrikleri" },
      ]}
      testId="analytics-operations"
      actions={<ExportButton kind="operations" params={apiParams} />}
    >
      <Link to="/admin/analytics" className="absolute w-px h-px overflow-hidden [clip:rect(0,0,0,0)]">{"\u2190"} Analytics'e don</Link>
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="analytics-operations-workflow-note">
        Is Basari &rarr; Retry/Hata &rarr; Provider Sagligi &rarr; Kaynak Etkisi &rarr; Karar Noktasi
      </p>

      {/* Filter Bar */}
      <AdminAnalyticsFilterBar analyticsFilters={analyticsFilters} testId="operations-filter-bar" />

      {isError && (
        <p className="text-error-base text-md mb-4" data-testid="analytics-operations-error">
          Metrikler yuklenemedi. Backend baglantisi kontrol edilsin.
        </p>
      )}

      {/* Job Performance */}
      <SectionShell title="Is Performansi"  testId="analytics-job-performance">
        <div data-testid="job-performance-heading" className="hidden">Is Performansi</div>
        <div data-testid="job-performance-note" className="hidden">Uretim islerinin basari, sure ve hata dagilimi.</div>
        <MetricGrid>
          <MetricTile label="Toplam Is" value={fmtCount(overviewData?.total_job_count)} note="Olusturulan tum isler" loading={anyLoading} testId="ops-metric-total-jobs" />
          <MetricTile label="Tamamlanan" value={fmtCount(overviewData?.completed_job_count)} note="Basariyla biten isler" loading={anyLoading} testId="ops-metric-completed" />
          <MetricTile label="Basarisiz" value={fmtCount(overviewData?.failed_job_count)} note="Hata ile sonuclanan isler" loading={anyLoading} testId="ops-metric-failed" />
          <MetricTile label="Ort. Render Suresi" value={fmtSeconds(data?.avg_render_duration_seconds)} note="Composition adimi ortalamasi" loading={isLoading} testId="ops-metric-avg-render" />
        </MetricGrid>
      </SectionShell>

      {/* Provider Health */}
      <SectionShell title="Provider Sagligi"  testId="analytics-provider-health">
        <div data-testid="provider-health-heading" className="hidden">Provider Sagligi</div>
        <div data-testid="provider-health-note" className="hidden">TTS, LLM ve gorsel provider'larin hata ve basari durumu.</div>
        <MetricGrid>
          <MetricTile label="Toplam Provider Cagrisi" value={fmtCount(providerStats.reduce((a, p) => a + p.total_calls, 0) || null)} note="Trace verisi olan cagrilar" loading={isLoading} testId="ops-metric-provider-calls" />
          <MetricTile label="Provider Hata Orani" value={fmtRate(data?.provider_error_rate)} note="script/metadata/tts/visuals adimlarinin basarisizlik orani" loading={isLoading} testId="ops-metric-provider-error" />
          <div data-testid="ops-metric-provider-errors" className="hidden">Provider Hata Orani</div>
        </MetricGrid>

        {/* Provider Detail Table */}
        <div className="mt-4">
          <DataTable<ProviderStat>
            columns={providerColumns}
            data={providerStats}
            keyFn={(p) => p.provider_name}
            loading={isLoading}
            emptyMessage="Secilen donemde provider trace verisi yok."
            testId="provider-stats"
            rowTestIdPrefix="provider-row"
          />
          {!isLoading && providerStats.length > 0 && (
            <p className="mt-1 text-xs text-neutral-500" data-testid="cost-model-legend">
              actual: trace'den gelen gercek maliyet | estimated: statik tahmin | unsupported: maliyet verisi yok
            </p>
          )}
        </div>

        {/* Provider Latency Chart */}
        {!isLoading && providerStats.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-neutral-700 mb-2">Provider Gecikme Dagilimi</h4>
            <ProviderLatencyChart data={providerStats} />
          </div>
        )}
      </SectionShell>

      {/* Step Stats */}
      <SectionShell title="Adim Bazli Istatistikler"  testId="analytics-step-stats">
        <div data-testid="step-stats-heading" className="hidden">Adim Bazli Istatistikler</div>
        {sortedSteps.length > 0 && !isLoading ? (
          <div data-testid="step-stats-table">
            <DataTable<StepStat> columns={stepColumns} data={sortedSteps} keyFn={(row) => row.step_key} loading={isLoading} emptyMessage="Secilen donemde adim verisi yok." testId="step-stats" rowTestIdPrefix="step-row" />
          </div>
        ) : (
          <DataTable<StepStat> columns={stepColumns} data={sortedSteps} keyFn={(row) => row.step_key} loading={isLoading} emptyMessage="Secilen donemde adim verisi yok." testId="step-stats" rowTestIdPrefix="step-row" />
        )}

        {/* Step Duration Chart */}
        {!isLoading && sortedSteps.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-neutral-700 mb-2">Adim Sure Dagilimi</h4>
            <StepDurationChart data={sortedSteps} />
          </div>
        )}
      </SectionShell>

      {/* Source Impact */}
      <SectionShell
        title="Kaynak Etkisi"
        testId="analytics-source-impact"
        actions={<ExportButton kind="source-impact" params={{ window: apiParams.window }} />}
      >
        <div data-testid="source-impact-heading" className="hidden">Kaynak Etkisi</div>
        <div data-testid="source-impact-note" className="hidden">Haber kaynaklarinin uretim hattina etkisi.</div>
        <SystemScopeNote />
        <MetricGrid>
          <MetricTile label="Toplam Kaynak" value={fmtCount(sourceData?.total_sources ?? null)} note="Tanimli haber kaynaklari" loading={sourceLoading} testId="source-metric-total" />
          <MetricTile label="Aktif Kaynak" value={fmtCount(sourceData?.active_sources ?? null)} note="Durumu aktif olan kaynaklar" loading={sourceLoading} testId="source-metric-active" />
          <MetricTile label="Toplam Tarama" value={fmtCount(sourceData?.total_scans ?? null)} note="Gerceklestirilen taramalar" loading={sourceLoading} testId="source-metric-scans" />
          <MetricTile label="Toplam Haber" value={fmtCount(sourceData?.total_news_items ?? null)} note="Toplanan haber ogeleri" loading={sourceLoading} testId="source-metric-news" />
          <MetricTile label="Kullanilan Haber" value={fmtCount(sourceData?.used_news_count ?? null)} note="Uretime alinan haberler" loading={sourceLoading} testId="source-metric-used" />
          <MetricTile label="Bulletin Sayisi" value={fmtCount(sourceData?.bulletin_count ?? null)} note="Olusturulan haber bultenleri" loading={sourceLoading} testId="source-metric-bulletins" />
        </MetricGrid>

        {/* Source Detail Table */}
        <div className="mt-4">
          <div data-testid="source-stats-table">
            <DataTable<SourceStat> columns={sourceColumns} data={sourceStats} keyFn={(s) => String(s.source_id)} loading={sourceLoading} emptyMessage="Hen&uuml;z tanimli haber kaynagi bulunmuyor." testId="source-stats" rowTestIdPrefix="source-row" />
          </div>
        </div>
      </SectionShell>

      {/* Prompt Assembly */}
      <SectionShell
        title="Prompt Assembly"
        testId="analytics-prompt-assembly"
        actions={<ExportButton kind="prompt-assembly" params={{ window: apiParams.window }} />}
      >
        <div data-testid="prompt-assembly-heading" className="hidden">Prompt Assembly</div>
        <div data-testid="prompt-assembly-note" className="hidden">Prompt assembly calisma ozeti ve modul/provider dagilimi.</div>
        <SystemScopeNote />
        <MetricGrid>
          <MetricTile
            label="Uretim Calismasi"
            value={fmtCount(data?.total_assembly_runs ?? null)}
            note="is_dry_run=False assembly sayisi"
            loading={isLoading}
            testId="assembly-metric-production"
          />
          <MetricTile
            label="Dry Run"
            value={fmtCount(data?.dry_run_count ?? null)}
            note="is_dry_run=True assembly sayisi"
            loading={isLoading}
            testId="assembly-metric-dry-run"
          />
          <MetricTile
            label="Ort. Dahil Blok"
            value={assemblyData?.avg_included_blocks != null ? assemblyData.avg_included_blocks.toFixed(1) : "\u2014"}
            note="Assembly basina ortalama dahil edilen blok"
            loading={assemblyLoading}
            testId="assembly-metric-avg-included"
          />
          <MetricTile
            label="Ort. Atlanan Blok"
            value={assemblyData?.avg_skipped_blocks != null ? assemblyData.avg_skipped_blocks.toFixed(1) : "\u2014"}
            note="Assembly basina ortalama atlanan blok"
            loading={assemblyLoading}
            testId="assembly-metric-avg-skipped"
          />
        </MetricGrid>

        {/* Module Stats Table */}
        {assemblyModuleStats.length > 0 && (
          <div className="mt-4" data-testid="assembly-module-stats">
            <h4 className="text-sm font-semibold text-neutral-700 mb-2">Modul Bazli Dagilim</h4>
            <DataTable<AssemblyModuleStat>
              columns={assemblyModuleColumns}
              data={assemblyModuleStats}
              keyFn={(r) => r.module_scope}
              loading={assemblyLoading}
              emptyMessage="Secilen donemde assembly verisi yok."
              testId="assembly-module-table"
              rowTestIdPrefix="assembly-module-row"
            />
          </div>
        )}

        {/* Provider Stats Table */}
        {assemblyProviderStats.length > 0 && (
          <div className="mt-4" data-testid="assembly-provider-stats">
            <h4 className="text-sm font-semibold text-neutral-700 mb-2">Provider Bazli Dagilim</h4>
            <DataTable<AssemblyProviderStat>
              columns={assemblyProviderColumns}
              data={assemblyProviderStats}
              keyFn={(r) => r.provider_name}
              loading={assemblyLoading}
              emptyMessage="Secilen donemde assembly provider verisi yok."
              testId="assembly-provider-table"
              rowTestIdPrefix="assembly-provider-row"
            />
          </div>
        )}
      </SectionShell>
    </PageShell>
  );
}
