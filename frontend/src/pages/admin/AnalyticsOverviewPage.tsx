import { useState } from "react";
import { Link } from "react-router-dom";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { useChannelOverview } from "../../hooks/useChannelOverview";
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

export function AnalyticsOverviewPage() {
  const [window, setWindow] = useState<AnalyticsWindow>("last_30d");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // date_from/date_to varsa bunları kullan, yoksa window ile çağır
  const hasDateRange = dateFrom !== "" || dateTo !== "";
  const overviewOpts = hasDateRange
    ? {
        window,
        ...(dateFrom ? { date_from: `${dateFrom}T00:00:00` } : {}),
        ...(dateTo ? { date_to: `${dateTo}T23:59:59` } : {}),
      }
    : window;
  const { data, isLoading, isError } = useAnalyticsOverview(overviewOpts as AnalyticsWindow);
  const { data: channelData, isLoading: channelLoading } = useChannelOverview(window);

  const yt = channelData?.youtube;

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
        Raporlama zinciri: Uretim Tamamlama &rarr; Yayin Sonucu &rarr; Platform
        Metrikleri &rarr; Icerik Performansi &rarr; Operasyonel Saglik &rarr; Karar Destek Ozeti.
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
              {isLoading ? "\u2026" : fmtCount(data?.published_count)}
            </p>
            <p style={METRIC_NOTE}>Toplam basarili yayin</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-failed-publish">
            <p style={METRIC_LABEL}>Basarisiz Yayin</p>
            <p style={METRIC_VALUE} data-testid="metric-failed-publish-value">
              {isLoading ? "\u2026" : fmtCount(data?.failed_publish_count)}
            </p>
            <p style={METRIC_NOTE}>Hata ile sonuclanan yayin denemeleri</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-job-success-rate">
            <p style={METRIC_LABEL}>Is Basari Orani</p>
            <p style={METRIC_VALUE} data-testid="metric-job-success-rate-value">
              {isLoading ? "\u2026" : fmtRate(data?.job_success_rate)}
            </p>
            <p style={METRIC_NOTE}>Tamamlanan / toplam is</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-avg-duration">
            <p style={METRIC_LABEL}>Ort. Uretim Suresi</p>
            <p style={METRIC_VALUE} data-testid="metric-avg-duration-value">
              {isLoading ? "\u2026" : fmtSeconds(data?.avg_production_duration_seconds)}
            </p>
            <p style={METRIC_NOTE}>Baslangictan tamamlanmaya</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-retry-rate">
            <p style={METRIC_LABEL}>Yeniden Deneme Orani</p>
            <p style={METRIC_VALUE} data-testid="metric-retry-rate-value">
              {isLoading ? "\u2026" : fmtRate(data?.retry_rate)}
            </p>
            <p style={METRIC_NOTE}>Retry gerektiren isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-provider-error">
            <p style={METRIC_LABEL}>Provider Hata Orani</p>
            <p style={METRIC_VALUE} data-testid="ops-metric-provider-error-value">
              {"\u2014"}
            </p>
            <p style={METRIC_NOTE}>Detay icin Operasyon Metrikleri sayfasina bakiniz</p>
          </div>
        </div>
      </div>

      {/* Job Metrics (additional breakdown) */}
      <div style={SECTION} data-testid="analytics-publish-metrics">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="publish-metrics-heading">
          Is ve Yayin Detayi
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }} data-testid="publish-metrics-note">
          Is ve yayin sayilari, basari oranlari.
        </p>
        <div style={METRIC_GRID}>
          <div style={METRIC_CARD} data-testid="metric-total-jobs">
            <p style={METRIC_LABEL}>Toplam Is</p>
            <p style={METRIC_VALUE} data-testid="metric-total-jobs-value">
              {isLoading ? "\u2026" : fmtCount(data?.total_job_count)}
            </p>
            <p style={METRIC_NOTE}>Olusturulan tum isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-completed-jobs">
            <p style={METRIC_LABEL}>Tamamlanan</p>
            <p style={METRIC_VALUE} data-testid="metric-completed-jobs-value">
              {isLoading ? "\u2026" : fmtCount(data?.completed_job_count)}
            </p>
            <p style={METRIC_NOTE}>Basariyla biten isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-failed-jobs">
            <p style={METRIC_LABEL}>Basarisiz Is</p>
            <p style={METRIC_VALUE} data-testid="metric-failed-jobs-value">
              {isLoading ? "\u2026" : fmtCount(data?.failed_job_count)}
            </p>
            <p style={METRIC_NOTE}>Hata ile sonuclanan isler</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-total-publish">
            <p style={METRIC_LABEL}>Toplam Yayin Denemesi</p>
            <p style={METRIC_VALUE} data-testid="metric-total-publish-value">
              {isLoading ? "\u2026" : fmtCount(data?.total_publish_count)}
            </p>
            <p style={METRIC_NOTE}>Tum yayin kayitlari</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-publish-success-rate">
            <p style={METRIC_LABEL}>Yayin Basari Orani</p>
            <p style={METRIC_VALUE} data-testid="metric-publish-success-rate-value">
              {isLoading ? "\u2026" : fmtRate(data?.publish_success_rate)}
            </p>
            <p style={METRIC_NOTE}>Yayinlanan / toplam yayin</p>
          </div>
        </div>
      </div>

      {/* Channel Overview — M17-C */}
      <div style={SECTION} data-testid="analytics-channel-overview">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="channel-overview-heading">
          Kanal Ozeti
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }} data-testid="channel-overview-note">
          YouTube yayin kanali uzerindeki yayin durumu ve basari ozeti.
        </p>
        <div style={METRIC_GRID}>
          <div style={METRIC_CARD} data-testid="metric-yt-total-publish">
            <p style={METRIC_LABEL}>YouTube Yayin Denemesi</p>
            <p style={METRIC_VALUE} data-testid="metric-yt-total-publish-value">
              {channelLoading ? "\u2026" : fmtCount(yt?.total_publish_attempts ?? null)}
            </p>
            <p style={METRIC_NOTE}>Toplam YouTube yayin kaydi</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-yt-published">
            <p style={METRIC_LABEL}>Basarili Yayin</p>
            <p style={METRIC_VALUE} data-testid="metric-yt-published-value">
              {channelLoading ? "\u2026" : fmtCount(yt?.published_count ?? null)}
            </p>
            <p style={METRIC_NOTE}>Yayinlanan videolar</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-yt-failed">
            <p style={METRIC_LABEL}>Basarisiz Yayin</p>
            <p style={METRIC_VALUE} data-testid="metric-yt-failed-value">
              {channelLoading ? "\u2026" : fmtCount(yt?.failed_count ?? null)}
            </p>
            <p style={METRIC_NOTE}>Hata ile sonuclanan yayinlar</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-yt-success-rate">
            <p style={METRIC_LABEL}>Yayin Basari Orani</p>
            <p style={METRIC_VALUE} data-testid="metric-yt-success-rate-value">
              {channelLoading ? "\u2026" : fmtRate(yt?.publish_success_rate ?? null)}
            </p>
            <p style={METRIC_NOTE}>Basarili / toplam YouTube yayini</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-yt-in-progress">
            <p style={METRIC_LABEL}>Devam Eden</p>
            <p style={METRIC_VALUE} data-testid="metric-yt-in-progress-value">
              {channelLoading ? "\u2026" : fmtCount(yt?.in_progress_count ?? null)}
            </p>
            <p style={METRIC_NOTE}>Review/schedule/publishing asamasinda</p>
          </div>
          <div style={METRIC_CARD} data-testid="metric-yt-last-publish">
            <p style={METRIC_LABEL}>Son Yayin</p>
            <p style={{ ...METRIC_VALUE, fontSize: "0.875rem" }} data-testid="metric-yt-last-publish-value">
              {channelLoading
                ? "\u2026"
                : yt?.last_published_at
                  ? new Date(yt.last_published_at).toLocaleDateString("tr-TR")
                  : "\u2014"}
            </p>
            <p style={METRIC_NOTE}>Son basarili yayin tarihi</p>
          </div>
        </div>
        {!channelLoading && yt && !yt.has_publish_history && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.8125rem", color: "#94a3b8" }} data-testid="channel-no-history">
            Henuz YouTube uzerinde yayin gecmisi bulunmuyor.
          </p>
        )}
      </div>

      {/* Date Range Filter — M17-B */}
      <div style={SECTION} data-testid="analytics-filter-area">
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }} data-testid="filter-heading">
          Filtre ve Tarih Araligi
        </h3>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#94a3b8" }} data-testid="filter-note">
          Metrikleri belirli bir tarih araligiyla filtreleyebilirsiniz.
          Tarih araligi secildiginde zaman penceresi yerine tarih filtreleri kullanilir.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
              Baslangic Tarihi
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ padding: "0.4rem 0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", fontSize: "0.8125rem" }}
              data-testid="filter-date-start"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
              Bitis Tarihi
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ padding: "0.4rem 0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", fontSize: "0.8125rem" }}
              data-testid="filter-date-end"
            />
          </div>
          {hasDateRange && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              style={{
                padding: "0.4rem 0.75rem",
                fontSize: "0.8125rem",
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                cursor: "pointer",
                background: "#fff",
                color: "#475569",
              }}
              data-testid="filter-date-clear"
            >
              Temizle
            </button>
          )}
        </div>
        {hasDateRange && (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.6875rem", color: "#3b82f6" }} data-testid="filter-active-note">
            Tarih araligi filtresi aktif. Overview metrikleri secilen tarih araligina gore hesaplanir.
          </p>
        )}
        {!hasDateRange && (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.6875rem", color: "#cbd5e1" }} data-testid="filter-inactive-note">
            Tarih araligi secilmediginde zaman penceresi secicisi kullanilir.
          </p>
        )}
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
