/**
 * PublishAnalyticsPage — Faz 6.
 *
 * Dedicated publish analytics: status funnel, platform breakdown,
 * publish trends, and entity-level filtering.
 */

import { Link } from "react-router-dom";
import { useAnalyticsFilters } from "../../hooks/useAnalyticsFilters";
import { usePublishAnalytics } from "../../hooks/usePublishAnalytics";
import {
  PageShell,
  SectionShell,
  MetricTile,
  MetricGrid,
} from "../../components/design-system/primitives";
import { AdminAnalyticsFilterBar } from "../../components/analytics/AdminAnalyticsFilterBar";
import { TrendChart } from "../../components/shared/charts/TrendChart";
import { ComparisonBar } from "../../components/shared/charts/ComparisonBar";
import { DistributionDonut } from "../../components/shared/charts/DistributionDonut";

/* ------------------------------------------------------------------ */
/* Formatters                                                         */
/* ------------------------------------------------------------------ */

function fmtRate(v: number | null | undefined): string {
  if (v == null) return "\u2014";
  return `${(v * 100).toFixed(1)}%`;
}

function fmtCount(v: number | null | undefined): string {
  if (v == null) return "\u2014";
  return String(v);
}

function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "\u2014";
  if (seconds < 60) return `${Math.round(seconds)}sn`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}dk ${Math.round(seconds % 60)}sn`;
  return `${Math.floor(seconds / 3600)}sa ${Math.floor((seconds % 3600) / 60)}dk`;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function PublishAnalyticsPage() {
  const analyticsFilters = useAnalyticsFilters("all_time");
  const { data, isLoading, isError } = usePublishAnalytics(analyticsFilters.apiParams);

  // Status funnel donut
  const statusDonutData = data
    ? [
        { name: "Yayinlandi", value: data.published_count },
        { name: "Basarisiz", value: data.failed_count },
        { name: "Taslak", value: data.draft_count },
        { name: "Incelemede", value: data.in_review_count },
        { name: "Planli", value: data.scheduled_count },
      ].filter((d) => d.value > 0)
    : [];

  // Platform breakdown for bar chart
  const platformBarData = (data?.platform_breakdown ?? []).map((p) => ({
    name: p.platform === "youtube" ? "YouTube" : p.platform,
    published: p.published,
    failed: p.failed,
  }));

  // Daily trend
  const trendData = (data?.daily_publish_trend ?? []).map((d) => ({
    ...d,
    dateLabel: d.date.slice(5),
  }));

  return (
    <PageShell
      title="Yayin Analytics"
      subtitle="Yayin sureci, platform kirilimi ve basari durumu."
      breadcrumb={[
        { label: "Analytics", to: "/admin/analytics" },
        { label: "Yayin Analytics" },
      ]}
      testId="analytics-publish"
    >
      <Link
        to="/admin/analytics"
        className="inline-block mb-3 text-sm text-brand-600 no-underline"
      >
        &larr; Analytics'e don
      </Link>

      {/* Filter Bar */}
      <AdminAnalyticsFilterBar analyticsFilters={analyticsFilters} testId="publish-filter-bar" />

      {isError && (
        <div className="flex flex-col items-center py-8 gap-2 mb-4" data-testid="publish-analytics-error">
          <span className="text-error-base text-2xl">&#9888;</span>
          <p className="text-error-base text-md m-0">Yayin metrikleri yuklenemedi.</p>
        </div>
      )}

      {/* KPI Summary */}
      <SectionShell title="Yayin Ozeti" testId="publish-summary">
        <MetricGrid>
          <MetricTile
            label="Toplam Yayin"
            value={fmtCount(data?.total_publish_count)}
            note="Tum yayin kayitlari"
            loading={isLoading}
            testId="pub-metric-total"
          />
          <MetricTile
            label="Yayinlandi"
            value={fmtCount(data?.published_count)}
            note="Basariyla yayinlanan"
            loading={isLoading}
            testId="pub-metric-published"
            accentColor="var(--ch-success-base)"
          />
          <MetricTile
            label="Basarisiz"
            value={fmtCount(data?.failed_count)}
            note="Hata ile sonuclanan"
            loading={isLoading}
            testId="pub-metric-failed"
            accentColor="var(--ch-error)"
          />
          <MetricTile
            label="Basari Orani"
            value={fmtRate(data?.publish_success_rate)}
            note="Yayinlanan / toplam"
            loading={isLoading}
            testId="pub-metric-rate"
            accentColor="var(--ch-success-base)"
          />
          <MetricTile
            label="Ort. Yayina Kadar"
            value={fmtDuration(data?.avg_time_to_publish_seconds)}
            note="Is olusturma -> yayin"
            loading={isLoading}
            testId="pub-metric-avg-time"
          />
        </MetricGrid>
      </SectionShell>

      {/* Status Funnel + Platform */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SectionShell title="Yayin Durumu Dagilimi" testId="publish-status-funnel">
          {isLoading ? (
            <p className="text-sm text-neutral-500 py-8 text-center">Yukleniyor...</p>
          ) : statusDonutData.length > 0 ? (
            <DistributionDonut data={statusDonutData} height={240} />
          ) : (
            <p className="text-sm text-neutral-500 py-8 text-center">Yayin verisi yok.</p>
          )}
        </SectionShell>

        <SectionShell title="Platform Kirilimi" testId="publish-platform-breakdown">
          {isLoading ? (
            <p className="text-sm text-neutral-500 py-8 text-center">Yukleniyor...</p>
          ) : platformBarData.length > 0 ? (
            <ComparisonBar
              data={platformBarData}
              nameKey="name"
              valueKeys={["published", "failed"]}
              colors={["var(--ch-success-base, #2b8a3e)", "var(--ch-error, #e03131)"]}
              height={240}
            />
          ) : (
            <p className="text-sm text-neutral-500 py-8 text-center">Platform verisi yok.</p>
          )}
        </SectionShell>
      </div>

      {/* Daily Publish Trend */}
      <SectionShell title="Gunluk Yayin Trendi" testId="publish-daily-trend">
        {isLoading ? (
          <p className="text-sm text-neutral-500 py-8 text-center">Yukleniyor...</p>
        ) : trendData.length > 0 ? (
          <TrendChart
            data={trendData}
            xKey="dateLabel"
            yKey="publish_count"
            yLabel="Yayin Sayisi"
            height={260}
            showArea
            testId="trend-chart-publish-daily"
          />
        ) : (
          <p className="text-sm text-neutral-500 py-8 text-center">Secilen donemde yayin trendi yok.</p>
        )}
      </SectionShell>

      {/* Funnel Detail Tiles */}
      <SectionShell title="Yayin Hunisi" testId="publish-funnel-detail">
        <MetricGrid>
          <MetricTile
            label="Taslak"
            value={fmtCount(data?.draft_count)}
            note="Henuz gonderilmemis"
            loading={isLoading}
            testId="pub-funnel-draft"
          />
          <MetricTile
            label="Incelemede"
            value={fmtCount(data?.in_review_count)}
            note="Onay bekleyen"
            loading={isLoading}
            testId="pub-funnel-review"
            accentColor="var(--ch-warning-base)"
          />
          <MetricTile
            label="Planli"
            value={fmtCount(data?.scheduled_count)}
            note="Zamanlanmis"
            loading={isLoading}
            testId="pub-funnel-scheduled"
            accentColor="var(--ch-info-base)"
          />
        </MetricGrid>
      </SectionShell>
    </PageShell>
  );
}
