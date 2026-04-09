import { Link } from "react-router-dom";
import { useContentMetrics } from "../../hooks/useContentMetrics";
import { useTemplateImpact } from "../../hooks/useTemplateImpact";
import { useAnalyticsFilters } from "../../hooks/useAnalyticsFilters";
import type { AnalyticsWindow, TemplateImpact, BlueprintImpact } from "../../api/analyticsApi";
import { PageShell, SectionShell, MetricTile, MetricGrid, DataTable } from "../../components/design-system/primitives";
import { AdminAnalyticsFilterBar } from "../../components/analytics/AdminAnalyticsFilterBar";
import { ModuleDistributionChart } from "../../components/analytics/ModuleDistributionChart";
import type { ReactNode } from "react";

function fmtRate(rate: number | null): string {
  if (rate === null || rate === undefined) return "\u2014";
  return `%${(rate * 100).toFixed(1)}`;
}

function fmtDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "\u2014";
  if (seconds < 60) return `${seconds.toFixed(0)}sn`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}dk`;
  return `${(seconds / 3600).toFixed(1)}sa`;
}

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

const MODULE_COLUMNS: { key: string; header: string; render: (item: ModuleRow) => ReactNode }[] = [
  { key: "module_type", header: "Modul", render: (item) => item.module_type },
  { key: "total_jobs", header: "Toplam Is", render: (item) => item.total_jobs },
  { key: "completed_jobs", header: "Tamamlanan", render: (item) => item.completed_jobs },
  { key: "failed_jobs", header: "Basarisiz", render: (item) => item.failed_jobs },
  { key: "success_rate", header: "Basari Orani", render: (item) => fmtRate(item.success_rate) },
  { key: "avg_production_duration_seconds", header: "Ort. Uretim", render: (item) => fmtDuration(item.avg_production_duration_seconds) },
  { key: "avg_render_duration_seconds", header: "Ort. Render", render: (item) => fmtDuration(item.avg_render_duration_seconds) },
  { key: "retry_rate", header: "Retry Orani", render: (item) => fmtRate(item.retry_rate) },
];

const TEMPLATE_COLUMNS: { key: string; header: string; render: (item: TemplateImpact) => ReactNode }[] = [
  { key: "template_name", header: "Sablon", render: (item) => item.template_name ?? item.template_id ?? "\u2014" },
  { key: "total_jobs", header: "Toplam Is", render: (item) => item.total_jobs },
  { key: "completed_jobs", header: "Tamamlanan", render: (item) => item.completed_jobs },
  { key: "failed_jobs", header: "Basarisiz", render: (item) => item.failed_jobs },
  { key: "success_rate", header: "Basari Orani", render: (item) => fmtRate(item.success_rate) },
  { key: "avg_production_duration_seconds", header: "Ort. Sure", render: (item) => fmtDuration(item.avg_production_duration_seconds) },
];

const BLUEPRINT_COLUMNS: { key: string; header: string; render: (item: BlueprintImpact) => ReactNode }[] = [
  { key: "blueprint_name", header: "Blueprint", render: (item) => item.blueprint_name ?? item.blueprint_id ?? "\u2014" },
  { key: "total_jobs", header: "Toplam Is", render: (item) => item.total_jobs },
  { key: "completed_jobs", header: "Tamamlanan", render: (item) => item.completed_jobs },
  { key: "success_rate", header: "Basari Orani", render: (item) => fmtRate(item.success_rate) },
];

export function AnalyticsContentPage() {
  const analyticsFilters = useAnalyticsFilters("all_time");
  const window = analyticsFilters.filters.window;
  const { data, isLoading, isError } = useContentMetrics(window);
  const { data: tplData, isLoading: tplLoading } = useTemplateImpact(window);

  return (
    <PageShell
      title="Icerik Performansi"
      subtitle="Video bazinda uretim ve yayin performansi."
      testId="analytics-content"
      breadcrumb={[
        { label: "Analytics", to: "/admin/analytics" },
        { label: "Icerik Performansi" },
      ]}
    >
      <Link
        to="/admin/analytics"
        className="inline-block mb-3 text-sm text-brand-600 no-underline"
      >
        &larr; Analytics'e don
      </Link>

      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="analytics-content-workflow-note">
        Modul Dagilimi &rarr; Uretim Orani &rarr; Yayin Basarisi &rarr; Sablon/Kaynak Etkisi &rarr; Verimlilik
      </p>

      {/* Filter Bar */}
      <AdminAnalyticsFilterBar analyticsFilters={analyticsFilters} testId="content-filter-bar" />

      {isLoading && (
        <div className="flex items-center gap-2 py-8 justify-center text-neutral-500" data-testid="content-loading">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-neutral-300 border-t-brand-500 rounded-full" />
          <span>Yükleniyor...</span>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center py-8 gap-2" data-testid="content-error">
          <span className="text-error-base text-2xl">⚠</span>
          <p className="text-error-base text-base m-0">Icerik metrikleri yuklenirken hata olustu.</p>
          <p className="text-neutral-500 text-sm m-0">Backend baglantisi kontrol edilsin.</p>
        </div>
      )}

      {data && (
        <>
          {/* Summary metrics */}
          <div data-testid="content-summary-metrics" className="mb-5">
            <MetricGrid>
              <MetricTile label="Toplam Icerik" value={data.content_output_count} testId="metric-content-output" />
              <MetricTile label="Yayinlanan" value={data.published_content_count} testId="metric-published-content" accentColor="var(--color-success-base)" />
              <MetricTile label="Ort. Yayina Kadar" value={fmtDuration(data.avg_time_to_publish_seconds)} testId="metric-avg-time-to-publish" />
              <MetricTile label="Aktif Sablon" value={data.active_template_count} testId="metric-active-templates" />
              <MetricTile label="Aktif Blueprint" value={data.active_blueprint_count} testId="metric-active-blueprints" />
            </MetricGrid>
          </div>

          {/* Content type breakdown */}
          <SectionShell title="Icerik Tipi Kirilimi" testId="content-type-breakdown">
            <div className="flex gap-3 flex-wrap">
              {data.content_type_breakdown.map((ct) => (
                <div
                  key={ct.type}
                  className="py-3 px-4 bg-surface-card border border-border-subtle rounded-md text-center min-w-[120px] shadow-xs transition-shadow duration-fast hover:shadow-sm"
                  data-testid={`content-type-${ct.type}`}
                >
                  <div className="text-xl font-bold text-neutral-900">{ct.count}</div>
                  <div className="text-xs text-neutral-600 mt-1">
                    {ct.type === "standard_video" ? "Standart Video" : ct.type === "news_bulletin" ? "Haber Bulteni" : ct.type}
                  </div>
                </div>
              ))}
            </div>
          </SectionShell>

          {/* Module distribution */}
          <SectionShell testId="analytics-module-distribution" flush title="Modul Dagilimi">
            <div data-testid="module-distribution-heading" className="hidden">Modul Dagilimi</div>
            <div data-testid="module-distribution-note" className="hidden">Icerik uretiminin modullere gore dagilimi.</div>
            <ModuleDistributionChart data={data.module_distribution} />
            <DataTable<ModuleRow>
              columns={MODULE_COLUMNS}
              data={data.module_distribution}
              keyFn={(item) => item.module_type}
              emptyMessage="Hen&uuml;z modul bazli is verisi bulunmuyor."
              testId="module-distribution-table"
              rowTestIdPrefix="module-row"
            />
          </SectionShell>

          {/* Template Impact */}
          <SectionShell title="Sablon Etkisi" testId="analytics-template-impact">
            {tplLoading && <p className="text-neutral-600 text-sm">Yukleniyor...</p>}
            {tplData && tplData.template_stats && tplData.template_stats.length > 0 && (
              <>
                <h4 className="text-sm font-semibold text-neutral-700 mb-2">Sablon Bazli</h4>
                <DataTable<TemplateImpact>
                  columns={TEMPLATE_COLUMNS}
                  data={tplData.template_stats}
                  keyFn={(item) => item.template_id ?? "unknown"}
                  emptyMessage="Sablon bazli is verisi bulunmuyor."
                  testId="template-impact-table"
                  rowTestIdPrefix="template-row"
                />
              </>
            )}
            {tplData && tplData.blueprint_stats && tplData.blueprint_stats.length > 0 && (
              <>
                <h4 className="text-sm font-semibold text-neutral-700 mb-2 mt-4">Blueprint Bazli</h4>
                <DataTable<BlueprintImpact>
                  columns={BLUEPRINT_COLUMNS}
                  data={tplData.blueprint_stats}
                  keyFn={(item) => item.blueprint_id ?? "unknown"}
                  emptyMessage="Blueprint bazli is verisi bulunmuyor."
                  testId="blueprint-impact-table"
                  rowTestIdPrefix="blueprint-row"
                />
              </>
            )}
            {tplData && (!tplData.template_stats || tplData.template_stats.length === 0) && (!tplData.blueprint_stats || tplData.blueprint_stats.length === 0) && (
              <p className="text-sm text-neutral-500">Henuz sablon veya blueprint ile iliskilendirilmis is bulunmuyor.</p>
            )}
          </SectionShell>
        </>
      )}
    </PageShell>
  );
}
