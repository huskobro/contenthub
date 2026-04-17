/**
 * UserAnalyticsPage — Faz 6G.
 *
 * User-scoped analytics entry point.
 * Reuses the same analytics API and shared chart components as admin,
 * but automatically scopes to the authenticated user's data.
 *
 * Faz 3A (Canvas): trampoline — delegates to the Canvas performance studio
 * when Canvas registers an override for `user.analytics.overview`, falls
 * through to the legacy body otherwise.
 */

import { useQuery } from "@tanstack/react-query";
import { useSurfacePageOverride } from "../../surfaces";
import { fetchDashboardSummary, type AnalyticsFilterParams } from "../../api/analyticsApi";
import { useAuthStore } from "../../stores/authStore";
import {
  PageShell,
  SectionShell,
  MetricTile,
  MetricGrid,
  WindowSelector,
} from "../../components/design-system/primitives";
import { TrendChart } from "../../components/shared/charts/TrendChart";
import { DistributionDonut } from "../../components/shared/charts/DistributionDonut";
import { UserAnalyticsTabBar } from "../../components/analytics/AnalyticsTabBar";
import { useState } from "react";
import type { AnalyticsWindow } from "../../api/analyticsApi";

const WINDOW_OPTIONS: { value: AnalyticsWindow; label: string }[] = [
  { value: "last_7d", label: "Son 7 Gün" },
  { value: "last_30d", label: "Son 30 Gün" },
  { value: "last_90d", label: "Son 90 Gün" },
  { value: "all_time", label: "Tüm Zamanlar" },
];

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
  if (seconds < 3600) return `${Math.floor(seconds / 60)}dk`;
  return `${Math.floor(seconds / 3600)}sa`;
}

export function UserAnalyticsPage() {
  const Override = useSurfacePageOverride("user.analytics.overview");
  if (Override) return <Override />;
  return <LegacyUserAnalyticsPage />;
}

function LegacyUserAnalyticsPage() {
  const [window, setWindow] = useState<AnalyticsWindow>("last_30d");
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const filters: AnalyticsFilterParams = {
    window,
    user_id: userId || undefined,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-analytics", filters],
    queryFn: () => fetchDashboardSummary(filters),
    staleTime: 30_000,
    enabled: !!userId,
  });

  const trendData = (data?.daily_trend ?? []).map((d) => ({
    ...d,
    dateLabel: d.date.slice(5),
  }));

  const moduleDonutData = (data?.module_distribution ?? []).map((m) => ({
    name: m.module_type === "standard_video" ? "Standart Video" : m.module_type === "news_bulletin" ? "Haber Bülteni" : m.module_type,
    value: m.total_jobs,
  }));

  return (
    <PageShell
      title="Benim Analitiğim"
      subtitle="Kendi içerik üretiminiz ve yayın performansınız."
      testId="user-analytics"
    >
      <UserAnalyticsTabBar />
      <div className="mb-4">
        <WindowSelector
          options={WINDOW_OPTIONS}
          value={window}
          onChange={setWindow}
          testId="user-analytics-window"
        />
      </div>

      {!userId && (
        <p className="text-sm text-warning-base text-center py-4">Kullanıcı bilgisi bulunamadı.</p>
      )}

      {isError && (
        <p className="text-sm text-error-base text-center py-4">Veriler yüklenemedi.</p>
      )}

      {/* KPI Cards */}
      <SectionShell title="Özet" testId="user-analytics-summary">
        <MetricGrid>
          <MetricTile
            label="Projelerim"
            value={fmtCount(data?.total_projects)}
            note="Toplam proje sayısı"
            loading={isLoading}
            testId="user-metric-projects"
          />
          <MetricTile
            label="İşlerim"
            value={fmtCount(data?.total_jobs)}
            note="Toplam iş sayısı"
            loading={isLoading}
            testId="user-metric-jobs"
          />
          <MetricTile
            label="Yayın Başarı"
            value={fmtRate(data?.publish_success_rate)}
            note="Başarılı yayın oranı"
            loading={isLoading}
            testId="user-metric-publish-rate"
            accentColor="var(--ch-success-base)"
          />
          <MetricTile
            label="Ort. Üretim"
            value={fmtDuration(data?.avg_production_duration_seconds)}
            note="İş başına ortalama"
            loading={isLoading}
            testId="user-metric-avg-duration"
          />
        </MetricGrid>
      </SectionShell>

      {/* Trend + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SectionShell title="Üretim Trendi" testId="user-trend">
          {isLoading ? (
            <p className="text-sm text-neutral-500 py-8 text-center">Yükleniyor...</p>
          ) : trendData.length > 0 ? (
            <TrendChart
              data={trendData}
              xKey="dateLabel"
              yKey="job_count"
              yLabel="İş Sayısı"
              height={200}
              showArea
              testId="user-trend-chart"
            />
          ) : (
            <p className="text-sm text-neutral-500 py-8 text-center">Seçilen dönemde veri yok.</p>
          )}
        </SectionShell>

        <SectionShell title="Modül Dağılımı" testId="user-module-dist">
          {isLoading ? (
            <p className="text-sm text-neutral-500 py-8 text-center">Yükleniyor...</p>
          ) : moduleDonutData.length > 0 ? (
            <DistributionDonut data={moduleDonutData} height={200} />
          ) : (
            <p className="text-sm text-neutral-500 py-8 text-center">Modül verisi yok.</p>
          )}
        </SectionShell>
      </div>
    </PageShell>
  );
}
