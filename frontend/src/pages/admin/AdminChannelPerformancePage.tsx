/**
 * AdminChannelPerformancePage — Faz 10.
 *
 * Admin view for channel-level performance analytics.
 * Aggregates: production + publish + engagement metrics per channel.
 * Filters: user, channel, platform, date range, time window.
 * Charts: TrendChart, DistributionDonut, ComparisonBar.
 *
 * Aurora Dusk: trampoline — delegates to the Aurora cockpit page when the
 * surface override `admin.analytics.channels` is registered, falls through
 * to the legacy body otherwise.
 */

import { useMemo } from "react";
import { useSurfacePageOverride } from "../../surfaces";
import { useAnalyticsFilters } from "../../hooks/useAnalyticsFilters";
import { useChannelPerformance } from "../../hooks/useChannelPerformance";
import { AdminAnalyticsFilterBar } from "../../components/analytics/AdminAnalyticsFilterBar";
import { TrendChart } from "../../components/shared/charts/TrendChart";
import { DistributionDonut } from "../../components/shared/charts/DistributionDonut";
import { ComparisonBar } from "../../components/shared/charts/ComparisonBar";
import {
  PageShell,
  SectionShell,
  MetricGrid,
  MetricTile,
} from "../../components/design-system/primitives";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(value: number | null): string {
  if (value === null || value === undefined) return "\u2014";
  return `${(value * 100).toFixed(1)}%`;
}

function dur(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "\u2014";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}dk ${s}s`;
}

function formatDate(d: string): string {
  if (!d || d.length < 10) return d;
  return d.slice(5); // MM-DD
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminChannelPerformancePage() {
  const Override = useSurfacePageOverride("admin.analytics.channels");
  if (Override) return <Override />;
  return <LegacyAdminChannelPerformancePage />;
}

function LegacyAdminChannelPerformancePage() {
  const analyticsFilters = useAnalyticsFilters("last_30d");
  const { data, isLoading, isError } = useChannelPerformance(analyticsFilters.apiParams);

  // Donut data for module distribution
  const moduleDonut = useMemo(() => {
    if (!data?.module_distribution) return [];
    return data.module_distribution.map((m) => ({
      name: m.module_type,
      value: m.count,
    }));
  }, [data?.module_distribution]);

  // Donut data for engagement type distribution
  const engagementDonut = useMemo(() => {
    if (!data?.engagement_type_distribution) return [];
    return data.engagement_type_distribution.map((e) => ({
      name: e.type === "comment_reply" ? "Yorum Yaniti" : e.type === "playlist_add" ? "Playlist Ekleme" : e.type === "community_post" ? "Gonderi" : e.type,
      value: e.count,
    }));
  }, [data?.engagement_type_distribution]);

  // Comparison bar data for publish
  const publishBar = useMemo(() => {
    if (!data) return [];
    return [
      {
        name: "Yayinlar",
        Basarili: data.published_count,
        Basarisiz: data.failed_publish,
      },
    ];
  }, [data]);

  // Channel rankings for comparison bar
  const channelRankBar = useMemo(() => {
    if (!data?.channel_rankings || data.channel_rankings.length === 0) return [];
    return data.channel_rankings.slice(0, 10).map((ch) => ({
      name: ch.profile_name || ch.channel_slug,
      Tamamlanan: ch.completed_count,
      Basarisiz: ch.failed_count,
    }));
  }, [data?.channel_rankings]);

  return (
    <PageShell
      title="Kanal Performansi"
      subtitle="Kanal bazli uretim, yayin ve etkilesim performansi."
      testId="admin-channel-performance"
    >
      {/* Filter bar */}
      <AdminAnalyticsFilterBar
        analyticsFilters={analyticsFilters}
        testId="channel-perf-filters"
      />

      {isLoading && <p className="text-sm text-neutral-500 text-center py-8">Veriler yukleniyor...</p>}
      {isError && <p className="text-sm text-error-base text-center py-8">Veriler yuklenirken hata olustu.</p>}

      {data && (
        <>
          {/* ---- Production KPIs ---- */}
          <SectionShell title="Uretim Metrikleri" testId="production-kpi">
            <MetricGrid>
              <MetricTile label="Toplam Icerik" value={String(data.total_content)} testId="metric-total-content" />
              <MetricTile label="Toplam Is" value={String(data.total_jobs)} testId="metric-total-jobs" />
              <MetricTile label="Basari Orani" value={pct(data.job_success_rate)} testId="metric-job-success" accentColor="var(--ch-success-base)" />
              <MetricTile label="Ort. Uretim Suresi" value={dur(data.avg_production_duration_seconds)} testId="metric-avg-duration" />
              <MetricTile label="Yeniden Deneme" value={pct(data.retry_rate)} testId="metric-retry-rate" />
            </MetricGrid>
          </SectionShell>

          {/* ---- Publish KPIs ---- */}
          <SectionShell title="Yayin Metrikleri" testId="publish-kpi">
            <MetricGrid>
              <MetricTile label="Toplam Yayin" value={String(data.total_publish)} testId="metric-total-publish" />
              <MetricTile label="Basarili Yayin" value={String(data.published_count)} testId="metric-published" accentColor="var(--ch-success-base)" />
              <MetricTile label="Basarisiz" value={String(data.failed_publish)} testId="metric-failed-publish" accentColor="var(--ch-error-base)" />
              <MetricTile label="Yayin Basari" value={pct(data.publish_success_rate)} testId="metric-publish-success" accentColor="var(--ch-success-base)" />
            </MetricGrid>
          </SectionShell>

          {/* ---- Engagement KPIs ---- */}
          <SectionShell title="Etkilesim Metrikleri" testId="engagement-kpi">
            <MetricGrid>
              <MetricTile label="Toplam Yorum" value={String(data.total_comments)} testId="metric-total-comments" />
              <MetricTile label="Yanitlanan" value={String(data.replied_comments)} testId="metric-replied" accentColor="var(--ch-success-base)" />
              <MetricTile label="Bekleyen" value={String(data.pending_comments)} testId="metric-pending-comments" accentColor="var(--ch-warning-base)" />
              <MetricTile label="Yanit Orani" value={pct(data.reply_rate)} testId="metric-reply-rate" />
              <MetricTile label="Etkilesim Gorevi" value={String(data.total_engagement_tasks)} testId="metric-engagement-tasks" />
              <MetricTile label="Gonderi" value={String(data.total_posts)} testId="metric-total-posts" />
              <MetricTile label="Playlist" value={String(data.total_playlists)} testId="metric-playlists" />
            </MetricGrid>
          </SectionShell>

          {/* ---- Channel Health ---- */}
          <SectionShell title="Kanal Sagligi" testId="channel-health">
            <MetricGrid>
              <MetricTile label="Toplam Baglanti" value={String(data.total_connections)} testId="metric-connections" />
              <MetricTile label="Aktif Baglanti" value={String(data.connected_connections)} testId="metric-connected" accentColor="var(--ch-success-base)" />
            </MetricGrid>
          </SectionShell>

          {/* ---- Charts Row 1: Trend + Module Distribution ---- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <SectionShell title="Gunluk Uretim Trendi" testId="daily-trend-section">
              <TrendChart
                data={data.daily_trend as unknown as Record<string, unknown>[]}
                xKey="date"
                yKey="job_count"
                yLabel="Is Sayisi"
                formatX={formatDate}
                testId="channel-trend-chart"
              />
            </SectionShell>

            <SectionShell title="Modul Dagilimi" testId="module-dist-section">
              <DistributionDonut
                data={moduleDonut}
                testId="module-donut"
                emptyMessage="Modul verisi yok"
              />
            </SectionShell>
          </div>

          {/* ---- Charts Row 2: Publish + Engagement Distribution ---- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <SectionShell title="Yayin Durumu" testId="publish-bar-section">
              <ComparisonBar
                data={publishBar}
                nameKey="name"
                valueKeys={["Basarili", "Basarisiz"]}
                colors={["#10b981", "#ef4444"]}
                testId="publish-bar"
                emptyMessage="Yayin verisi yok"
                height={200}
              />
            </SectionShell>

            <SectionShell title="Etkilesim Dagilimi" testId="engagement-dist-section">
              <DistributionDonut
                data={engagementDonut}
                testId="engagement-donut"
                emptyMessage="Etkilesim verisi yok"
              />
            </SectionShell>
          </div>

          {/* ---- Channel Rankings ---- */}
          {data.channel_rankings.length > 0 && (
            <SectionShell title="Kanal Siralamasi" testId="channel-rankings-section">
              <ComparisonBar
                data={channelRankBar}
                nameKey="name"
                valueKeys={["Tamamlanan", "Basarisiz"]}
                colors={["#6366f1", "#ef4444"]}
                layout="horizontal"
                testId="channel-rank-bar"
                height={Math.max(200, data.channel_rankings.length * 40)}
              />

              {/* Rankings table */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm" data-testid="channel-rank-table">
                  <thead>
                    <tr className="border-b border-border-subtle text-left">
                      <th className="py-2 px-3 text-xs font-medium text-neutral-500">Kanal</th>
                      <th className="py-2 px-3 text-xs font-medium text-neutral-500">Toplam Is</th>
                      <th className="py-2 px-3 text-xs font-medium text-neutral-500">Tamamlanan</th>
                      <th className="py-2 px-3 text-xs font-medium text-neutral-500">Basarisiz</th>
                      <th className="py-2 px-3 text-xs font-medium text-neutral-500">Basari</th>
                      <th className="py-2 px-3 text-xs font-medium text-neutral-500">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.channel_rankings.map((ch) => (
                      <tr key={ch.channel_id} className="border-b border-border-subtle hover:bg-surface-hover transition-colors">
                        <td className="py-2 px-3 text-neutral-800">{ch.profile_name}</td>
                        <td className="py-2 px-3 text-neutral-600">{ch.job_count}</td>
                        <td className="py-2 px-3 text-success-700">{ch.completed_count}</td>
                        <td className="py-2 px-3 text-error-700">{ch.failed_count}</td>
                        <td className="py-2 px-3 text-neutral-600">{pct(ch.success_rate)}</td>
                        <td className="py-2 px-3">
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${ch.status === "active" ? "bg-success-50 text-success-700 border-success-200" : "bg-neutral-50 text-neutral-600 border-neutral-200"}`}>
                            {ch.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionShell>
          )}

          {/* ---- Recent Errors ---- */}
          {data.recent_errors.length > 0 && (
            <SectionShell title="Son Hatalar" testId="recent-errors-section">
              <div className="space-y-2">
                {data.recent_errors.map((err, i) => (
                  <div key={i} className="p-2 bg-error-50 border border-error-200 rounded-md text-xs">
                    <span className="font-medium text-error-700">{err.module_type}</span>
                    <span className="text-error-600 ml-2">{err.error}</span>
                    {err.created_at && (
                      <span className="text-error-400 ml-2">{err.created_at.slice(0, 16)}</span>
                    )}
                  </div>
                ))}
              </div>
            </SectionShell>
          )}

          {/* ---- Platform limitations notice ---- */}
          <div className="mt-4 p-3 bg-neutral-50 border border-border-subtle rounded-md text-xs text-neutral-500" data-testid="limitations-notice">
            <strong>Bilgi:</strong> YouTube community post API ucuncu taraf gelistiricilere acik degil — gonderi metrikleri sadece taslak/orchestration verisini yansitir.
            Retention, watch time gibi platform-icin metrikler henuz entegre degil.
          </div>
        </>
      )}
    </PageShell>
  );
}
