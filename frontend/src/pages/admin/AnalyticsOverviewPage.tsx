import { useState } from "react";
import { Link } from "react-router-dom";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { useChannelOverview } from "../../hooks/useChannelOverview";
import type { AnalyticsWindow } from "../../api/analyticsApi";
import { colors, spacing, typography } from "../../components/design-system/tokens";
import {
  PageShell,
  SectionShell,
  MetricTile,
  MetricGrid,
  WindowSelector,
  FilterBar,
  FilterInput,
  ActionButton,
} from "../../components/design-system/primitives";

/* ------------------------------------------------------------------ */
/* Formatters                                                         */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const WINDOW_OPTIONS: { value: AnalyticsWindow; label: string }[] = [
  { value: "last_7d", label: "Son 7 Gun" },
  { value: "last_30d", label: "Son 30 Gun" },
  { value: "last_90d", label: "Son 90 Gun" },
  { value: "all_time", label: "Tum Zamanlar" },
];

const NAV_CARD: React.CSSProperties = {
  display: "block",
  padding: `${spacing[4]} ${spacing[5]}`,
  background: colors.surface.card,
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: "8px",
  textDecoration: "none",
  color: "inherit",
  transition: "border-color 180ms ease",
};

const NAV_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: spacing[4],
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function AnalyticsOverviewPage() {
  const [window, setWindow] = useState<AnalyticsWindow>("last_30d");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

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
    <PageShell
      title="Analytics"
      subtitle="Uretim ve yayin sonrasi performans gorunurlugu, raporlama ve karar destek ozetleri. Canli metrikler, operasyonel saglik ve icerik performansini buradan takip edebilirsiniz."
      testId="analytics-overview"
    >
      <p
        style={{
          margin: `0 0 ${spacing[2]}`,
          fontSize: typography.size.base,
          color: colors.neutral[500],
          lineHeight: typography.lineHeight.normal,
          maxWidth: "640px",
        }}
        data-testid="analytics-overview-workflow-note"
      >
        Raporlama zinciri: Uretim Tamamlama &rarr; Yayin Sonucu &rarr; Platform
        Metrikleri &rarr; Icerik Performansi &rarr; Operasyonel Saglik &rarr; Karar Destek Ozeti.
      </p>
      <p
        style={{
          margin: `0 0 ${spacing[6]}`,
          fontSize: typography.size.base,
          color: colors.neutral[500],
          lineHeight: typography.lineHeight.normal,
          maxWidth: "640px",
        }}
        data-testid="analytics-reporting-distinction"
      >
        Analytics canli metrikleri ve anlik durumu gosterir. Raporlama ise
        ozetleyici ve karar destekleyici gorunum saglar.
      </p>

      {/* Window Selector */}
      <div style={{ marginBottom: spacing[4] }}>
        <WindowSelector
          options={WINDOW_OPTIONS}
          value={window}
          onChange={setWindow}
          testId="analytics-window-selector"
          buttonTestIdPrefix="window-btn-"
        />
      </div>

      {/* Date Range Filter */}
      <SectionShell
        title="Filtre ve Tarih Araligi"
        description="Metrikleri belirli bir tarih araligiyla filtreleyebilirsiniz. Tarih araligi secildiginde zaman penceresi yerine tarih filtreleri kullanilir."
        testId="analytics-filter-area"
      >
        <div data-testid="filter-heading" style={{ display: "none" }}>Filtre ve Tarih Araligi</div>
        <div data-testid="filter-note" style={{ display: "none" }}>Metrikleri belirli bir tarih araligiyla filtreleyebilirsiniz.</div>
        <FilterBar>
          <div>
            <label style={{ display: "block", fontSize: typography.size.sm, color: colors.neutral[600], marginBottom: spacing[1] }}>
              Baslangic Tarihi
            </label>
            <FilterInput
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              data-testid="filter-date-start"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: typography.size.sm, color: colors.neutral[600], marginBottom: spacing[1] }}>
              Bitis Tarihi
            </label>
            <FilterInput
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              data-testid="filter-date-end"
            />
          </div>
          {hasDateRange && (
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              data-testid="filter-date-clear"
            >
              Temizle
            </ActionButton>
          )}
        </FilterBar>
        {hasDateRange && (
          <p style={{ margin: 0, fontSize: typography.size.xs, color: colors.brand[600] }} data-testid="filter-active-note">
            Tarih araligi filtresi aktif. Overview metrikleri secilen tarih araligina gore hesaplanir.
          </p>
        )}
        {!hasDateRange && (
          <p style={{ margin: 0, fontSize: typography.size.xs, color: colors.neutral[400] }} data-testid="filter-inactive-note">
            Tarih araligi secilmediginde zaman penceresi secicisi kullanilir.
          </p>
        )}
      </SectionShell>

      {isError && (
        <p
          style={{ color: colors.error.base, fontSize: typography.size.md, marginBottom: spacing[4] }}
          data-testid="analytics-overview-error"
        >
          Metrikler yuklenemedi. Backend baglantisi kontrol edilsin.
        </p>
      )}

      {/* Core Metrics */}
      <SectionShell
        title="Temel Metrikler"
        description="Uretim ve yayin surecinin ozet gostergesi. Veriler backend analytics modulu uzerinden gercek zamanli guncellenir."
        testId="analytics-core-metrics"
      >
        <div data-testid="core-metrics-heading" style={{ display: "none" }}>Temel Metrikler</div>
        <div data-testid="core-metrics-note" style={{ display: "none" }}>Uretim ve yayin surecinin ozet gostergesi. Veriler backend analytics modulu uzerinden gercek zamanli guncellenir.</div>
        <MetricGrid>
          <MetricTile
            label="Yayin Sayisi"
            value={fmtCount(data?.published_count)}
            note="Toplam basarili yayin"
            loading={isLoading}
            testId="metric-publish-count"
          />
          <MetricTile
            label="Basarisiz Yayin"
            value={fmtCount(data?.failed_publish_count)}
            note="Hata ile sonuclanan yayin denemeleri"
            loading={isLoading}
            testId="metric-failed-publish"
          />
          <MetricTile
            label="Is Basari Orani"
            value={fmtRate(data?.job_success_rate)}
            note="Tamamlanan / toplam is"
            loading={isLoading}
            testId="metric-job-success-rate"
          />
          <MetricTile
            label="Ort. Uretim Suresi"
            value={fmtSeconds(data?.avg_production_duration_seconds)}
            note="Baslangictan tamamlanmaya"
            loading={isLoading}
            testId="metric-avg-duration"
          />
          <MetricTile
            label="Yeniden Deneme Orani"
            value={fmtRate(data?.retry_rate)}
            note="Retry gerektiren isler"
            loading={isLoading}
            testId="metric-retry-rate"
          />
          <MetricTile
            label="Provider Hata Orani"
            value={"\u2014"}
            note="Detay icin Operasyon Metrikleri sayfasina bakiniz"
            testId="metric-provider-error"
          />
        </MetricGrid>
      </SectionShell>

      {/* Job & Publish Detail */}
      <SectionShell
        title="Is ve Yayin Detayi"
        description="Is ve yayin sayilari, basari oranlari."
        testId="analytics-publish-metrics"
      >
        <div data-testid="publish-metrics-heading" style={{ display: "none" }} />
        <div data-testid="publish-metrics-note" style={{ display: "none" }} />
        <MetricGrid>
          <MetricTile
            label="Toplam Is"
            value={fmtCount(data?.total_job_count)}
            note="Olusturulan tum isler"
            loading={isLoading}
            testId="metric-total-jobs"
          />
          <MetricTile
            label="Tamamlanan"
            value={fmtCount(data?.completed_job_count)}
            note="Basariyla biten isler"
            loading={isLoading}
            testId="metric-completed-jobs"
          />
          <MetricTile
            label="Basarisiz Is"
            value={fmtCount(data?.failed_job_count)}
            note="Hata ile sonuclanan isler"
            loading={isLoading}
            testId="metric-failed-jobs"
          />
          <MetricTile
            label="Toplam Yayin Denemesi"
            value={fmtCount(data?.total_publish_count)}
            note="Tum yayin kayitlari"
            loading={isLoading}
            testId="metric-total-publish"
          />
          <MetricTile
            label="Yayin Basari Orani"
            value={fmtRate(data?.publish_success_rate)}
            note="Yayinlanan / toplam yayin"
            loading={isLoading}
            testId="metric-publish-success-rate"
          />
        </MetricGrid>
      </SectionShell>

      {/* Channel Overview */}
      <SectionShell
        title="Kanal Ozeti"
        description="YouTube yayin kanali uzerindeki yayin durumu ve basari ozeti."
        testId="analytics-channel-overview"
      >
        <div data-testid="channel-overview-heading" style={{ display: "none" }}>Kanal Ozeti</div>
        <div data-testid="channel-overview-note" style={{ display: "none" }}>YouTube yayin kanali uzerindeki yayin durumu ve basari ozeti.</div>
        <MetricGrid>
          <MetricTile
            label="YouTube Yayin Denemesi"
            value={fmtCount(yt?.total_publish_attempts ?? null)}
            note="Toplam YouTube yayin kaydi"
            loading={channelLoading}
            testId="metric-yt-total-publish"
          />
          <MetricTile
            label="Basarili Yayin"
            value={fmtCount(yt?.published_count ?? null)}
            note="Yayinlanan videolar"
            loading={channelLoading}
            testId="metric-yt-published"
          />
          <MetricTile
            label="Basarisiz Yayin"
            value={fmtCount(yt?.failed_count ?? null)}
            note="Hata ile sonuclanan yayinlar"
            loading={channelLoading}
            testId="metric-yt-failed"
          />
          <MetricTile
            label="Yayin Basari Orani"
            value={fmtRate(yt?.publish_success_rate ?? null)}
            note="Basarili / toplam YouTube yayini"
            loading={channelLoading}
            testId="metric-yt-success-rate"
          />
          <MetricTile
            label="Devam Eden"
            value={fmtCount(yt?.in_progress_count ?? null)}
            note="Review/schedule/publishing asamasinda"
            loading={channelLoading}
            testId="metric-yt-in-progress"
          />
          <MetricTile
            label="Son Yayin"
            value={
              channelLoading
                ? "\u2026"
                : yt?.last_published_at
                  ? new Date(yt.last_published_at).toLocaleDateString("tr-TR")
                  : "\u2014"
            }
            note="Son basarili yayin tarihi"
            loading={channelLoading}
            testId="metric-yt-last-publish"
          />
        </MetricGrid>
        {!channelLoading && yt && !yt.has_publish_history && (
          <p style={{ marginTop: spacing[3], fontSize: typography.size.base, color: colors.neutral[500] }} data-testid="channel-no-history">
            Henuz YouTube uzerinde yayin gecmisi bulunmuyor.
          </p>
        )}
      </SectionShell>

      {/* Analytics Sub-Pages Navigation */}
      <SectionShell
        title="Analytics Alanlari"
        description="Detayli analytics gorunumlerine buradan ulasabilirsiniz."
        testId="analytics-sub-nav"
      >
        <div data-testid="analytics-sub-nav-heading" style={{ display: "none" }}>Analytics Alanlari</div>
        <div style={NAV_GRID}>
          <Link to="/admin/analytics/content" style={NAV_CARD} data-testid="analytics-nav-content">
            <p style={{ margin: 0, fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.neutral[900], marginBottom: spacing[1] }}>
              Icerik Performansi
            </p>
            <p style={{ margin: 0, fontSize: typography.size.sm, color: colors.neutral[600], lineHeight: typography.lineHeight.normal }}>
              Video bazinda uretim ve yayin performansini inceleyin. Kullanim ve etki ozeti.
            </p>
          </Link>
          <Link to="/admin/analytics/operations" style={NAV_CARD} data-testid="analytics-nav-operations">
            <p style={{ margin: 0, fontSize: typography.size.md, fontWeight: typography.weight.semibold, color: colors.neutral[900], marginBottom: spacing[1] }}>
              Operasyon Metrikleri
            </p>
            <p style={{ margin: 0, fontSize: typography.size.sm, color: colors.neutral[600], lineHeight: typography.lineHeight.normal }}>
              Is basari orani, sure, retry ve provider hata detaylari. Operasyonel saglik raporu.
            </p>
          </Link>
        </div>
      </SectionShell>
    </PageShell>
  );
}
