/**
 * UserChannelAnalyticsPage — Faz 10.
 *
 * User view for their own channel performance.
 * Simpler than admin — no user filter, shows only the authenticated user's channels.
 * Channel selector, KPIs, trend chart, engagement summary.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useChannelPerformance } from "../../hooks/useChannelPerformance";
import { fetchChannelProfiles, type ChannelProfileResponse } from "../../api/channelProfilesApi";
import { TrendChart } from "../../components/shared/charts/TrendChart";
import { DistributionDonut } from "../../components/shared/charts/DistributionDonut";
import {
  PageShell,
  SectionShell,
  MetricGrid,
  MetricTile,
  WindowSelector,
} from "../../components/design-system/primitives";
import type { AnalyticsWindow, AnalyticsFilterParams } from "../../api/analyticsApi";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WINDOW_OPTIONS: { value: AnalyticsWindow; label: string }[] = [
  { value: "last_7d", label: "Son 7 Gun" },
  { value: "last_30d", label: "Son 30 Gun" },
  { value: "last_90d", label: "Son 90 Gun" },
  { value: "all_time", label: "Tum Zamanlar" },
];

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
  return d.slice(5);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserChannelAnalyticsPage() {
  const [selectedChannel, setSelectedChannel] = useState("");
  const [window, setWindow] = useState<AnalyticsWindow>("last_30d");

  // Fetch user's channels
  const { data: channels } = useQuery({
    queryKey: ["channel-profiles-user"],
    queryFn: () => fetchChannelProfiles(),
    staleTime: 60_000,
  });

  // Build filter params
  const apiParams: AnalyticsFilterParams = useMemo(() => {
    const p: AnalyticsFilterParams = { window };
    if (selectedChannel) p.channel_profile_id = selectedChannel;
    return p;
  }, [window, selectedChannel]);

  const { data, isLoading, isError } = useChannelPerformance(apiParams);

  // Engagement donut
  const engagementDonut = useMemo(() => {
    if (!data?.engagement_type_distribution) return [];
    return data.engagement_type_distribution.map((e) => ({
      name: e.type === "comment_reply" ? "Yorum Yaniti" : e.type === "playlist_add" ? "Playlist" : e.type === "community_post" ? "Gonderi" : e.type,
      value: e.count,
    }));
  }, [data?.engagement_type_distribution]);

  // Module donut
  const moduleDonut = useMemo(() => {
    if (!data?.module_distribution) return [];
    return data.module_distribution.map((m) => ({
      name: m.module_type === "standard_video" ? "Video" : m.module_type === "news_bulletin" ? "Bulten" : m.module_type,
      value: m.count,
    }));
  }, [data?.module_distribution]);

  const selectedChannelName = useMemo(() => {
    if (!selectedChannel || !channels) return null;
    const ch = channels.find((c: ChannelProfileResponse) => c.id === selectedChannel);
    return ch?.profile_name || null;
  }, [selectedChannel, channels]);

  return (
    <PageShell
      title="Kanal Performansim"
      subtitle={selectedChannelName ? `${selectedChannelName} icin performans metrikleri` : "Kanallarinizin uretim, yayin ve etkilesim performansi."}
      testId="user-channel-analytics"
    >
      {/* Controls */}
      <div className="flex flex-col gap-3 mb-4" data-testid="user-channel-controls">
        <WindowSelector
          options={WINDOW_OPTIONS}
          value={window}
          onChange={setWindow}
          testId="user-window-selector"
        />
        <div className="flex gap-3">
          <select
            className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            data-testid="user-channel-selector"
          >
            <option value="">Tum Kanallarim</option>
            {channels?.map((ch: ChannelProfileResponse) => (
              <option key={ch.id} value={ch.id}>{ch.profile_name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <p className="text-sm text-neutral-500 text-center py-8">Veriler yukleniyor...</p>}
      {isError && <p className="text-sm text-error-base text-center py-8">Veriler yuklenirken hata olustu.</p>}

      {data && (
        <>
          {/* ---- Summary KPIs ---- */}
          <SectionShell title="Ozet" testId="user-summary-kpi">
            <MetricGrid>
              <MetricTile label="Icerik" value={String(data.total_content)} testId="u-metric-content" />
              <MetricTile label="Toplam Is" value={String(data.total_jobs)} testId="u-metric-jobs" />
              <MetricTile label="Basari" value={pct(data.job_success_rate)} testId="u-metric-success" accentColor="var(--ch-success-base)" />
              <MetricTile label="Ort. Sure" value={dur(data.avg_production_duration_seconds)} testId="u-metric-duration" />
            </MetricGrid>
          </SectionShell>

          {/* ---- Publish KPIs ---- */}
          <SectionShell title="Yayinlarim" testId="user-publish-kpi">
            <MetricGrid>
              <MetricTile label="Toplam Yayin" value={String(data.total_publish)} testId="u-metric-publish" />
              <MetricTile label="Basarili" value={String(data.published_count)} testId="u-metric-pub-ok" accentColor="var(--ch-success-base)" />
              <MetricTile label="Basarisiz" value={String(data.failed_publish)} testId="u-metric-pub-fail" accentColor="var(--ch-error-base)" />
              <MetricTile label="Basari Orani" value={pct(data.publish_success_rate)} testId="u-metric-pub-rate" />
            </MetricGrid>
          </SectionShell>

          {/* ---- Engagement KPIs ---- */}
          <SectionShell title="Etkilesim" testId="user-engagement-kpi">
            <MetricGrid>
              <MetricTile label="Yorum" value={String(data.total_comments)} testId="u-metric-comments" />
              <MetricTile label="Yanitlanan" value={String(data.replied_comments)} testId="u-metric-replied" accentColor="var(--ch-success-base)" />
              <MetricTile label="Yanit Orani" value={pct(data.reply_rate)} testId="u-metric-reply-rate" />
              <MetricTile label="Playlist" value={String(data.total_playlists)} testId="u-metric-playlists" />
              <MetricTile label="Gonderi" value={String(data.total_posts)} testId="u-metric-posts" />
            </MetricGrid>
          </SectionShell>

          {/* ---- Charts ---- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <SectionShell title="Uretim Trendi" testId="user-trend-section">
              <TrendChart
                data={data.daily_trend as unknown as Record<string, unknown>[]}
                xKey="date"
                yKey="job_count"
                yLabel="Is Sayisi"
                formatX={formatDate}
                testId="user-trend-chart"
              />
            </SectionShell>

            <SectionShell title="Modul Dagilimi" testId="user-module-section">
              <DistributionDonut
                data={moduleDonut}
                testId="user-module-donut"
                emptyMessage="Henuz icerik uretimi yok"
              />
            </SectionShell>
          </div>

          {/* ---- Engagement Distribution ---- */}
          {engagementDonut.length > 0 && (
            <div className="mt-4">
              <SectionShell title="Etkilesim Dagilimi" testId="user-engagement-dist-section">
                <DistributionDonut
                  data={engagementDonut}
                  testId="user-engagement-donut"
                  emptyMessage="Henuz etkilesim verisi yok"
                />
              </SectionShell>
            </div>
          )}

          {/* ---- Channel Health ---- */}
          <SectionShell title="Baglanti Durumu" testId="user-health">
            <MetricGrid>
              <MetricTile label="Platform Baglantisi" value={String(data.total_connections)} testId="u-metric-connections" />
              <MetricTile label="Aktif" value={String(data.connected_connections)} testId="u-metric-active-conn" accentColor="var(--ch-success-base)" />
            </MetricGrid>
          </SectionShell>

          {/* ---- Limitations ---- */}
          <div className="mt-4 p-3 bg-neutral-50 border border-border-subtle rounded-md text-xs text-neutral-500" data-testid="user-limitations">
            <strong>Not:</strong> Bazi metrikler platform API kisitlamalari nedeniyle sinirli olabilir.
            Retention ve izlenme suresi gibi veriler henuz entegre degil.
          </div>
        </>
      )}
    </PageShell>
  );
}
