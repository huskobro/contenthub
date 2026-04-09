/**
 * AdminOverviewPage — Faz 6 V2.
 *
 * Real operational dashboard with KPI cards, charts, trends,
 * and entity-level filtering (user, channel, platform, date range).
 *
 * Not a "metric wallpaper" — every card and chart should help the admin
 * make a decision.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { useVisibility } from "../hooks/useVisibility";
import { useAnalyticsFilters } from "../hooks/useAnalyticsFilters";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { useJobsList } from "../hooks/useJobsList";
import { cn } from "../lib/cn";
import {
  PageShell,
  SectionShell,
  MetricTile,
  MetricGrid,
  StatusBadge,
} from "../components/design-system/primitives";
import { SkeletonCard, SkeletonMetricGrid } from "../components/design-system/Skeleton";
import { AdminAnalyticsFilterBar } from "../components/analytics/AdminAnalyticsFilterBar";
import { TrendChart } from "../components/shared/charts/TrendChart";
import { DistributionDonut } from "../components/shared/charts/DistributionDonut";
import { ComparisonBar } from "../components/shared/charts/ComparisonBar";

/* ------------------------------------------------------------------ */
/* Quick-link definitions                                             */
/* ------------------------------------------------------------------ */

interface QuickLink {
  title: string;
  desc: string;
  to: string;
  testId: string;
  visibilityKey?: string;
  iconPath: string;
  iconBgClass: string;
  iconColor: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    title: "Icerik Kutuphanesi",
    desc: "Tum icerik kayitlarini tek yuzeyden goruntuleyip yonetin",
    to: "/admin/library",
    testId: "quick-link-library",
    iconPath: "M3 5h14M3 10h14M3 15h9",
    iconBgClass: "bg-brand-100",
    iconColor: "var(--ch-brand-600, #4c6ef5)",
  },
  {
    title: "Yeni Video Olustur",
    desc: "Ana uretim akisi: standart video icerigi olusturmaya basla",
    to: "/admin/standard-videos/new",
    testId: "quick-link-new-video",
    iconPath: "M15.91 11.672a.375.375 0 010 .656l-7.5 4.5A.375.375 0 018 16.5v-9a.375.375 0 01.41-.328l7.5 4.5z",
    iconBgClass: "bg-success-light",
    iconColor: "var(--ch-success-dark, #2b8a3e)",
  },
  {
    title: "Isler",
    desc: "Uretim islerini, kuyruk durumunu ve toplu operasyonlari takip et",
    to: "/admin/jobs",
    testId: "quick-link-jobs",
    iconPath: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
    iconBgClass: "bg-neutral-100",
    iconColor: "var(--ch-neutral-700, #495057)",
  },
  {
    title: "Analytics",
    desc: "Uretim metrikleri, raporlama ve karar destek ozetlerini goruntule",
    to: "/admin/analytics",
    testId: "quick-link-analytics",
    visibilityKey: "panel:analytics",
    iconPath: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    iconBgClass: "bg-success-light",
    iconColor: "var(--ch-success-text, #2b8a3e)",
  },
  {
    title: "Kaynaklar",
    desc: "Haber kaynaklarini yonet ve tara",
    to: "/admin/sources",
    testId: "quick-link-sources",
    visibilityKey: "panel:sources",
    iconPath: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 3v18M3 12h18",
    iconBgClass: "bg-warning-light",
    iconColor: "var(--ch-warning-dark, #e67700)",
  },
  {
    title: "Ayarlar",
    desc: "Ayar kayitlarini ve governance durumunu yonet",
    to: "/admin/settings",
    testId: "quick-link-settings",
    visibilityKey: "panel:settings",
    iconPath: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
    iconBgClass: "bg-neutral-100",
    iconColor: "var(--ch-neutral-600, #868e96)",
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
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

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "Az once";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk once`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat once`;
  return `${Math.floor(diff / 86400)} gun once`;
}

function useFilteredQuickLinks(): QuickLink[] {
  const settings = useVisibility("panel:settings");
  const sources = useVisibility("panel:sources");
  const analytics = useVisibility("panel:analytics");

  const guardMap: Record<string, boolean> = {
    "panel:settings": settings.visible,
    "panel:sources": sources.visible,
    "panel:analytics": analytics.visible,
  };

  return QUICK_LINKS.filter((link) => {
    if (!link.visibilityKey) return true;
    return guardMap[link.visibilityKey] !== false;
  });
}

/* ------------------------------------------------------------------ */
/* Icon helper                                                        */
/* ------------------------------------------------------------------ */

function IconCircle({ path, bgClass, color }: { path: string; bgClass: string; color: string }) {
  return (
    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", bgClass)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* QuickCard                                                          */
/* ------------------------------------------------------------------ */

function QuickCard({ link, onClick }: { link: QuickLink; onClick: () => void }) {
  return (
    <div
      className="py-3 px-4 bg-surface-card border border-border-subtle border-l-[3px] rounded-lg cursor-pointer duration-normal shadow-sm hover:border-brand-300 hover:border-l-brand-400 hover:shadow-md flex gap-3 items-start transition-all"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      data-testid={link.testId}
    >
      <IconCircle path={link.iconPath} bgClass={link.iconBgClass} color={link.iconColor} />
      <div className="min-w-0">
        <p className="m-0 text-md font-semibold text-neutral-900 mb-1">{link.title}</p>
        <p className="m-0 text-xs text-neutral-500 leading-normal line-clamp-2">{link.desc}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RecentJobCard                                                      */
/* ------------------------------------------------------------------ */

const JOB_STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  completed: { dot: "bg-success-base", label: "Tamamlandi" },
  failed: { dot: "bg-error", label: "Basarisiz" },
  running: { dot: "bg-brand-500 animate-pulse", label: "Calisiyor" },
  pending: { dot: "bg-warning-base", label: "Bekliyor" },
  cancelled: { dot: "bg-neutral-400", label: "Iptal" },
};

function RecentJobCard({ job, onClick }: { job: { id: number; module_type: string; status: string; created_at: string; context_summary?: string }; onClick: () => void }) {
  const style = JOB_STATUS_STYLE[job.status] || { dot: "bg-neutral-400", label: job.status };
  return (
    <div
      className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-border-subtle bg-surface-card hover:bg-brand-50/30 hover:border-brand-200 cursor-pointer transition-all duration-fast"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", style.dot)} title={style.label} />
      <div className="flex-1 min-w-0">
        <p className="m-0 text-sm font-medium text-neutral-800 truncate">
          {job.context_summary || `${job.module_type} #${job.id}`}
        </p>
        <p className="m-0 text-xs text-neutral-500 mt-0.5">
          {style.label} &middot; {timeAgo(job.created_at)}
        </p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400 shrink-0">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RecentErrorCard                                                    */
/* ------------------------------------------------------------------ */

function RecentErrorCard({ error, onClick }: {
  error: { job_id: string; module_type: string; error: string; created_at: string };
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-start gap-2 py-2 px-3 rounded-md border border-error/20 bg-error/5 cursor-pointer hover:border-error/40 transition-all duration-fast"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <span className="text-error text-sm mt-0.5">!</span>
      <div className="flex-1 min-w-0">
        <p className="m-0 text-xs font-medium text-neutral-800 truncate">
          {error.module_type} &middot; {timeAgo(error.created_at)}
        </p>
        <p className="m-0 text-xs text-neutral-600 mt-0.5 line-clamp-2">{error.error}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const filteredLinks = useFilteredQuickLinks();
  const analyticsFilters = useAnalyticsFilters("last_30d");
  const { data, isLoading, isError } = useDashboardSummary(analyticsFilters.apiParams);
  const { data: jobsData, isLoading: jobsLoading } = useJobsList();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentJobs = ((jobsData as any)?.items || jobsData || []).slice(0, 5);

  // Prepare trend chart data
  const trendData = (data?.daily_trend ?? []).map((d) => ({
    ...d,
    dateLabel: d.date.slice(5), // "MM-DD" format for x-axis
  }));

  // Prepare module distribution for donut
  const moduleDonutData = (data?.module_distribution ?? []).map((m) => ({
    name: m.module_type === "standard_video" ? "Standart Video" : m.module_type === "news_bulletin" ? "Haber Bulteni" : m.module_type,
    value: m.total_jobs,
  }));

  // Prepare platform distribution for bar chart
  const platformBarData = (data?.platform_distribution ?? []).map((p) => ({
    name: p.platform === "youtube" ? "YouTube" : p.platform,
    published: p.published,
    failed: p.failed,
  }));

  return (
    <PageShell
      title="Yonetim Paneli"
      subtitle="Operasyonel gozlem merkezi. Filtreleyerek karar verin."
      testId="admin-overview"
    >
      {/* Filter Bar */}
      <AdminAnalyticsFilterBar analyticsFilters={analyticsFilters} testId="dashboard-filter-bar" />

      {isError && (
        <div className="flex flex-col items-center py-6 gap-2 mb-4" data-testid="dashboard-error">
          <span className="text-error-base text-2xl">&#9888;</span>
          <p className="text-error-base text-md m-0">Dashboard verileri yuklenemedi.</p>
        </div>
      )}

      {/* ---- KPI Cards ---- */}
      <div className="bg-gradient-to-br from-brand-50 via-brand-100/60 to-surface-page rounded-xl p-4 pb-3 mb-4 border border-brand-200/60 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 90% 10%, color-mix(in srgb, var(--ch-brand-400) 6%, transparent) 0%, transparent 60%)" }} />
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="m-0 text-md font-bold text-brand-800 tracking-tight font-heading">
              Platform Metrikleri
            </h2>
            <p className="mt-0.5 mb-0 text-xs text-brand-600">
              {analyticsFilters.hasEntityFilter ? "Filtreli gorunum" : "Kumulatif gorunum"}
            </p>
          </div>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isLoading
              ? "bg-warning-base shadow-[0_0_0_3px_var(--color-warning-light)]"
              : "bg-success-base shadow-[0_0_0_3px_var(--color-success-light)]"
          )} />
        </div>

        {isLoading ? (
          <SkeletonMetricGrid count={4} />
        ) : (
          <MetricGrid>
            <MetricTile
              label="Toplam Proje"
              value={fmtCount(data?.total_projects)}
              note="ContentProject kaydi"
              testId="kpi-total-projects"
              accentColor="var(--ch-brand-500, #4c6ef5)"
            />
            <MetricTile
              label="Toplam Is"
              value={fmtCount(data?.total_jobs)}
              note="Olusturulan tum isler"
              testId="kpi-total-jobs"
              accentColor="var(--ch-info-base, #1971c2)"
            />
            <MetricTile
              label="Aktif Is"
              value={fmtCount(data?.active_jobs)}
              note="Calisan / kuyrukta"
              testId="kpi-active-jobs"
              accentColor="var(--ch-warning-base, #e67700)"
            />
            <MetricTile
              label="Yayin Basari"
              value={fmtRate(data?.publish_success_rate)}
              note="Basarili / toplam yayin"
              testId="kpi-publish-success"
              accentColor="var(--ch-success-base, #2b8a3e)"
            />
          </MetricGrid>
        )}

        {!isLoading && data && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 mt-3">
            <MetricTile
              label="Ort. Uretim Suresi"
              value={fmtDuration(data.avg_production_duration_seconds)}
              note="Is basina ortalama"
              testId="kpi-avg-duration"
              accentColor="var(--ch-neutral-500, #adb5bd)"
            />
            <MetricTile
              label="Retry Orani"
              value={fmtRate(data.retry_rate)}
              note="Tekrar eden isler"
              testId="kpi-retry-rate"
              accentColor="var(--ch-warning-base, #e67700)"
            />
            <MetricTile
              label="Basarisiz Is"
              value={fmtCount(data.failed_job_count)}
              note="Hata ile sonuclanan"
              testId="kpi-failed-jobs"
              accentColor="var(--ch-error, #e03131)"
            />
            <MetricTile
              label="Toplam Yayin"
              value={fmtCount(data.total_publish)}
              note="Yayin kaydi sayisi"
              testId="kpi-total-publish"
              accentColor="var(--ch-success-base, #2b8a3e)"
            />
          </div>
        )}
      </div>

      {/* ---- Charts Row ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Daily Production Trend */}
        <SectionShell title="Gunluk Uretim Trendi" testId="dashboard-daily-trend">
          {isLoading ? (
            <SkeletonCard lines={4} hasIcon={false} />
          ) : trendData.length > 0 ? (
            <TrendChart
              data={trendData}
              xKey="dateLabel"
              yKey="job_count"
              yLabel="Is Sayisi"
              height={220}
              showArea
              testId="trend-chart-production"
            />
          ) : (
            <p className="text-sm text-neutral-500 py-8 text-center">Secilen donemde veri yok.</p>
          )}
        </SectionShell>

        {/* Module Distribution */}
        <SectionShell title="Modul Dagilimi" testId="dashboard-module-dist">
          {isLoading ? (
            <SkeletonCard lines={4} hasIcon={false} />
          ) : moduleDonutData.length > 0 ? (
            <DistributionDonut data={moduleDonutData} height={220} />
          ) : (
            <p className="text-sm text-neutral-500 py-8 text-center">Modul verisi yok.</p>
          )}
        </SectionShell>
      </div>

      {/* Platform Distribution + Publish Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Platform Publish Distribution */}
        <SectionShell title="Platform Yayin Dagilimi" testId="dashboard-platform-dist">
          {isLoading ? (
            <SkeletonCard lines={3} hasIcon={false} />
          ) : platformBarData.length > 0 ? (
            <ComparisonBar
              data={platformBarData}
              nameKey="name"
              valueKeys={["published", "failed"]}
              colors={["var(--ch-success-base, #2b8a3e)", "var(--ch-error, #e03131)"]}
              height={180}
            />
          ) : (
            <p className="text-sm text-neutral-500 py-8 text-center">Platform verisi yok.</p>
          )}
        </SectionShell>

        {/* Publish Success/Fail Trend */}
        <SectionShell title="Yayin Basari Trendi" testId="dashboard-publish-trend">
          {isLoading ? (
            <SkeletonCard lines={3} hasIcon={false} />
          ) : trendData.length > 0 ? (
            <TrendChart
              data={trendData}
              xKey="dateLabel"
              yKey="publish_success_count"
              yLabel="Basarili Yayin"
              color="#2b8a3e"
              height={180}
              showArea
              testId="trend-chart-publish"
            />
          ) : (
            <p className="text-sm text-neutral-500 py-8 text-center">Yayin trendi yok.</p>
          )}
        </SectionShell>
      </div>

      {/* ---- Operational Status Row ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4 mb-4">
        {/* Queue + Errors */}
        <SectionShell title="Operasyonel Durum" testId="dashboard-operational-status">
          {isLoading ? (
            <SkeletonCard lines={3} hasIcon={false} />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 py-2 px-3 rounded-md bg-surface-inset border border-border-subtle">
                <span className="text-sm font-semibold text-neutral-700">Kuyruk</span>
                <span className="ml-auto text-lg font-bold text-brand-600">{data?.queue_size ?? 0}</span>
                <span className="text-xs text-neutral-500">bekleyen is</span>
              </div>

              {(data?.recent_errors ?? []).length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Son Hatalar</h4>
                  {data!.recent_errors.map((err) => (
                    <RecentErrorCard
                      key={err.job_id}
                      error={err}
                      onClick={() => navigate(`/admin/jobs/${err.job_id}`)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500 text-center py-4">Yakin zamanda hata yok.</p>
              )}
            </div>
          )}
        </SectionShell>

        {/* Recent Jobs */}
        <SectionShell
          title="Son Isler"
          description="En son olusturulan isler"
          testId="recent-jobs-section"
          actions={
            <button
              onClick={() => navigate("/admin/jobs")}
              className="text-xs text-brand-600 font-medium bg-transparent border-none cursor-pointer hover:text-brand-700 transition-colors duration-fast"
            >
              Tumunu gor &rarr;
            </button>
          }
        >
          {jobsLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} hasIcon={false} lines={1} />)}
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-sm">Henuz is olusturulmamis.</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {recentJobs.map((job: { id: number; module_type: string; status: string; created_at: string; context_summary?: string }) => (
                <RecentJobCard
                  key={job.id}
                  job={job}
                  onClick={() => navigate(`/admin/jobs/${job.id}`)}
                />
              ))}
            </div>
          )}
        </SectionShell>
      </div>

      {/* ---- Quick Access ---- */}
      <SectionShell testId="admin-quick-access-section">
        <h3 data-testid="admin-quick-access-heading" className="m-0 text-md font-semibold text-neutral-900 mb-3">
          Hizli Erisim
        </h3>
        <div className="grid grid-cols-3 gap-3 stagger-children">
          {filteredLinks.map((link) => (
            <QuickCard key={link.to} link={link} onClick={() => navigate(link.to)} />
          ))}
        </div>
      </SectionShell>
    </PageShell>
  );
}
