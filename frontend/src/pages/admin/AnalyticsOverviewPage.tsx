import { Link } from "react-router-dom";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { useChannelOverview } from "../../hooks/useChannelOverview";
import { useAnalyticsFilters } from "../../hooks/useAnalyticsFilters";
import type { AnalyticsWindow } from "../../api/analyticsApi";
import {
  PageShell,
  SectionShell,
  MetricTile,
  MetricGrid,
} from "../../components/design-system/primitives";
import { AdminAnalyticsFilterBar } from "../../components/analytics/AdminAnalyticsFilterBar";
import { ExportButton } from "../../components/analytics/ExportButton";
import { SnapshotLockDisclaimer } from "../../components/analytics/SnapshotLockDisclaimer";
import { formatDateShort } from "../../lib/formatDate";

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
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function AnalyticsOverviewPage() {
  const analyticsFilters = useAnalyticsFilters("last_30d");
  const { filters, apiParams } = analyticsFilters;

  const overviewOpts = (filters.dateFrom || filters.dateTo)
    ? {
        window: filters.window,
        ...(filters.dateFrom ? { date_from: `${filters.dateFrom}T00:00:00` } : {}),
        ...(filters.dateTo ? { date_to: `${filters.dateTo}T23:59:59` } : {}),
      }
    : filters.window;
  const { data, isLoading, isError } = useAnalyticsOverview(overviewOpts as AnalyticsWindow);
  const { data: channelData, isLoading: channelLoading } = useChannelOverview(filters.window);

  const yt = channelData?.youtube;

  return (
    <PageShell
      title="Analytics"
      subtitle="Canli metrikler, operasyonel saglik ve icerik performansi."
      testId="analytics-overview"
      actions={<ExportButton kind="overview" params={apiParams} />}
    >
      <p className="m-0 mb-2 text-xs text-neutral-400" data-testid="analytics-overview-workflow-note">
        Uretim &rarr; Yayin &rarr; Platform Metrikleri &rarr; Icerik Performansi &rarr; Operasyonel Saglik
      </p>
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="analytics-reporting-distinction">
        Analytics canli metrikleri gosterir. Raporlama karar destekleyici gorunum saglar.
      </p>

      {/* Shared Filter Bar */}
      <AdminAnalyticsFilterBar analyticsFilters={analyticsFilters} testId="analytics-overview-filter-bar" />

      <SnapshotLockDisclaimer />

      {isError && (
        <div className="flex flex-col items-center py-8 gap-2 mb-4" data-testid="analytics-overview-error">
          <span className="text-error-base text-2xl">⚠</span>
          <p className="text-error-base text-md m-0">Metrikler yuklenemedi. Backend baglantisi kontrol edilsin.</p>
        </div>
      )}

      {/* Core Metrics */}
      <SectionShell title="Temel Metrikler" testId="analytics-core-metrics">
        <div data-testid="core-metrics-heading" className="hidden">Temel Metrikler</div>
        <div data-testid="core-metrics-note" className="hidden">Uretim ve yayin surecinin ozet gostergesi.</div>
        <MetricGrid>
          <MetricTile label="Yayin Sayisi" value={fmtCount(data?.published_count)} note="Toplam basarili yayin" loading={isLoading} testId="metric-publish-count" />
          <MetricTile label="Basarisiz Yayin" value={fmtCount(data?.failed_publish_count)} note="Hata ile sonuclanan yayin denemeleri" loading={isLoading} testId="metric-failed-publish" />
          <MetricTile label="Is Basari Orani" value={fmtRate(data?.job_success_rate)} note="Tamamlanan / toplam is" loading={isLoading} testId="metric-job-success-rate" />
          <MetricTile label="Ort. Uretim Suresi" value={fmtSeconds(data?.avg_production_duration_seconds)} note="Baslangictan tamamlanmaya" loading={isLoading} testId="metric-avg-duration" />
          <MetricTile label="Yeniden Deneme Orani" value={fmtRate(data?.retry_rate)} note="Retry gerektiren isler" loading={isLoading} testId="metric-retry-rate" />
          <MetricTile label="Provider Hata Orani" value={"\u2014"} note="Detay icin Operasyon Metrikleri sayfasina bakiniz" testId="metric-provider-error" />
        </MetricGrid>
      </SectionShell>

      {/* Job & Publish Detail */}
      <SectionShell title="Is ve Yayin Detay&#305;"  testId="analytics-publish-metrics">
        <div data-testid="publish-metrics-heading" className="hidden" />
        <div data-testid="publish-metrics-note" className="hidden" />
        <MetricGrid>
          <MetricTile label="Toplam Is" value={fmtCount(data?.total_job_count)} note="Olusturulan tum isler" loading={isLoading} testId="metric-total-jobs" />
          <MetricTile label="Tamamlanan" value={fmtCount(data?.completed_job_count)} note="Basariyla biten isler" loading={isLoading} testId="metric-completed-jobs" />
          <MetricTile label="Basarisiz Is" value={fmtCount(data?.failed_job_count)} note="Hata ile sonuclanan isler" loading={isLoading} testId="metric-failed-jobs" />
          <MetricTile label="Toplam Yayin Denemesi" value={fmtCount(data?.total_publish_count)} note="Tum yayin kayitlari" loading={isLoading} testId="metric-total-publish" />
          <MetricTile label="Yayin Basari Orani" value={fmtRate(data?.publish_success_rate)} note="Yayinlanan / toplam yayin" loading={isLoading} testId="metric-publish-success-rate" />
        </MetricGrid>
      </SectionShell>

      {/* Publish Queue / Review Funnel */}
      <SectionShell title="Yayin Kuyrugu" testId="analytics-publish-queue">
        <div data-testid="publish-queue-heading" className="hidden">Yayin Kuyrugu</div>
        <div data-testid="publish-queue-note" className="hidden">Operator dikkatini gerektiren yayin kayitlari.</div>
        <MetricGrid>
          <MetricTile
            label="Inceleme Bekliyor"
            value={fmtCount(data?.review_pending_count)}
            note="Onay icin bekleyen yayin kayitlari"
            loading={isLoading}
            testId="metric-review-pending"
            accentColor="var(--ch-warning-base)"
          />
          <MetricTile
            label="Yayina Hazir"
            value={fmtCount(data?.publish_backlog_count)}
            note="Onaylandi / planlandi, henuz yayinlanmadi"
            loading={isLoading}
            testId="metric-publish-backlog"
            accentColor="var(--ch-info-base)"
          />
          <MetricTile
            label="Bu Donemde Reddedilen"
            value={fmtCount(data?.review_rejected_count)}
            note="Secilen pencerede review reddedildi"
            loading={isLoading}
            testId="metric-review-rejected"
            accentColor="var(--ch-error-base)"
          />
        </MetricGrid>
      </SectionShell>

      {/* Channel Overview */}
      <SectionShell title="Kanal Ozeti"  testId="analytics-channel-overview">
        <div data-testid="channel-overview-heading" className="hidden">Kanal Ozeti</div>
        <div data-testid="channel-overview-note" className="hidden">YouTube yayin kanali uzerindeki yayin durumu ve basari ozeti.</div>
        <MetricGrid>
          <MetricTile label="YouTube Yayin Denemesi" value={fmtCount(yt?.total_publish_attempts ?? null)} note="Toplam YouTube yayin kaydi" loading={channelLoading} testId="metric-yt-total-publish" />
          <MetricTile label="Basarili Yayin" value={fmtCount(yt?.published_count ?? null)} note="Yayinlanan videolar" loading={channelLoading} testId="metric-yt-published" />
          <MetricTile label="Basarisiz Yayin" value={fmtCount(yt?.failed_count ?? null)} note="Hata ile sonuclanan yayinlar" loading={channelLoading} testId="metric-yt-failed" />
          <MetricTile label="Yayin Basari Orani" value={fmtRate(yt?.publish_success_rate ?? null)} note="Basarili / toplam YouTube yayini" loading={channelLoading} testId="metric-yt-success-rate" />
          <MetricTile label="Devam Eden" value={fmtCount(yt?.in_progress_count ?? null)} note="Review/schedule/publishing asamasinda" loading={channelLoading} testId="metric-yt-in-progress" />
          <MetricTile
            label="Son Yayin"
            value={channelLoading ? "\u2026" : formatDateShort(yt?.last_published_at, "\u2014")}
            note="Son basarili yayin tarihi"
            loading={channelLoading}
            testId="metric-yt-last-publish"
          />
        </MetricGrid>
        {!channelLoading && yt && !yt.has_publish_history && (
          <p className="mt-3 text-base text-neutral-500" data-testid="channel-no-history">
            Hen&uuml;z YouTube uzerinde yayin gecmisi bulunmuyor.
          </p>
        )}
      </SectionShell>

      {/* Analytics Sub-Pages Navigation */}
      <SectionShell title="Analytics Alanlari"  testId="analytics-sub-nav">
        <div data-testid="analytics-sub-nav-heading" className="hidden">Analytics Alanlari</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          <Link to="/admin/analytics/content" className="block py-4 px-5 bg-surface-card border border-border-subtle rounded-lg no-underline text-inherit transition-colors duration-normal hover:border-brand-300" data-testid="analytics-nav-content">
            <p className="m-0 text-md font-semibold text-neutral-900 mb-1">Icerik Performansi</p>
            <p className="m-0 text-sm text-neutral-600 leading-normal">Video bazinda uretim ve yayin performansini inceleyin. Kullanim ve etki ozeti.</p>
          </Link>
          <Link to="/admin/analytics/operations" className="block py-4 px-5 bg-surface-card border border-border-subtle rounded-lg no-underline text-inherit transition-colors duration-normal hover:border-brand-300" data-testid="analytics-nav-operations">
            <p className="m-0 text-md font-semibold text-neutral-900 mb-1">Operasyon Metrikleri</p>
            <p className="m-0 text-sm text-neutral-600 leading-normal">Is basari orani, sure, retry ve provider hata detaylari. Operasyonel saglik raporu.</p>
          </Link>
          <Link to="/admin/analytics/publish" className="block py-4 px-5 bg-surface-card border border-border-subtle rounded-lg no-underline text-inherit transition-colors duration-normal hover:border-brand-300" data-testid="analytics-nav-publish">
            <p className="m-0 text-md font-semibold text-neutral-900 mb-1">Yayin Analytics</p>
            <p className="m-0 text-sm text-neutral-600 leading-normal">Yayin sureci, platform kirilimi, basari/basarisizlik trendi ve hunisi.</p>
          </Link>
        </div>
      </SectionShell>
    </PageShell>
  );
}
