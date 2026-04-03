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

const NAV_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "0.75rem",
  marginTop: "1rem",
};

const NAV_CARD: React.CSSProperties = {
  padding: "1rem 1.25rem",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  textDecoration: "none",
  color: "inherit",
  transition: "border-color 0.15s",
};

const NAV_TITLE: React.CSSProperties = {
  margin: "0 0 0.25rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#0f172a",
};

const NAV_DESC: React.CSSProperties = {
  margin: 0,
  fontSize: "0.75rem",
  color: "#64748b",
  lineHeight: 1.5,
};

export function AnalyticsOverviewPage() {
  return (
    <div>
      <h2
        style={{ margin: "0 0 0.25rem", fontSize: "1.125rem", fontWeight: 600 }}
        data-testid="analytics-overview-heading"
      >
        Analytics
      </h2>
      <p style={SUBTITLE} data-testid="analytics-overview-subtitle">
        Uretim ve yayin sonrasi performans gorunurlugu, raporlama ve karar
        destek ozetleri. Canli metrikler, operasyonel saglik ve icerik
        performansini buradan takip edebilirsiniz.
      </p>
      <p
        style={{
          margin: "0 0 0.5rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="analytics-overview-workflow-note"
      >
        Raporlama zinciri: Uretim Tamamlama → Yayin Sonucu → Platform
        Metrikleri → Icerik Performansi → Operasyonel Saglik → Karar Destek Ozeti.
      </p>
      <p
        style={{
          margin: "0 0 1.5rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
          maxWidth: "640px",
        }}
        data-testid="analytics-reporting-distinction"
      >
        Analytics canli metrikleri ve anlik durumu gosterir. Raporlama ise
        ozetleyici ve karar destekleyici gorunum saglar. Her iki alan da
        ayni veri kaynaklarindan beslenir, farkli bakis acilari sunar.
      </p>

      {/* Core Metrics — Phase 294 */}
      <div style={SECTION} data-testid="analytics-core-metrics">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="core-metrics-heading">
          Temel Metrikler
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }} data-testid="core-metrics-note">
          Uretim ve yayin surecinin ozet gostergesi. Veriler backend analytics
          modulu aktif olunca gercek degerlerle dolacaktir.
        </p>
        <div style={METRIC_GRID}>
          <div style={METRIC_CARD} data-testid="metric-publish-count">
            <p style={METRIC_LABEL}>Yayin Sayisi</p>
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Toplam basarili yayin</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-failed-publish">
            <p style={METRIC_LABEL}>Basarisiz Yayin</p>
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Hata ile sonuclanan yayin denemeleri</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-job-success-rate">
            <p style={METRIC_LABEL}>Is Basari Orani</p>
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Tamamlanan / toplam is</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-avg-duration">
            <p style={METRIC_LABEL}>Ort. Uretim Suresi</p>
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Baslangictan tamamlanmaya</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-retry-rate">
            <p style={METRIC_LABEL}>Yeniden Deneme Orani</p>
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Retry gerektiren isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-provider-error">
            <p style={METRIC_LABEL}>Provider Hata Orani</p>
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Dis servis hatalari</p>
          </div>
        </div>
      </div>

      {/* Channel Overview — Phase 296 */}
      <div style={SECTION} data-testid="analytics-channel-overview">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="channel-overview-heading">
          Kanal Ozeti
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }} data-testid="channel-overview-note">
          Platform ve kanal duzeyinde genel performans ozeti. Tek video
          performansindan farkli olarak tum yayin kanalini kapsar.
          Bu ozet, karar destek gorunumu olarak kullanilabilir.
        </p>
        <div style={METRIC_GRID}>
          <div style={METRIC_CARD} data-testid="metric-total-content">
            <p style={METRIC_LABEL}>Toplam Icerik</p>
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Uretilen tum icerikler</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-active-modules">
            <p style={METRIC_LABEL}>Aktif Moduller</p>
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>Kullanilan uretim modulleri</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-template-impact">
            <p style={METRIC_LABEL}>Sablon Etkisi</p>
            <p style={METRIC_VALUE}>—</p>
            <p style={METRIC_NOTE}>En cok kullanilan sablonlar</p>
          </div>
        </div>
      </div>

      {/* Date/Filter — Phase 297 */}
      <div style={SECTION} data-testid="analytics-filter-area">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="filter-heading">
          Filtre ve Tarih Araligi
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }} data-testid="filter-note">
          Metrikleri belirli bir tarih araligi veya modul turuyle filtreleyebilirsiniz.
          Filtreler tum metrik kartlarina ve alt sayfalara etki eder.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
              Baslangic Tarihi
            </label>
            <input
              type="date"
              disabled
              style={{
                padding: "0.4rem 0.5rem",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                fontSize: "0.8125rem",
                background: "#f8fafc",
                color: "#94a3b8",
              }}
              data-testid="filter-date-start"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
              Bitis Tarihi
            </label>
            <input
              type="date"
              disabled
              style={{
                padding: "0.4rem 0.5rem",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                fontSize: "0.8125rem",
                background: "#f8fafc",
                color: "#94a3b8",
              }}
              data-testid="filter-date-end"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
              Modul
            </label>
            <select
              disabled
              style={{
                padding: "0.4rem 0.5rem",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                fontSize: "0.8125rem",
                background: "#f8fafc",
                color: "#94a3b8",
              }}
              data-testid="filter-module-select"
            >
              <option>Tumu</option>
              <option>standard_video</option>
              <option>news_bulletin</option>
            </select>
          </div>
        </div>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.6875rem", color: "#cbd5e1" }} data-testid="filter-disabled-note">
          Filtreler analytics backend aktif olunca etkinlesecektir.
        </p>
      </div>

      {/* Analytics Sub-Pages Navigation */}
      <div data-testid="analytics-sub-nav">
        <h3
          style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 600 }}
          data-testid="analytics-sub-nav-heading"
        >
          Analytics Alanlari
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}>
          Detayli analytics gorunumlerine buradan ulasabilirsiniz.
        </p>
        <div style={NAV_GRID}>
          <Link to="/admin/analytics/content" style={NAV_CARD} data-testid="analytics-nav-content">
            <p style={NAV_TITLE}>Icerik Performansi</p>
            <p style={NAV_DESC}>Video bazinda uretim ve yayin performansini inceleyin. Kullanim ve etki ozeti.</p>
          </Link>
          <Link to="/admin/analytics/operations" style={NAV_CARD} data-testid="analytics-nav-operations">
            <p style={NAV_TITLE}>Operasyon Metrikleri</p>
            <p style={NAV_DESC}>Is basari orani, sure, retry ve provider hata detaylari. Operasyonel saglik raporu.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
