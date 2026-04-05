import { useState } from "react";
import { Link } from "react-router-dom";
import { useContentMetrics } from "../../hooks/useContentMetrics";
import type { AnalyticsWindow } from "../../api/analyticsApi";
import { colors, radius, typography, spacing, shadow, transition } from "../../components/design-system/tokens";
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
        style={{
          display: "inline-block",
          marginBottom: spacing[3],
          fontSize: typography.size.sm,
          color: colors.brand[600],
          textDecoration: "none",
        }}
      >
        ← Analytics'e don
      </Link>

      <p
        style={{
          margin: `0 0 ${spacing[5]}`,
          fontSize: typography.size.sm,
          color: colors.neutral[500],
          lineHeight: typography.lineHeight.normal,
          maxWidth: "640px",
        }}
        data-testid="analytics-content-workflow-note"
      >
        Kullanim/performans rapor zinciri: Modul Dagilimi → Icerik Uretim
        Orani → Yayin Basarisi → Sablon/Kaynak Etkisi → Verimlilik Ozeti.
        Her icerik icin standard video detay sayfasina giderek ayrintili bilgi alabilirsiniz.
      </p>

      {/* Window selector */}
      <div style={{ marginBottom: spacing[4] }} data-testid="content-window-selector">
        <WindowSelector
          options={WINDOW_OPTIONS}
          value={window}
          onChange={setWindow}
          testId="content-window-select"
        />
      </div>

      {isLoading && (
        <p style={{ color: colors.neutral[600], fontSize: typography.size.base }}>Yükleniyor...</p>
      )}

      {isError && (
        <p style={{ color: colors.error.base, fontSize: typography.size.base }} data-testid="content-error">
          Icerik metrikleri yuklenirken hata olustu.
        </p>
      )}

      {data && (
        <>
          {/* Summary metrics */}
          <div data-testid="content-summary-metrics" style={{ marginBottom: spacing[5] }}>
            <MetricGrid>
              <MetricTile
                label="Toplam Icerik"
                value={data.content_output_count}
                testId="metric-content-output"
              />
              <MetricTile
                label="Yayinlanan"
                value={data.published_content_count}
                testId="metric-published-content"
                accentColor={colors.success.base}
              />
              <MetricTile
                label="Ort. Yayina Kadar"
                value={fmtDuration(data.avg_time_to_publish_seconds)}
                testId="metric-avg-time-to-publish"
              />
              <MetricTile
                label="Aktif Sablon"
                value={data.active_template_count}
                testId="metric-active-templates"
              />
              <MetricTile
                label="Aktif Blueprint"
                value={data.active_blueprint_count}
                testId="metric-active-blueprints"
              />
            </MetricGrid>
          </div>

          {/* Content type breakdown */}
          <SectionShell
            title="Icerik Tipi Kirilimi"
            description="Uretilen iceriklerin tip bazli dagilimi."
            testId="content-type-breakdown"
          >
            <div style={{ display: "flex", gap: spacing[3], flexWrap: "wrap" }}>
              {data.content_type_breakdown.map((ct) => (
                <div
                  key={ct.type}
                  style={{
                    padding: `${spacing[3]} ${spacing[4]}`,
                    background: colors.surface.card,
                    border: `1px solid ${colors.border.subtle}`,
                    borderRadius: radius.md,
                    textAlign: "center",
                    minWidth: "120px",
                    boxShadow: shadow.xs,
                    transition: `box-shadow ${transition.fast}`,
                  }}
                  data-testid={`content-type-${ct.type}`}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = shadow.sm; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = shadow.xs; }}
                >
                  <div style={{ fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                    {ct.count}
                  </div>
                  <div style={{ fontSize: typography.size.xs, color: colors.neutral[600], marginTop: spacing[1] }}>
                    {ct.type === "standard_video" ? "Standart Video" : ct.type === "news_bulletin" ? "Haber Bulteni" : ct.type}
                  </div>
                </div>
              ))}
            </div>
          </SectionShell>

          {/* Module distribution */}
          <SectionShell
            testId="analytics-module-distribution"
            flush
          >
            <div style={{ padding: `${spacing[5]} ${spacing[5]} 0` }}>
              <h3
                style={{ margin: 0, fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.neutral[900] }}
                data-testid="module-distribution-heading"
              >
                Modul Dagilimi
              </h3>
              <p
                style={{ margin: `${spacing[1]} 0 ${spacing[4]}`, fontSize: typography.size.sm, color: colors.neutral[500], lineHeight: typography.lineHeight.normal }}
                data-testid="module-distribution-note"
              >
                Icerik uretiminin modullere gore dagilimi. Hangi modul daha yogun
                kullaniliyor, hangi modulde daha fazla hata olusuyor gorunur.
                Modul bazli verimlilik karari icin bu dagilimi kullanabilirsiniz.
              </p>
            </div>
            <DataTable<ModuleRow>
              columns={MODULE_COLUMNS}
              data={data.module_distribution}
              keyFn={(item) => item.module_type}
              emptyMessage="Henüz modul bazli is verisi bulunmuyor."
              testId="module-distribution-table"
              rowTestIdPrefix="module-row"
            />
          </SectionShell>
        </>
      )}
    </PageShell>
  );
}
