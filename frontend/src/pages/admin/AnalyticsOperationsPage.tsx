import { useState } from "react";
import { Link } from "react-router-dom";
import { useAnalyticsOperations } from "../../hooks/useAnalyticsOperations";
import type { AnalyticsWindow, StepStat } from "../../api/analyticsApi";

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
  { value: "last_7d", label: "Son 7 Gün" },
  { value: "last_30d", label: "Son 30 Gün" },
  { value: "last_90d", label: "Son 90 Gün" },
  { value: "all_time", label: "Tüm Zamanlar" },
];

function fmtSeconds(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v < 60) return `${v.toFixed(1)}s`;
  return `${(v / 60).toFixed(1)}dk`;
}

function fmtCount(v: number | null | undefined): string {
  if (v == null) return "—";
  return String(v);
}

export function AnalyticsOperationsPage() {
  const [window, setWindow] = useState<AnalyticsWindow>("last_30d");
  const { data, isLoading, isError } = useAnalyticsOperations(window);

  const stepStats: StepStat[] = data?.step_stats ?? [];
  const sortedSteps = [...stepStats].sort((a, b) => b.count - a.count);

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <Link
          to="/admin/analytics"
          style={{ fontSize: "0.875rem", color: "#3b82f6", textDecoration: "none" }}
        >
          ← Analytics'e don
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
        Operasyonel rapor zinciri: Is Basari Orani → Retry/Hata Dagilimi →
        Provider Sagligi → Kaynak Etkisi → Karar Noktasi. Yuksek retry orani
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
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Olusturulan tum isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="ops-metric-completed">
            <p style={METRIC_LABEL}>Tamamlanan</p>
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Basariyla biten isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="ops-metric-failed">
            <p style={METRIC_LABEL}>Basarisiz</p>
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Hata ile sonuclanan isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="ops-metric-avg-render">
            <p style={METRIC_LABEL}>Ort. Render Suresi</p>
            <p style={METRIC_VALUE} data-testid="ops-metric-avg-render-value">
              {isLoading ? "…" : fmtSeconds(data?.avg_render_duration_seconds)}
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
          TTS, LLM ve YouTube gibi dis servislerin hata ve basari durumu.
        </p>
        <div style={METRIC_GRID}>
          <div style={METRIC_CARD} data-testid="ops-metric-provider-calls">
            <p style={METRIC_LABEL}>Provider Cagrisi</p>
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Toplam dis servis cagrisi</p>
          </div>
          <div style={METRIC_CARD} data-testid="ops-metric-provider-errors">
            <p style={METRIC_LABEL}>Provider Hatasi</p>
            <p style={METRIC_VALUE} data-testid="ops-metric-provider-error-value">
              —
            </p>
            <p style={METRIC_NOTE}>M8-C2: henuz desteklenmiyor</p>
          </div>
        </div>
      </div>

      {/* Step Stats Table */}
      <div style={SECTION} data-testid="analytics-step-stats">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="step-stats-heading">
          Adım Bazlı İstatistikler
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}>
          Pipeline adimlarinin calisma sayisi, ortalama sure ve hata dagilimi.
        </p>

        {isLoading ? (
          <p style={{ fontSize: "0.8125rem", color: "#94a3b8" }} data-testid="step-stats-loading">
            Yukleniyor…
          </p>
        ) : sortedSteps.length === 0 ? (
          <p
            style={{ fontSize: "0.8125rem", color: "#94a3b8" }}
            data-testid="step-stats-empty"
          >
            Seçilen dönemde adım verisi yok.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={TABLE_STYLE} data-testid="step-stats-table">
              <thead>
                <tr>
                  <th style={TH_STYLE}>Adım</th>
                  <th style={{ ...TH_STYLE, textAlign: "right" }}>Çalışma</th>
                  <th style={{ ...TH_STYLE, textAlign: "right" }}>Ort. Süre</th>
                  <th style={{ ...TH_STYLE, textAlign: "right" }}>Başarısız</th>
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

      {/* Source Impact */}
      <div style={SECTION} data-testid="analytics-source-impact">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="source-impact-heading">
          Kaynak Etkisi
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }} data-testid="source-impact-note">
          Haber kaynaklarinin uretim hattina etkisi.
        </p>
        <p style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>
          <em data-testid="source-impact-deferred">Kaynak etki verileri backend entegrasyonu ile gorunecektir.</em>
        </p>
      </div>
    </div>
  );
}
