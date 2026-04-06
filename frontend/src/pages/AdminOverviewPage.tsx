import React from "react";
import { useNavigate } from "react-router-dom";
import { useVisibility } from "../hooks/useVisibility";
import { useAnalyticsOverview } from "../hooks/useAnalyticsOverview";
import { useJobsList } from "../hooks/useJobsList";
import { useSourcesList } from "../hooks/useSourcesList";
import { useTemplatesList } from "../hooks/useTemplatesList";
import { cn } from "../lib/cn";
import {
  PageShell,
  SectionShell,
  MetricTile,
  MetricGrid,
  StatusBadge,
} from "../components/design-system/primitives";
import { SkeletonCard, SkeletonMetricGrid } from "../components/design-system/Skeleton";

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
    title: "Varlik Kutuphanesi",
    desc: "Muzik, font, gorsel, overlay ve diger uretim varliklarini yonet",
    to: "/admin/assets",
    testId: "quick-link-assets",
    iconPath: "M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM11 11h5v5h-5z",
    iconBgClass: "bg-info-light",
    iconColor: "var(--ch-info-dark, #1864ab)",
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
    title: "Sablonlar",
    desc: "Uretim hattinin yapi taslari: icerik, stil ve yayin sablonlarini yonet",
    to: "/admin/templates",
    testId: "quick-link-templates",
    visibilityKey: "panel:templates",
    iconPath: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
    iconBgClass: "bg-brand-100",
    iconColor: "var(--ch-brand-700, #364fc7)",
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
    title: "Ayarlar",
    desc: "Ayar kayitlarini ve governance durumunu yonet",
    to: "/admin/settings",
    testId: "quick-link-settings",
    visibilityKey: "panel:settings",
    iconPath: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
    iconBgClass: "bg-neutral-100",
    iconColor: "var(--ch-neutral-600, #868e96)",
  },
  {
    title: "Haber Bultenleri",
    desc: "Ikinci uretim akisi: haber bulteni icerigi olustur ve yonet",
    to: "/admin/news-bulletins",
    testId: "quick-link-news-bulletins",
    iconPath: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2",
    iconBgClass: "bg-info-light",
    iconColor: "var(--ch-info-text, #1864ab)",
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
];

/* ------------------------------------------------------------------ */
/* Release readiness — dynamic items                                  */
/* ------------------------------------------------------------------ */

interface ReadinessItem {
  area: string;
  status: "active" | "warning";
  statusLabel: string;
  detail: string;
  testId: string;
}

function useReadinessItems(analytics: {
  total_job_count?: number;
  completed_job_count?: number;
  published_count?: number;
  total_publish_count?: number;
} | undefined): ReadinessItem[] {
  const { data: sourcesData } = useSourcesList();
  const { data: templatesData } = useTemplatesList();

  const hasCompletedJobs = (analytics?.completed_job_count ?? 0) > 0;
  const hasPublish = (analytics?.total_publish_count ?? 0) > 0;
  const sourcesList = Array.isArray(sourcesData) ? sourcesData : [];
  const templatesList = Array.isArray(templatesData) ? templatesData : [];
  const hasSources = sourcesList.length > 0;
  const hasTemplates = templatesList.length > 0;

  return [
    {
      area: "Icerik Uretimi",
      status: hasCompletedJobs ? "active" : "warning",
      statusLabel: hasCompletedJobs ? "Hazir" : "Yapilandirilmadi",
      detail: hasCompletedJobs
        ? `${analytics!.completed_job_count} tamamlanmis is mevcut`
        : "Henuz tamamlanmis is yok",
      testId: "readiness-content",
    },
    {
      area: "Yayin Akisi",
      status: hasPublish ? "active" : "warning",
      statusLabel: hasPublish ? "Hazir" : "Yapilandirilmadi",
      detail: hasPublish
        ? `${analytics!.total_publish_count} yayin kaydi mevcut`
        : "Henuz yayin kaydi olusturulmamis",
      testId: "readiness-publish",
    },
    {
      area: "Is Motoru",
      status: "active",
      statusLabel: "Hazir",
      detail: "Job/step/timeline/ETA sistemi aktif",
      testId: "readiness-jobs",
    },
    {
      area: "Sablonlar",
      status: hasTemplates ? "active" : "warning",
      statusLabel: hasTemplates ? "Hazir" : "Yapilandirilmadi",
      detail: hasTemplates
        ? `${templatesList.length} sablon tanimli`
        : "Henuz sablon tanimlanmamis",
      testId: "readiness-templates",
    },
    {
      area: "Haber Modulu",
      status: hasSources ? "active" : "warning",
      statusLabel: hasSources ? "Hazir" : "Yapilandirilmadi",
      detail: hasSources
        ? `${sourcesList.length} haber kaynagi tanimli`
        : "Henuz haber kaynagi eklenmemis",
      testId: "readiness-news",
    },
    {
      area: "Ayarlar",
      status: "active",
      statusLabel: "Hazir",
      detail: "Settings/visibility CRUD aktif",
      testId: "readiness-settings",
    },
    {
      area: "Analitik",
      status: "active",
      statusLabel: "Hazir",
      detail: "Platform, operasyon ve icerik analytics aktif",
      testId: "readiness-analytics",
    },
    {
      area: "Kutuphane",
      status: "active",
      statusLabel: "Hazir",
      detail: "Icerik ve varlik kutuphanesi aktif",
      testId: "readiness-library",
    },
  ];
}

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
  const templates = useVisibility("panel:templates");
  const analytics = useVisibility("panel:analytics");

  const guardMap: Record<string, boolean> = {
    "panel:settings": settings.visible,
    "panel:sources": sources.visible,
    "panel:templates": templates.visible,
    "panel:analytics": analytics.visible,
  };

  return QUICK_LINKS.filter((link) => {
    if (!link.visibilityKey) return true;
    return guardMap[link.visibilityKey] !== false;
  });
}

/* ------------------------------------------------------------------ */
/* Icon helper — renders an SVG icon in a colored circle              */
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
/* QuickCard — interactive quick access card with premium feel        */
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
        <p className="m-0 text-md font-semibold text-neutral-900 mb-1">
          {link.title}
        </p>
        <p className="m-0 text-xs text-neutral-500 leading-normal line-clamp-2">
          {link.desc}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ReadinessCard — individual system health card                      */
/* ------------------------------------------------------------------ */

function ReadinessCard({ item, index }: { item: ReadinessItem; index: number }) {
  const isEven = index % 2 === 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3 px-4 rounded-md border border-border-subtle mb-2 transition-all duration-fast hover:bg-brand-50 hover:border-brand-200",
        isEven ? "bg-surface-card" : "bg-surface-inset"
      )}
      data-testid={item.testId}
    >
      <StatusBadge status={item.status} label={item.statusLabel} size="md" />
      <span className="font-semibold text-neutral-900 min-w-[160px] shrink-0 text-sm">
        {item.area}
      </span>
      <span className="text-neutral-600 text-sm leading-normal">
        {item.detail}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RecentJobCard — individual recent job                              */
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
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const filteredLinks = useFilteredQuickLinks();
  const { data, isLoading } = useAnalyticsOverview("last_30d");
  const { data: jobsData, isLoading: jobsLoading } = useJobsList();
  const readinessItems = useReadinessItems(data);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentJobs = ((jobsData as any)?.items || jobsData || []).slice(0, 5);

  return (
    <PageShell
      title="Genel Bakis"
      subtitle="Uretim ve yonetim merkezi. Icerik, kaynak, sablon, is takibi ve sistem ayarlari."
      testId="admin-overview"
    >
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="admin-overview-workflow-note">
        Icerik Olusturma &rarr; Sablon/Stil &rarr; Kaynak &rarr; Is Takibi &rarr; Yayin &rarr; Analytics
      </p>

      {/* ---- Hero / Summary Area ---- */}
      <div className="bg-gradient-to-br from-brand-50 via-brand-100/60 to-surface-page rounded-xl p-4 pb-3 mb-4 border border-brand-200/60 relative overflow-hidden">
        {/* Ambient glow overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 90% 10%, color-mix(in srgb, var(--ch-brand-400) 6%, transparent) 0%, transparent 60%)" }} />
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="m-0 text-md font-bold text-brand-800 tracking-tight font-heading">
              Platform Metrikleri
            </h2>
            <p className="mt-0.5 mb-0 text-xs text-brand-600">
              Son 30 gun
            </p>
          </div>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isLoading
              ? "bg-warning-base shadow-[0_0_0_3px_var(--color-warning-light)]"
              : "bg-success-base shadow-[0_0_0_3px_var(--color-success-light)]"
          )} />
        </div>

        {/* Live Metric Tiles */}
        {isLoading ? (
          <SkeletonMetricGrid count={4} />
        ) : (
          <MetricGrid>
            <MetricTile
              label="Toplam Is"
              value={fmtCount(data?.total_job_count)}
              note="Olusturulan tum isler"
              testId="overview-metric-total-jobs"
              accentColor="var(--ch-brand-500, #4c6ef5)"
            />
            <MetricTile
              label="Basari Orani"
              value={fmtRate(data?.job_success_rate)}
              note="Tamamlanan / toplam is"
              testId="overview-metric-success-rate"
              accentColor="var(--ch-success-base, #2b8a3e)"
            />
            <MetricTile
              label="Toplam Yayin"
              value={fmtCount(data?.published_count)}
              note="Basarili yayin sayisi"
              testId="overview-metric-published"
              accentColor="var(--ch-info-base, #1971c2)"
            />
            <MetricTile
              label="Basarisiz"
              value={fmtCount(data?.failed_publish_count)}
              note="Hata ile sonuclanan yayinlar"
              testId="overview-metric-failed"
              accentColor="var(--ch-error, #e03131)"
            />
          </MetricGrid>
        )}

        {/* Extra row: production duration & retry */}
        {!isLoading && data && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 mt-3">
            <MetricTile
              label="Ort. Uretim Suresi"
              value={fmtDuration(data.avg_production_duration_seconds)}
              note="Is basina ortalama sure"
              testId="overview-metric-avg-duration"
              accentColor="var(--ch-neutral-500, #adb5bd)"
            />
            <MetricTile
              label="Yeniden Deneme Orani"
              value={fmtRate(data.retry_rate)}
              note="Tekrar eden isler"
              testId="overview-metric-retry-rate"
              accentColor="var(--ch-warning-base, #e67700)"
            />
            <MetricTile
              label="Yayin Basari Orani"
              value={fmtRate(data.publish_success_rate)}
              note="Basarili yayin / toplam yayin"
              testId="overview-metric-publish-rate"
              accentColor="var(--ch-success-base, #2b8a3e)"
            />
          </div>
        )}
      </div>

      {/* ---- Two-column: Recent Jobs + System Status ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4 mb-4">
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
              {[0,1,2,3,4].map(i => <SkeletonCard key={i} hasIcon={false} lines={1} />)}
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-sm">
              Henuz is olusturulmamis.
            </div>
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

        {/* System Readiness */}
        <SectionShell
          title="Sistem Durumu"
          description="Ana urun alanlarinin mevcut durumu"
          testId="release-readiness-section"
        >
          <div data-testid="release-readiness-heading" className="hidden">Urun Hazirlik Durumu</div>
          <p className="hidden" data-testid="release-readiness-note">Ana urun alanlarinin mevcut durumu.</p>
          <div className="flex flex-col">
            {readinessItems.map((item, index) => (
              <ReadinessCard key={item.area} item={item} index={index} />
            ))}
          </div>
          <p
            className="mt-3 mb-0 text-xs text-neutral-400"
            data-testid="release-readiness-deferred-note"
          >
            Derin backend entegrasyonu, gercek metrik verisi ve kapsamli gorsel modernizasyon ayri fazlarda ele alinacaktir.
          </p>
        </SectionShell>
      </div>

      {/* ---- Quick Access ---- */}
      <SectionShell testId="admin-quick-access-section">
        <h3 data-testid="admin-quick-access-heading" className="m-0 text-md font-semibold text-neutral-900 mb-3">
          Hizli Erisim
        </h3>
        <div className="grid grid-cols-3 gap-3 stagger-children">
          {filteredLinks.map((link) => (
            <QuickCard
              key={link.to}
              link={link}
              onClick={() => navigate(link.to)}
            />
          ))}
        </div>
      </SectionShell>
    </PageShell>
  );
}
