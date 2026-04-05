import { useState } from "react";
import { Link } from "react-router-dom";
import { useAnalyticsOperations } from "../../hooks/useAnalyticsOperations";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { useSourceImpact } from "../../hooks/useSourceImpact";
import type { AnalyticsWindow, StepStat, ProviderStat, SourceStat } from "../../api/analyticsApi";

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "0.8125rem",
  color: "#94a3b8",
  lineHeight: 1.5,
  maxWidth: "640px",
};

const SECTION: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  background: "#fafbfc",
  padding: "1rem",
  marginBottom: "1.5rem",
};

const METRIC_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: "0.75rem",
};

const METRIC_CARD: React.CSSProperties = {
  padding: "0.75rem 1rem",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
};

const METRIC_LABEL: React.CSSProperties = {
  margin: "0 0 0.25rem",
  fontSize: "0.75rem",
  color: "#64748b",
};

const METRIC_VALUE: React.CSSProperties = {
  margin: 0,
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#0f172a",
};

const METRIC_NOTE: React.CSSProperties = {
  margin: "0.25rem 0 0",
  fontSize: "0.6875rem",
  color: "#94a3b8",
};

const TABLE_STYLE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.8125rem",
};

const TH_STYLE: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  textAlign: "left",
  fontSize: "0.75rem",
  color: "#64748b",
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const TD_STYLE: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
};

const WINDOW_OPTIONS: { value: AnalyticsWindow; label: string }[] = [
  { value: "last_7d", label: "Son 7 Gun" },
  { value: "last_30d", label: "Son 30 Gun" },
  { value: "last_90d", label: "Son 90 Gun" },
  { value: "all_time", label: "Tum Zamanlar" },
];

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

/**
 * Maliyet goruntuleme: actual (trace'den gelen), estimated (statik tahmin),
 * veya unsupported (maliyet verisi yok).
 */
function fmtCost(p: ProviderStat): { text: string; badge: string; color: string } {
  if (p.total_estimated_cost_usd != null && p.total_estimated_cost_usd > 0) {
    // Token verisi varsa = actual, yoksa = estimated
    const hasTokens = (p.total_input_tokens ?? 0) > 0 || (p.total_output_tokens ?? 0) > 0;
    return {
      text: `$${p.total_estimated_cost_usd.toFixed(4)}`,
      badge: hasTokens ? "actual" : "estimated",
      color: hasTokens ? "#16a34a" : "#d97706",
    };
  }
  return { text: "\u2014", badge: "unsupported", color: "#94a3b8" };
}

const COST_BADGE: React.CSSProperties = {
  fontSize: "0.5625rem",
  padding: "0.1rem 0.3rem",
  borderRadius: "3px",
  marginLeft: "0.25rem",
  verticalAlign: "super",
};

export function AnalyticsOperationsPage() {
  const [window, setWindow] = useState<AnalyticsWindow>("last_30d");
  const { data, isLoading, isError } = useAnalyticsOperations(window);
  const { data: overviewData, isLoading: overviewLoading } = useAnalyticsOverview(window);
  const { data: sourceData, isLoading: sourceLoading } = useSourceImpact(window);

  const anyLoading = isLoading || overviewLoading;
  const stepStats: StepStat[] = data?.step_stats ?? [];
  const sortedSteps = [...stepStats].sort((a, b) => b.count - a.count);
  const providerStats: ProviderStat[] = data?.provider_stats ?? [];
  const sourceStats: SourceStat[] = sourceData?.source_stats ?? [];

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <Link
          to="/admin/analytics"
          style={{ fontSize: "0.875rem", color: "#3b82f6", textDecoration: "none" }}
        >
          &larr; Analytics'e don
        </Link>
      </div>

      <h2
        style={{ margin: "0 0 0.25rem", fontSize: "1.125rem", fontWeight: 600 }}
        data-testid="analytics-operations-heading"
      >
        Operasyon Metrikleri
      </h2>
      <p style={SUBTITLE} data-testid="analytics-operations-subtitle">
        Is basari orani, uretim suresi, yeniden deneme ve adim bazli detaylari
        buradan inceleyebilirsiniz. Bu sayfa operasyonel saglik raporunun
        temelini olusturur.
      </p>
      <p
        style={{
          margin: "0 0 1.5rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="analytics-operations-workflow-note"
      >
        Operasyonel rapor zinciri: Is Basari Orani &rarr; Retry/Hata Dagilimi &rarr;
        Provider Sagligi &rarr; Kaynak Etkisi &rarr; Karar Noktasi. Yuksek retry orani
        veya provider hata orani sistemde dikkat gerektiren alanlari isaret eder.
      </p>

      {/* Window Selector */}
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {WINDOW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setWindow(opt.value)}
            data-testid={`window-btn-${opt.value}`}
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "0.8125rem",
              borderRadius: "4px",
              border: "1px solid",
              cursor: "pointer",
              borderColor: window === opt.value ? "#3b82f6" : "#e2e8f0",
              background: window === opt.value ? "#eff6ff" : "#fff",
              color: window === opt.value ? "#1d4ed8" : "#475569",
              fontWeight: window === opt.value ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isError && (
        <p
          style={{ color: "#ef4444", fontSize: "0.875rem", marginBottom: "1rem" }}
          data-testid="analytics-operations-error"
        >
          Metrikler yuklenemedi. Backend baglantisi kontrol edilsin.
        </p>
      )}

      {/* Job Performance */}
      <div style={SECTION} data-testid="analytics-job-performance">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="job-performance-heading">
          Is Performansi
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }} data-testid="job-performance-note">
          Uretim islerinin basari, sure ve hata dagilimi.
        </p>
        <div style={METRIC_GRID}>
          <div style={METRIC_CARD} data-testid="ops-metric-total-jobs">
            <p style={METRIC_LABEL}>Toplam Is</p>
            <p style={METRIC_VALUE} data-testid="ops-metric-total-jobs-value">
              {anyLoading ? "\u2026" : fmtCount(overviewData?.total_job_count)}
            </p>
            <p style={METRIC_NOTE}>Olusturulan tum isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="ops-metric-completed">
            <p style={METRIC_LABEL}>Tamamlanan</p>
            <p style={METRIC_VALUE} data-testid="ops-metric-completed-value">
              {anyLoading ? "\u2026" : fmtCount(overviewData?.completed_job_count)}
            </p>
            <p style={METRIC_NOTE}>Basariyla biten isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="ops-metric-failed">
            <p style={METRIC_LABEL}>Basarisiz</p>
            <p style={METRIC_VALUE} data-testid="ops-metric-failed-value">
              {anyLoading ? "\u2026" : fmtCount(overviewData?.failed_job_count)}
            </p>
            <p style={METRIC_NOTE}>Hata ile sonuclanan isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="ops-metric-avg-render">
            <p style={METRIC_LABEL}>Ort. Render Suresi</p>
            <p style={METRIC_VALUE} data-testid="ops-metric-avg-render-value">
              {isLoading ? "\u2026" : fmtSeconds(data?.avg_render_duration_seconds)}
            </p>
            <p style={METRIC_NOTE}>Composition adimi ortalamasi</p>
          </div>
        </div>
      </div>

      {/* Provider Health */}
      <div style={SECTION} data-testid="analytics-provider-health">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="provider-health-heading">
          Provider Sagligi
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }} data-testid="provider-health-note">
          TTS, LLM ve gorsel provider'larin hata ve basari durumu.
        </p>
        <div style={METRIC_GRID}>
          <div style={METRIC_CARD} data-testid="ops-metric-provider-calls">
            <p style={METRIC_LABEL}>Toplam Provider Cagrisi</p>
            <p style={METRIC_VALUE} data-testid="ops-metric-provider-calls-value">
              {isLoading ? "\u2026" : fmtCount(providerStats.reduce((a, p) => a + p.total_calls, 0) || null)}
            </p>
            <p style={METRIC_NOTE}>Trace verisi olan cagrilar</p>
          </div>
          <div style={METRIC_CARD} data-testid="ops-metric-provider-errors">
            <p style={METRIC_LABEL}>Provider Hata Orani</p>
            <p style={METRIC_VALUE} data-testid="ops-metric-provider-error-value">
              {isLoading ? "\u2026" : fmtRate(data?.provider_error_rate)}
            </p>
            <p style={METRIC_NOTE}>script/metadata/tts/visuals adimlarinin basarisizlik orani</p>
          </div>
        </div>

        {/* Provider bazli tablo — M17-D: maliyet modeli guncellendi */}
        {!isLoading && providerStats.length > 0 && (
          <div style={{ marginTop: "0.75rem", overflowX: "auto" }}>
            <table style={TABLE_STYLE} data-testid="provider-stats-table">
              <thead>
                <tr>
                  <th style={TH_STYLE}>Provider</th>
                  <th style={TH_STYLE}>Tur</th>
                  <th style={{ ...TH_STYLE, textAlign: "right" }}>Cagri</th>
                  <th style={{ ...TH_STYLE, textAlign: "right" }}>Basarisiz</th>
                  <th style={{ ...TH_STYLE, textAlign: "right" }}>Hata Orani</th>
                  <th style={{ ...TH_STYLE, textAlign: "right" }}>Ort. Gecikme</th>
                  <th style={{ ...TH_STYLE, textAlign: "right" }}>Maliyet</th>
                </tr>
              </thead>
              <tbody>
                {providerStats.map((p: ProviderStat) => {
                  const cost = fmtCost(p);
                  return (
                    <tr key={p.provider_name} data-testid={`provider-row-${p.provider_name}`}>
                      <td style={TD_STYLE}>
                        <code style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "0.1rem 0.3rem", borderRadius: "3px" }}>
                          {p.provider_name}
                        </code>
                      </td>
                      <td style={TD_STYLE}>{p.provider_kind}</td>
                      <td style={{ ...TD_STYLE, textAlign: "right" }}>{fmtCount(p.total_calls)}</td>
                      <td style={{ ...TD_STYLE, textAlign: "right", color: p.failed_calls > 0 ? "#ef4444" : "#0f172a" }}>
                        {fmtCount(p.failed_calls)}
                      </td>
                      <td style={{ ...TD_STYLE, textAlign: "right" }}>{fmtRate(p.error_rate)}</td>
                      <td style={{ ...TD_STYLE, textAlign: "right" }}>
                        {p.avg_latency_ms != null ? `${(p.avg_latency_ms / 1000).toFixed(2)}s` : "\u2014"}
                      </td>
                      <td style={{ ...TD_STYLE, textAlign: "right" }} data-testid={`provider-cost-${p.provider_name}`}>
                        {cost.text}
                        <span
                          style={{
                            ...COST_BADGE,
                            background: cost.color + "1a",
                            color: cost.color,
                          }}
                          data-testid={`provider-cost-badge-${p.provider_name}`}
                        >
                          {cost.badge}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{ marginTop: "0.25rem", fontSize: "0.625rem", color: "#94a3b8" }} data-testid="cost-model-legend">
              actual: trace'den gelen gercek maliyet | estimated: statik tahmin | unsupported: maliyet verisi yok
            </p>
          </div>
        )}

        {!isLoading && providerStats.length === 0 && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.8125rem", color: "#94a3b8" }} data-testid="provider-stats-empty">
            Secilen donemde provider trace verisi yok.
          </p>
        )}
      </div>

      {/* Step Stats Table */}
      <div style={SECTION} data-testid="analytics-step-stats">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="step-stats-heading">
          Adim Bazli Istatistikler
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}>
          Pipeline adimlarinin calisma sayisi, ortalama sure ve hata dagilimi.
        </p>

        {isLoading ? (
          <p style={{ fontSize: "0.8125rem", color: "#94a3b8" }} data-testid="step-stats-loading">
            Yukleniyor...
          </p>
        ) : sortedSteps.length === 0 ? (
          <p
            style={{ fontSize: "0.8125rem", color: "#94a3b8" }}
            data-testid="step-stats-empty"
          >
            Secilen donemde adim verisi yok.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={TABLE_STYLE} data-testid="step-stats-table">
              <thead>
                <tr>
                  <th style={TH_STYLE}>Adim</th>
                  <th style={{ ...TH_STYLE, textAlign: "right" }}>Calisma</th>
                  <th style={{ ...TH_STYLE, textAlign: "right" }}>Ort. Sure</th>
                  <th style={{ ...TH_STYLE, textAlign: "right" }}>Basarisiz</th>
                </tr>
              </thead>
              <tbody>
                {sortedSteps.map((row) => (
                  <tr key={row.step_key} data-testid={`step-row-${row.step_key}`}>
                    <td style={TD_STYLE}>
                      <code style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "0.1rem 0.3rem", borderRadius: "3px" }}>
                        {row.step_key}
                      </code>
                    </td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>{fmtCount(row.count)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>{fmtSeconds(row.avg_elapsed_seconds)}</td>
                    <td
                      style={{
                        ...TD_STYLE,
                        textAlign: "right",
                        color: row.failed_count > 0 ? "#ef4444" : "#0f172a",
                      }}
                    >
                      {fmtCount(row.failed_count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Source Impact — M17-A */}
      <div style={SECTION} data-testid="analytics-source-impact">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="source-impact-heading">
          Kaynak Etkisi
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }} data-testid="source-impact-note">
          Haber kaynaklarinin uretim hattina etkisi. Kaynak bazli tarama, haber ve kullanim metrikleri.
        </p>

        <div style={METRIC_GRID}>
          <div style={METRIC_CARD} data-testid="source-metric-total">
            <p style={METRIC_LABEL}>Toplam Kaynak</p>
            <p style={METRIC_VALUE} data-testid="source-metric-total-value">
              {sourceLoading ? "\u2026" : fmtCount(sourceData?.total_sources ?? null)}
            </p>
            <p style={METRIC_NOTE}>Tanimli haber kaynaklari</p>
          </div>
          <div style={METRIC_CARD} data-testid="source-metric-active">
            <p style={METRIC_LABEL}>Aktif Kaynak</p>
            <p style={METRIC_VALUE} data-testid="source-metric-active-value">
              {sourceLoading ? "\u2026" : fmtCount(sourceData?.active_sources ?? null)}
            </p>
            <p style={METRIC_NOTE}>Durumu aktif olan kaynaklar</p>
          </div>
          <div style={METRIC_CARD} data-testid="source-metric-scans">
            <p style={METRIC_LABEL}>Toplam Tarama</p>
            <p style={METRIC_VALUE} data-testid="source-metric-scans-value">
              {sourceLoading ? "\u2026" : fmtCount(sourceData?.total_scans ?? null)}
            </p>
            <p style={METRIC_NOTE}>Gerceklestirilen taramalar</p>
          </div>
          <div style={METRIC_CARD} data-testid="source-metric-news">
            <p style={METRIC_LABEL}>Toplam Haber</p>
            <p style={METRIC_VALUE} data-testid="source-metric-news-value">
              {sourceLoading ? "\u2026" : fmtCount(sourceData?.total_news_items ?? null)}
            </p>
            <p style={METRIC_NOTE}>Toplanan haber ogeleri</p>
          </div>
          <div style={METRIC_CARD} data-testid="source-metric-used">
            <p style={METRIC_LABEL}>Kullanilan Haber</p>
            <p style={METRIC_VALUE} data-testid="source-metric-used-value">
              {sourceLoading ? "\u2026" : fmtCount(sourceData?.used_news_count ?? null)}
            </p>
            <p style={METRIC_NOTE}>Uretime alinan haberler</p>
          </div>
          <div style={METRIC_CARD} data-testid="source-metric-bulletins">
            <p style={METRIC_LABEL}>Bulletin Sayisi</p>
            <p style={METRIC_VALUE} data-testid="source-metric-bulletins-value">
              {sourceLoading ? "\u2026" : fmtCount(sourceData?.bulletin_count ?? null)}
            </p>
            <p style={METRIC_NOTE}>Olusturulan haber bultenleri</p>
          </div>
        </div>

        {/* Kaynak bazli tablo */}
        {!sourceLoading && sourceStats.length > 0 && (
          <div style={{ marginTop: "0.75rem", overflowX: "auto" }}>
            <table style={TABLE_STYLE} data-testid="source-stats-table">
              <thead>
                <tr>
                  <th style={TH_STYLE}>Kaynak</th>
                  <th style={TH_STYLE}>Tur</th>
                  <th style={TH_STYLE}>Durum</th>
                  <th style={{ ...TH_STYLE, textAlign: "right" }}>Tarama</th>
                  <th style={{ ...TH_STYLE, textAlign: "right" }}>Haber</th>
                  <th style={{ ...TH_STYLE, textAlign: "right" }}>Kullanilan</th>
                </tr>
              </thead>
              <tbody>
                {sourceStats.map((s: SourceStat) => (
                  <tr key={s.source_id} data-testid={`source-row-${s.source_id}`}>
                    <td style={TD_STYLE}>
                      <code style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "0.1rem 0.3rem", borderRadius: "3px" }}>
                        {s.source_name}
                      </code>
                    </td>
                    <td style={TD_STYLE}>{s.source_type}</td>
                    <td style={TD_STYLE}>
                      <span style={{
                        fontSize: "0.6875rem",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "3px",
                        background: s.status === "active" ? "#dcfce7" : "#f1f5f9",
                        color: s.status === "active" ? "#166534" : "#64748b",
                      }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>{fmtCount(s.scan_count)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>{fmtCount(s.news_count)}</td>
                    <td style={{ ...TD_STYLE, textAlign: "right" }}>{fmtCount(s.used_news_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!sourceLoading && sourceStats.length === 0 && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.8125rem", color: "#94a3b8" }} data-testid="source-stats-empty">
            Henuz tanimli haber kaynagi bulunmuyor.
          </p>
        )}
      </div>
    </div>
  );
}
