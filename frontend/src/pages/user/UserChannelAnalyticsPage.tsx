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
import { useAuthStore } from "../../stores/authStore";
import { TrendChart } from "../../components/shared/charts/TrendChart";
import { DistributionDonut } from "../../components/shared/charts/DistributionDonut";
import {
  PageShell,
  SectionShell,
  MetricGrid,
  MetricTile,
  WindowSelector,
} from "../../components/design-system/primitives";
import { UserAnalyticsTabBar } from "../../components/analytics/AnalyticsTabBar";
import type { AnalyticsWindow, AnalyticsFilterParams } from "../../api/analyticsApi";
import { useSurfacePageOverride } from "../../surfaces";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WINDOW_OPTIONS: { value: AnalyticsWindow; label: string }[] = [
  { value: "last_7d", label: "Son 7 Gün" },
  { value: "last_30d", label: "Son 30 Gün" },
  { value: "last_90d", label: "Son 90 Gün" },
  { value: "all_time", label: "Tüm Zamanlar" },
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
  const Override = useSurfacePageOverride("user.analytics.channels");
  if (Override) return <Override />;
  return <LegacyUserChannelAnalyticsPage />;
}

function LegacyUserChannelAnalyticsPage() {
  const [selectedChannel, setSelectedChannel] = useState("");
  const [window, setWindow] = useState<AnalyticsWindow>("last_30d");

  // Phase AM-5: bind the user-scope cache to the authenticated user id so
  // a different identity cannot reuse a stale channel list from a prior
  // session. Backend auto-scopes non-admin callers — this is frontend
  // cache hygiene only.
  const userId = useAuthStore((s) => s.user?.id ?? "anonymous");
  const { data: channels } = useQuery({
    queryKey: ["channel-profiles-user", userId],
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
      name: e.type === "comment_reply" ? "Yorum Yanıtı" : e.type === "playlist_add" ? "Playlist" : e.type === "community_post" ? "Gönderi" : e.type,
      value: e.count,
    }));
  }, [data?.engagement_type_distribution]);

  // Module donut
  const moduleDonut = useMemo(() => {
    if (!data?.module_distribution) return [];
    return data.module_distribution.map((m) => ({
      name: m.module_type === "standard_video" ? "Video" : m.module_type === "news_bulletin" ? "Bülten" : m.module_type,
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
      title="Kanal Performansım"
      subtitle={selectedChannelName ? `${selectedChannelName} için performans metrikleri` : "Kanallarınızın üretim, yayın ve etkileşim performansı."}
      testId="user-channel-analytics"
    >
      <UserAnalyticsTabBar />
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
            <option value="">Tüm Kanallarım</option>
            {channels?.map((ch: ChannelProfileResponse) => (
              <option key={ch.id} value={ch.id}>{ch.profile_name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <p className="text-sm text-neutral-500 text-center py-8">Veriler yükleniyor...</p>}
      {isError && <p className="text-sm text-error-base text-center py-8">Veriler yüklenirken hata oluştu.</p>}

      {data && (
        <>
          {/* ---- Summary KPIs ---- */}
          <SectionShell title="Özet" testId="user-summary-kpi">
            <MetricGrid>
              <MetricTile label="İçerik" value={String(data.total_content)} testId="u-metric-content" />
              <MetricTile label="Toplam İş" value={String(data.total_jobs)} testId="u-metric-jobs" />
              <MetricTile label="Başarı" value={pct(data.job_success_rate)} testId="u-metric-success" accentColor="var(--ch-success-base)" />
              <MetricTile label="Ort. Süre" value={dur(data.avg_production_duration_seconds)} testId="u-metric-duration" />
            </MetricGrid>
          </SectionShell>

          {/* ---- Publish KPIs ---- */}
          <SectionShell title="Yayınlarım" testId="user-publish-kpi">
            <MetricGrid>
              <MetricTile label="Toplam Yayın" value={String(data.total_publish)} testId="u-metric-publish" />
              <MetricTile label="Başarılı" value={String(data.published_count)} testId="u-metric-pub-ok" accentColor="var(--ch-success-base)" />
              <MetricTile label="Başarısız" value={String(data.failed_publish)} testId="u-metric-pub-fail" accentColor="var(--ch-error-base)" />
              <MetricTile label="Başarı Oranı" value={pct(data.publish_success_rate)} testId="u-metric-pub-rate" />
            </MetricGrid>
          </SectionShell>

          {/* ---- Engagement KPIs ---- */}
          <SectionShell title="Etkileşim" testId="user-engagement-kpi">
            <MetricGrid>
              <MetricTile label="Yorum" value={String(data.total_comments)} testId="u-metric-comments" />
              <MetricTile label="Yanıtlanan" value={String(data.replied_comments)} testId="u-metric-replied" accentColor="var(--ch-success-base)" />
              <MetricTile label="Yanıt Oranı" value={pct(data.reply_rate)} testId="u-metric-reply-rate" />
              <MetricTile label="Playlist" value={String(data.total_playlists)} testId="u-metric-playlists" />
              <MetricTile label="Gönderi" value={String(data.total_posts)} testId="u-metric-posts" />
            </MetricGrid>
          </SectionShell>

          {/* ---- Charts ---- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <SectionShell title="Üretim Trendi" testId="user-trend-section">
              <TrendChart
                data={data.daily_trend as unknown as Record<string, unknown>[]}
                xKey="date"
                yKey="job_count"
                yLabel="İş Sayısı"
                formatX={formatDate}
                testId="user-trend-chart"
              />
            </SectionShell>

            <SectionShell title="Modül Dağılımı" testId="user-module-section">
              <DistributionDonut
                data={moduleDonut}
                testId="user-module-donut"
                emptyMessage="Henüz içerik üretimi yok"
              />
            </SectionShell>
          </div>

          {/* ---- Engagement Distribution ---- */}
          {engagementDonut.length > 0 && (
            <div className="mt-4">
              <SectionShell title="Etkileşim Dağılımı" testId="user-engagement-dist-section">
                <DistributionDonut
                  data={engagementDonut}
                  testId="user-engagement-donut"
                  emptyMessage="Henüz etkileşim verisi yok"
                />
              </SectionShell>
            </div>
          )}

          {/* ---- Channel Health ---- */}
          <SectionShell title="Bağlantı Durumu" testId="user-health">
            <MetricGrid>
              <MetricTile label="Platform Bağlantısı" value={String(data.total_connections)} testId="u-metric-connections" />
              <MetricTile label="Aktif" value={String(data.connected_connections)} testId="u-metric-active-conn" accentColor="var(--ch-success-base)" />
            </MetricGrid>
          </SectionShell>

          {/* ---- Limitations ---- */}
          <div className="mt-4 p-3 bg-neutral-50 border border-border-subtle rounded-md text-xs text-neutral-500" data-testid="user-limitations">
            <strong>Not:</strong> Bazı metrikler platform API kısıtlamaları nedeniyle sınırlı olabilir.
            Retention ve izlenme süresi gibi veriler henüz entegre değil.
          </div>
        </>
      )}
    </PageShell>
  );
}
