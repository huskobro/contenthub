import { Link } from "react-router-dom";

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

export function AnalyticsOperationsPage() {
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
        Is basari orani, uretim suresi, yeniden deneme ve provider hata
        detaylarini buradan inceleyebilirsiniz.
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
        Operasyon metrikleri, uretim hattinin sagligini gosterir. Yuksek retry
        orani veya provider hata orani sistemde dikkat gerektiren alanlari isaret eder.
      </p>

      {/* Job Performance */}
      <div style={SECTION} data-testid="analytics-job-performance">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="job-performance-heading">
          Is Performansi
        </h3>
        <p
          style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}
          data-testid="job-performance-note"
        >
          Uretim islerinin basari, sure ve hata dagilimi. Backend analytics
          modulu aktif olunca gercek degerlerle dolacaktir.
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
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Render adimi ortalamasi</p>
          </div>
        </div>
      </div>

      {/* Provider Health */}
      <div style={SECTION} data-testid="analytics-provider-health">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="provider-health-heading">
          Provider Sagligi
        </h3>
        <p
          style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}
          data-testid="provider-health-note"
        >
          TTS, LLM ve YouTube gibi dis servislerin hata ve basari durumu.
          Provider bazli sorunlari buradan tespit edebilirsiniz.
        </p>
        <div style={METRIC_GRID}>
          <div style={METRIC_CARD} data-testid="ops-metric-provider-calls">
            <p style={METRIC_LABEL}>Provider Cagrisi</p>
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Toplam dis servis cagrisi</p>
          </div>
          <div style={METRIC_CARD} data-testid="ops-metric-provider-errors">
            <p style={METRIC_LABEL}>Provider Hatasi</p>
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Basarisiz dis servis cagrilari</p>
          </div>
        </div>
      </div>

      {/* Source Impact */}
      <div style={SECTION} data-testid="analytics-source-impact">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="source-impact-heading">
          Kaynak Etkisi
        </h3>
        <p
          style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}
          data-testid="source-impact-note"
        >
          Haber kaynaklarinin uretim hattina etkisi. Hangi kaynak daha verimli,
          hangisinde daha fazla sorun var gorunur.
        </p>
        <p style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>
          <em>Kaynak etki verileri analytics backend aktif olunca gorunecektir.</em>
        </p>
      </div>
    </div>
  );
}
