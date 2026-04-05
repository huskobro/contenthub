import { useState } from "react";
import { Link } from "react-router-dom";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import type { AnalyticsWindow } from "../../api/analyticsApi";

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

const WINDOW_OPTIONS: { value: AnalyticsWindow; label: string }[] = [
  { value: "last_7d", label: "Son 7 Gün" },
  { value: "last_30d", label: "Son 30 Gün" },
  { value: "last_90d", label: "Son 90 Gün" },
  { value: "all_time", label: "Tüm Zamanlar" },
];

function fmtRate(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function fmtSeconds(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v < 60) return `${v.toFixed(1)}s`;
  return `${(v / 60).toFixed(1)}dk`;
}

function fmtCount(v: number | null | undefined): string {
  if (v == null) return "—";
  return String(v);
}

export function AnalyticsOverviewPage() {
  const [window, setWindow] = useState<AnalyticsWindow>("last_30d");
  const { data, isLoading, isError } = useAnalyticsOverview(window);

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
        ozetleyici ve karar destekleyici gorunum saglar.
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
          data-testid="analytics-overview-error"
        >
          Metrikler yuklenemedi. Backend baglantisi kontrol edilsin.
        </p>
      )}

      {/* Core Metrics */}
      <div style={SECTION} data-testid="analytics-core-metrics">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="core-metrics-heading">
          Temel Metrikler
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }} data-testid="core-metrics-note">
          Uretim ve yayin surecinin ozet gostergesi. Veriler backend analytics
          modulu uzerinden gercek zamanli guncellenir.
        </p>
        <div style={METRIC_GRID}>
          <div style={METRIC_CARD} data-testid="metric-publish-count">
            <p style={METRIC_LABEL}>Yayin Sayisi</p>
            <p style={METRIC_VALUE} data-testid="metric-publish-count-value">
              {isLoading ? "…" : fmtCount(data?.published_count)}
            </p>
            <p style={METRIC_NOTE}>Toplam basarili yayin</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-failed-publish">
            <p style={METRIC_LABEL}>Basarisiz Yayin</p>
            <p style={METRIC_VALUE} data-testid="metric-failed-publish-value">
              {isLoading ? "…" : fmtCount(data?.failed_publish_count)}
            </p>
            <p style={METRIC_NOTE}>Hata ile sonuclanan yayin denemeleri</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-job-success-rate">
            <p style={METRIC_LABEL}>Is Basari Orani</p>
            <p style={METRIC_VALUE} data-testid="metric-job-success-rate-value">
              {isLoading ? "…" : fmtRate(data?.job_success_rate)}
            </p>
            <p style={METRIC_NOTE}>Tamamlanan / toplam is</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-avg-duration">
            <p style={METRIC_LABEL}>Ort. Uretim Suresi</p>
            <p style={METRIC_VALUE} data-testid="metric-avg-duration-value">
              {isLoading ? "…" : fmtSeconds(data?.avg_production_duration_seconds)}
            </p>
            <p style={METRIC_NOTE}>Baslangictan tamamlanmaya</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-retry-rate">
            <p style={METRIC_LABEL}>Yeniden Deneme Orani</p>
            <p style={METRIC_VALUE} data-testid="metric-retry-rate-value">
              {isLoading ? "…" : fmtRate(data?.retry_rate)}
            </p>
            <p style={METRIC_NOTE}>Retry gerektiren isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-provider-error">
            <p style={METRIC_LABEL}>Provider Hata Orani</p>
            <p style={METRIC_VALUE} data-testid="ops-metric-provider-error-value">
              —
            </p>
            <p style={METRIC_NOTE}>Detay icin Operasyon Metrikleri sayfasina bakiniz</p>
          </div>
        </div>
      </div>

      {/* Job Metrics (additional breakdown) */}
      <div style={SECTION} data-testid="analytics-publish-metrics">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="publish-metrics-heading">
          İş ve Yayın Detayı
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }} data-testid="publish-metrics-note">
          Is ve yayin sayilari, basari oranlari.
        </p>
        <div style={METRIC_GRID}>
          <div style={METRIC_CARD} data-testid="metric-total-jobs">
            <p style={METRIC_LABEL}>Toplam İş</p>
            <p style={METRIC_VALUE} data-testid="metric-total-jobs-value">
              {isLoading ? "…" : fmtCount(data?.total_job_count)}
            </p>
            <p style={METRIC_NOTE}>Olusturulan tum isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-completed-jobs">
            <p style={METRIC_LABEL}>Tamamlanan</p>
            <p style={METRIC_VALUE} data-testid="metric-completed-jobs-value">
              {isLoading ? "…" : fmtCount(data?.completed_job_count)}
            </p>
            <p style={METRIC_NOTE}>Basariyla biten isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-failed-jobs">
            <p style={METRIC_LABEL}>Başarısız İş</p>
            <p style={METRIC_VALUE} data-testid="metric-failed-jobs-value">
              {isLoading ? "…" : fmtCount(data?.failed_job_count)}
            </p>
            <p style={METRIC_NOTE}>Hata ile sonuclanan isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-total-publish">
            <p style={METRIC_LABEL}>Toplam Yayın Denemesi</p>
            <p style={METRIC_VALUE} data-testid="metric-total-publish-value">
              {isLoading ? "…" : fmtCount(data?.total_publish_count)}
            </p>
            <p style={METRIC_NOTE}>Tum yayin kayitlari</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-publish-success-rate">
            <p style={METRIC_LABEL}>Yayın Başarı Oranı</p>
            <p style={METRIC_VALUE} data-testid="metric-publish-success-rate-value">
              {isLoading ? "…" : fmtRate(data?.publish_success_rate)}
            </p>
            <p style={METRIC_NOTE}>Yayinlanan / toplam yayin</p>
          </div>
        </div>
      </div>

      {/* Channel Overview */}
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
            <p style={{ ...METRIC_VALUE, color: "#94a3b8" }}>—</p>
            <p style={METRIC_NOTE}>Veri kaynagi yok — backend content_count metrigi henuz mevcut degil</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-active-modules">
            <p style={METRIC_LABEL}>Aktif Moduller</p>
            <p style={{ ...METRIC_VALUE, color: "#94a3b8" }}>—</p>
            <p style={METRIC_NOTE}>Veri kaynagi yok — modul kullanim metrigi henuz mevcut degil</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-template-impact">
            <p style={METRIC_LABEL}>Sablon Etkisi</p>
            <p style={{ ...METRIC_VALUE, color: "#94a3b8" }}>—</p>
            <p style={METRIC_NOTE}>Veri kaynagi yok — sablon etki metrigi henuz mevcut degil</p>
          </div>
        </div>
      </div>

      {/* Date/Filter */}
      <div style={SECTION} data-testid="analytics-filter-area">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="filter-heading">
          Filtre ve Tarih Araligi
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }} data-testid="filter-note">
          Metrikleri belirli bir tarih araligi veya modul turuyle filtreleyebilirsiniz.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
              Baslangic Tarihi
            </label>
            <input
              type="date"
              disabled
              style={{ padding: "0.4rem 0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", fontSize: "0.8125rem", background: "#f8fafc", color: "#94a3b8" }}
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
              style={{ padding: "0.4rem 0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", fontSize: "0.8125rem", background: "#f8fafc", color: "#94a3b8" }}
              data-testid="filter-date-end"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
              Modul
            </label>
            <select
              disabled
              style={{ padding: "0.4rem 0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", fontSize: "0.8125rem", background: "#f8fafc", color: "#94a3b8" }}
              data-testid="filter-module-select"
            >
              <option>Tumu</option>
              <option>standard_video</option>
              <option>news_bulletin</option>
            </select>
          </div>
        </div>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.6875rem", color: "#cbd5e1" }} data-testid="filter-disabled-note">
          Tarih araligi ve modul filtreleri backend entegrasyonu tamamlaninca aktif olacaktir. Zaman penceresi secici yukarda aktiftir.
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
