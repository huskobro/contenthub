import { useState } from "react";
import { Link } from "react-router-dom";
import { useContentMetrics } from "../../hooks/useContentMetrics";
import type { AnalyticsWindow } from "../../api/analyticsApi";
import { PageShell, SectionShell, MetricTile, MetricGrid, DataTable, WindowSelector } from "../../components/design-system/primitives";
import type { ReactNode } from "react";

const WINDOW_OPTIONS: { value: AnalyticsWindow; label: string }[] = [
  { value: "last_7d", label: "Son 7 Gun" },
  { value: "last_30d", label: "Son 30 Gun" },
  { value: "last_90d", label: "Son 90 Gun" },
  { value: "all_time", label: "Tum Zamanlar" },
];

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
}

const MODULE_COLUMNS: { key: string; header: string; render: (item: ModuleRow) => ReactNode }[] = [
  { key: "module_type", header: "Modul", render: (item) => item.module_type },
  { key: "total_jobs", header: "Toplam Is", render: (item) => item.total_jobs },
  { key: "completed_jobs", header: "Tamamlanan", render: (item) => item.completed_jobs },
  { key: "failed_jobs", header: "Basarisiz", render: (item) => item.failed_jobs },
  { key: "success_rate", header: "Basari Orani", render: (item) => fmtRate(item.success_rate) },
];

export function AnalyticsContentPage() {
  const [window, setWindow] = useState<AnalyticsWindow>("all_time");
  const { data, isLoading, isError } = useContentMetrics(window);

  return (
    <PageShell
      title="Icerik Performansi"
      subtitle="Video bazinda kullanim ve performans ozetinin uretim ve yayin performansini buradan takip edebilirsiniz."
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

      <p
        className="m-0 mb-5 text-sm text-neutral-500 leading-normal max-w-[640px]"
        data-testid="analytics-content-workflow-note"
      >
        Kullanim/performans rapor zinciri: Modul Dagilimi &rarr; Icerik Uretim
        Orani &rarr; Yayin Basarisi &rarr; Sablon/Kaynak Etkisi &rarr; Verimlilik Ozeti.
        Her icerik icin standard video detay sayfasina giderek ayrintili bilgi alabilirsiniz.
      </p>

      {/* Window selector */}
      <div className="mb-4" data-testid="content-window-selector">
        <WindowSelector
          options={WINDOW_OPTIONS}
          value={window}
          onChange={setWindow}
          testId="content-window-select"
        />
      </div>

      {isLoading && (
        <p className="text-neutral-600 text-base">Y&uuml;kleniyor...</p>
      )}

      {isError && (
        <p className="text-error-base text-base" data-testid="content-error">
          Icerik metrikleri yuklenirken hata olustu.
        </p>
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
          <SectionShell title="Icerik Tipi Kirilimi" description="Uretilen iceriklerin tip bazli dagilimi." testId="content-type-breakdown">
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
          <SectionShell testId="analytics-module-distribution" flush>
            <div className="p-5 pb-0">
              <h3 className="m-0 text-lg font-semibold text-neutral-900" data-testid="module-distribution-heading">
                Modul Dagilimi
              </h3>
              <p className="mt-1 mb-4 text-sm text-neutral-500 leading-normal" data-testid="module-distribution-note">
                Icerik uretiminin modullere gore dagilimi. Hangi modul daha yogun
                kullaniliyor, hangi modulde daha fazla hata olusuyor gorunur.
                Modul bazli verimlilik karari icin bu dagilimi kullanabilirsiniz.
              </p>
            </div>
            <DataTable<ModuleRow>
              columns={MODULE_COLUMNS}
              data={data.module_distribution}
              keyFn={(item) => item.module_type}
              emptyMessage="Hen&uuml;z modul bazli is verisi bulunmuyor."
              testId="module-distribution-table"
              rowTestIdPrefix="module-row"
            />
          </SectionShell>
        </>
      )}
    </PageShell>
  );
}
