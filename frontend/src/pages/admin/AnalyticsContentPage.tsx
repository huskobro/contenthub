import { useState } from "react";
import { Link } from "react-router-dom";
import { useContentMetrics } from "../../hooks/useContentMetrics";
import type { AnalyticsWindow } from "../../api/analyticsApi";
import { colors, radius, typography, spacing, shadow } from "../../components/design-system/tokens";
import { PageShell, SectionShell, MetricTile, MetricGrid, WindowSelector } from "../../components/design-system/primitives";

const SECTION: React.CSSProperties = {
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: radius.lg,
  background: colors.neutral[50],
  padding: spacing[4],
  marginBottom: spacing[5],
};

const TABLE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: typography.size.base,
};

const TH: React.CSSProperties = {
  textAlign: "left",
  padding: `${spacing[2]} ${spacing[3]}`,
  borderBottom: `2px solid ${colors.border.default}`,
  color: colors.neutral[600],
  fontWeight: typography.weight.semibold,
  fontSize: typography.size.sm,
};

const TD: React.CSSProperties = {
  padding: `${spacing[2]} ${spacing[3]}`,
  borderBottom: `1px solid ${colors.border.subtle}`,
  color: colors.neutral[800],
};

const METRIC_CARD: React.CSSProperties = {
  padding: `${spacing[3]} ${spacing[4]}`,
  background: colors.surface.card,
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: radius.lg,
  boxShadow: shadow.xs,
  textAlign: "center",
  minWidth: "140px",
};

const WINDOW_OPTIONS: { value: AnalyticsWindow; label: string }[] = [
  { value: "last_7d", label: "Son 7 Gun" },
  { value: "last_30d", label: "Son 30 Gun" },
  { value: "last_90d", label: "Son 90 Gun" },
  { value: "all_time", label: "Tum Zamanlar" },
];

function fmtRate(rate: number | null): string {
  if (rate === null || rate === undefined) return "—";
  return `%${(rate * 100).toFixed(1)}`;
}

function fmtDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds.toFixed(0)}sn`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}dk`;
  return `${(seconds / 3600).toFixed(1)}sa`;
}

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
          <div
            style={{ display: "flex", gap: spacing[3], flexWrap: "wrap", marginBottom: spacing[5] }}
            data-testid="content-summary-metrics"
          >
            <div style={METRIC_CARD} data-testid="metric-content-output">
              <div style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                {data.content_output_count}
              </div>
              <div style={{ fontSize: typography.size.xs, color: colors.neutral[600] }}>Toplam Icerik</div>
            </div>
            <div style={METRIC_CARD} data-testid="metric-published-content">
              <div style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.bold, color: colors.success.text }}>
                {data.published_content_count}
              </div>
              <div style={{ fontSize: typography.size.xs, color: colors.neutral[600] }}>Yayinlanan</div>
            </div>
            <div style={METRIC_CARD} data-testid="metric-avg-time-to-publish">
              <div style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                {fmtDuration(data.avg_time_to_publish_seconds)}
              </div>
              <div style={{ fontSize: typography.size.xs, color: colors.neutral[600] }}>Ort. Yayina Kadar</div>
            </div>
            <div style={METRIC_CARD} data-testid="metric-active-templates">
              <div style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                {data.active_template_count}
              </div>
              <div style={{ fontSize: typography.size.xs, color: colors.neutral[600] }}>Aktif Sablon</div>
            </div>
            <div style={METRIC_CARD} data-testid="metric-active-blueprints">
              <div style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                {data.active_blueprint_count}
              </div>
              <div style={{ fontSize: typography.size.xs, color: colors.neutral[600] }}>Aktif Blueprint</div>
            </div>
          </div>

          {/* Content type breakdown */}
          <div style={SECTION} data-testid="content-type-breakdown">
            <h3 style={{ margin: `0 0 ${spacing[1]}`, fontSize: typography.size.lg }} data-testid="content-type-heading">
              Icerik Tipi Kirilimi
            </h3>
            <p style={{ margin: `0 0 ${spacing[3]}`, fontSize: typography.size.sm, color: colors.neutral[500] }}>
              Uretilen iceriklerin tip bazli dagilimi.
            </p>
            <div style={{ display: "flex", gap: spacing[3], flexWrap: "wrap" }}>
              {data.content_type_breakdown.map((ct) => (
                <div
                  key={ct.type}
                  style={{
                    padding: `${spacing[2]} ${spacing[4]}`,
                    background: colors.neutral[0],
                    border: `1px solid ${colors.border.subtle}`,
                    borderRadius: radius.md,
                    textAlign: "center",
                    minWidth: "120px",
                  }}
                  data-testid={`content-type-${ct.type}`}
                >
                  <div style={{ fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                    {ct.count}
                  </div>
                  <div style={{ fontSize: typography.size.xs, color: colors.neutral[600] }}>
                    {ct.type === "standard_video" ? "Standart Video" : ct.type === "news_bulletin" ? "Haber Bulteni" : ct.type}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Module distribution */}
          <div style={SECTION} data-testid="analytics-module-distribution">
            <h3 style={{ margin: `0 0 ${spacing[1]}`, fontSize: typography.size.lg }} data-testid="module-distribution-heading">
              Modul Dagilimi
            </h3>
            <p
              style={{ margin: `0 0 ${spacing[3]}`, fontSize: typography.size.sm, color: colors.neutral[500] }}
              data-testid="module-distribution-note"
            >
              Icerik uretiminin modullere gore dagilimi. Hangi modul daha yogun
              kullaniliyor, hangi modulde daha fazla hata olusuyor gorunur.
              Modul bazli verimlilik karari icin bu dagilimi kullanabilirsiniz.
            </p>
            {data.module_distribution.length === 0 ? (
              <p style={{ fontSize: typography.size.base, color: colors.neutral[500] }}>
                <em data-testid="module-distribution-empty">Henüz modul bazli is verisi bulunmuyor.</em>
              </p>
            ) : (
              <table style={TABLE} data-testid="module-distribution-table">
                <thead>
                  <tr>
                    <th style={TH}>Modul</th>
                    <th style={TH}>Toplam Is</th>
                    <th style={TH}>Tamamlanan</th>
                    <th style={TH}>Basarisiz</th>
                    <th style={TH}>Basari Orani</th>
                  </tr>
                </thead>
                <tbody>
                  {data.module_distribution.map((mod) => (
                    <tr key={mod.module_type} data-testid={`module-row-${mod.module_type}`}>
                      <td style={TD}>{mod.module_type}</td>
                      <td style={TD}>{mod.total_jobs}</td>
                      <td style={TD}>{mod.completed_jobs}</td>
                      <td style={TD}>{mod.failed_jobs}</td>
                      <td style={TD}>{fmtRate(mod.success_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
