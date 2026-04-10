/**
 * CanvasUserDashboardPage — Faz 3.
 *
 * Canvas override for `user.dashboard`. This is the first visibly-new user
 * page in ContentHub. It presents the dashboard as a project-centric
 * workspace home:
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ Hero: welcome + create CTAs                                 │
 *   ├─────────────────────────┬───────────────────────────────────┤
 *   │ Active projects column  │ In-flight work column              │
 *   │ (preview-first cards)   │ (jobs + recent publishes)          │
 *   └─────────────────────────┴───────────────────────────────────┘
 *
 * Data contract:
 *   - Uses REAL hooks: useAuthStore, useOnboardingStatus, useContentProjects,
 *     useChannelProfiles, and fetchJobs via React Query.
 *   - No invented backend endpoints.
 *   - No fake previews / metrics — preview slots are clearly labeled as
 *     placeholders pending render output (preview-first thinking, not
 *     preview-faking).
 *
 * Fallback:
 *   - This component is mounted only when Canvas is the active user surface.
 *     The legacy UserDashboardPage falls through the trampoline when Canvas
 *     is off, scope-mismatched, or disabled.
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useOnboardingStatus } from "../../hooks/useOnboardingStatus";
import { useContentProjects } from "../../hooks/useContentProjects";
import { useChannelProfiles } from "../../hooks/useChannelProfiles";
import { fetchJobs, type JobResponse } from "../../api/jobsApi";
import type { ContentProjectResponse } from "../../api/contentProjectsApi";
import { StatusBadge } from "../../components/design-system/primitives";
import { cn } from "../../lib/cn";

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bülteni",
  product_review: "Ürün Değerlendirme",
  educational_video: "Eğitim Videosu",
  howto_video: "Nasıl Yapılır",
};

// ---------------------------------------------------------------------------
// Small presentational primitives — kept local so the dashboard is a single
// readable unit and we don't accidentally spawn a new design system.
// ---------------------------------------------------------------------------

function WorkspaceCard({
  title,
  subtitle,
  children,
  testId,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  testId?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
      data-testid={testId}
    >
      <header className="flex items-center gap-3 px-5 py-3 border-b border-border-subtle bg-neutral-50/50">
        <div className="flex-1 min-w-0">
          <h2 className="m-0 text-sm font-semibold text-neutral-800 truncate">
            {title}
          </h2>
          {subtitle ? (
            <p className="m-0 mt-0.5 text-xs text-neutral-500 truncate">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </header>
      <div>{children}</div>
    </section>
  );
}

function ProjectPreviewTile({
  project,
  onOpen,
}: {
  project: ContentProjectResponse;
  onOpen: () => void;
}) {
  // Canvas is preview-first: the tile shows a preview slot even if we don't
  // have a thumbnail yet. The empty slot is LABELED as a pending state — we
  // never pretend a render exists when it doesn't.
  const moduleLabel = MODULE_LABELS[project.module_type] ?? project.module_type;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group text-left w-full rounded-lg border border-border-subtle bg-surface-card",
        "hover:border-brand-400 hover:shadow-md transition-all duration-fast",
        "flex gap-3 p-3 cursor-pointer",
      )}
      data-testid={`canvas-project-tile-${project.id}`}
    >
      {/* Preview slot — labeled placeholder, not a fake render. */}
      <div
        className={cn(
          "w-[96px] h-[54px] shrink-0 rounded-md border border-dashed border-border-subtle",
          "bg-gradient-to-br from-brand-50 to-neutral-50",
          "flex items-center justify-center",
        )}
        data-testid={`canvas-project-preview-slot-${project.id}`}
      >
        <span className="text-[9px] font-mono uppercase text-neutral-400">
          ön izleme
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="m-0 text-sm font-semibold text-neutral-800 truncate">
            {project.title}
          </p>
          <StatusBadge status={project.content_status} size="sm" />
        </div>
        <p className="m-0 mt-1 text-xs text-neutral-500">
          {moduleLabel} &middot;{" "}
          {new Date(project.created_at).toLocaleDateString("tr-TR")}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <StatusBadge status={project.publish_status} size="sm" />
          {project.active_job_id ? (
            <span className="text-[10px] font-mono text-brand-600">
              aktif iş
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function InFlightRow({
  job,
  onOpen,
}: {
  job: JobResponse;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-left",
        "border-b border-border-subtle last:border-b-0",
        "hover:bg-brand-50 transition-colors duration-fast cursor-pointer",
      )}
      data-testid={`canvas-inflight-job-${job.id}`}
    >
      <StatusBadge status={job.status} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="m-0 text-sm text-neutral-800 truncate">
          {MODULE_LABELS[job.module_type] ?? job.module_type}
        </p>
        <p className="m-0 text-[10px] font-mono text-neutral-500 truncate">
          {job.id.slice(0, 12)}&hellip;
        </p>
      </div>
      <span className="text-[10px] text-neutral-500 shrink-0">
        {job.current_step_key ?? "—"}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function CanvasUserDashboardPage() {
  const navigate = useNavigate();
  const { data: onboardingStatus } = useOnboardingStatus();
  const authUser = useAuthStore((s) => s.user);

  const userId = authUser?.id;
  const displayName = authUser?.display_name ?? "Kullanıcı";

  const { data: projects, isLoading: projectsLoading } = useContentProjects(
    userId ? { user_id: userId, limit: 12 } : undefined,
  );
  const { data: channels } = useChannelProfiles(userId);
  const { data: allJobs } = useQuery({
    queryKey: ["jobs", { canvasDashboard: true }],
    queryFn: () => fetchJobs(),
  });

  const onboardingCompleted =
    onboardingStatus && onboardingStatus.onboarding_required === false;

  const activeProjects = useMemo(() => (projects ?? []).slice(0, 6), [projects]);

  // Jobs that are still moving — pending/running/queued are the "in flight"
  // bucket. Completed / failed etc fall into history and are hidden from the
  // workspace dashboard (the detail page still shows everything).
  const IN_FLIGHT_STATUSES = new Set([
    "queued",
    "running",
    "pending",
    "scheduled",
    "waiting",
    "waiting_review",
  ]);
  const inFlightJobs = useMemo(() => {
    const rows = allJobs ?? [];
    return rows
      .filter((j) => IN_FLIGHT_STATUSES.has(j.status))
      .slice(0, 8);
  }, [allJobs]);

  // Project counts by status — workspace health ribbon.
  const projectStats = useMemo(() => {
    const rows = projects ?? [];
    return {
      total: rows.length,
      draft: rows.filter((p) => p.content_status === "draft").length,
      inProgress: rows.filter((p) => p.content_status === "in_progress").length,
      completed: rows.filter((p) => p.content_status === "completed").length,
      channels: (channels ?? []).length,
    };
  }, [projects, channels]);

  return (
    <div
      className="flex flex-col gap-5 max-w-[1280px]"
      data-testid="canvas-user-dashboard"
    >
      {/* Hero ------------------------------------------------------------- */}
      <section
        className={cn(
          "rounded-xl border border-border-subtle bg-surface-card shadow-sm",
          "px-6 py-5 flex items-center gap-5",
        )}
        data-testid="canvas-dashboard-hero"
      >
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-brand-600">
            Canvas Çalışma Alanı
          </p>
          <h1 className="m-0 mt-1 text-xl font-semibold text-neutral-900">
            Hoş geldin, {displayName}
          </h1>
          <p className="m-0 mt-1 text-sm text-neutral-500">
            Proje merkezli yaratıcı çalışma alanın. Buradan yeni içerik
            başlat, aktif işleri takip et, yayınlanan içeriği gör.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/user/create/video")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-semibold",
              "bg-brand-600 text-white hover:bg-brand-700 transition-colors",
            )}
            data-testid="canvas-dashboard-create-video"
          >
            + Yeni Video
          </button>
          <button
            type="button"
            onClick={() => navigate("/user/create/bulletin")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-semibold",
              "border border-border-subtle hover:bg-brand-50 hover:border-brand-400 transition-colors",
            )}
            data-testid="canvas-dashboard-create-bulletin"
          >
            + Yeni Bülten
          </button>
        </div>
      </section>

      {/* Onboarding guard ------------------------------------------------- */}
      {!onboardingCompleted ? (
        <div
          className="rounded-xl border border-warning-base/30 bg-warning-light/40 p-5"
          data-testid="canvas-onboarding-pending"
        >
          <p className="m-0 text-sm font-semibold text-neutral-800">
            Kurulum tamamlanmadı
          </p>
          <p className="m-0 mt-1 text-xs text-neutral-600">
            Canvas çalışma alanını kullanmak için önce kurulum adımlarını tamamla.
          </p>
          <button
            type="button"
            onClick={() => navigate("/onboarding")}
            className="mt-3 px-3 py-1.5 rounded-md text-xs font-semibold bg-warning-base text-white"
          >
            Kuruluma Başla
          </button>
        </div>
      ) : null}

      {/* Workspace health ribbon ------------------------------------------ */}
      <div
        className="grid grid-cols-2 sm:grid-cols-5 gap-2"
        data-testid="canvas-dashboard-stats"
      >
        <StatTile label="Toplam Proje" value={projectStats.total} />
        <StatTile label="Taslak" value={projectStats.draft} />
        <StatTile label="Devam" value={projectStats.inProgress} />
        <StatTile label="Tamamlanan" value={projectStats.completed} />
        <StatTile label="Kanal" value={projectStats.channels} />
      </div>

      {/* Two-column main ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr,1fr] gap-5">
        {/* Active projects */}
        <WorkspaceCard
          title="Aktif Projelerim"
          subtitle="Son çalıştığın projeler"
          testId="canvas-dashboard-active-projects"
          action={
            activeProjects.length > 0 ? (
              <button
                type="button"
                onClick={() => navigate("/user/projects")}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Tümünü Gör
              </button>
            ) : undefined
          }
        >
          {projectsLoading ? (
            <div className="p-5 text-sm text-neutral-500">Yükleniyor...</div>
          ) : activeProjects.length === 0 ? (
            <div
              className="p-6 text-center"
              data-testid="canvas-dashboard-projects-empty"
            >
              <p className="m-0 text-sm text-neutral-600">
                Henüz projen yok.
              </p>
              <p className="m-0 mt-1 text-xs text-neutral-500">
                Yukarıdaki butonlardan ilk projeni başlatabilirsin.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
              {activeProjects.map((project) => (
                <ProjectPreviewTile
                  key={project.id}
                  project={project}
                  onOpen={() => navigate(`/user/projects/${project.id}`)}
                />
              ))}
            </div>
          )}
        </WorkspaceCard>

        {/* In-flight work */}
        <WorkspaceCard
          title="Çalışan İşler"
          subtitle="Şu anda kuyrukta veya devam eden render/üretim işleri"
          testId="canvas-dashboard-inflight"
        >
          {inFlightJobs.length === 0 ? (
            <div
              className="p-6 text-center"
              data-testid="canvas-dashboard-inflight-empty"
            >
              <p className="m-0 text-sm text-neutral-600">
                Şu anda çalışan bir iş yok.
              </p>
              <p className="m-0 mt-1 text-xs text-neutral-500">
                Yeni bir proje başlattığında burada görünür.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {inFlightJobs.map((job) => (
                <InFlightRow
                  key={job.id}
                  job={job}
                  onOpen={() => navigate(`/admin/jobs/${job.id}`)}
                />
              ))}
            </div>
          )}
        </WorkspaceCard>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-lg border border-border-subtle bg-surface-card px-3 py-2"
      data-testid={`canvas-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold text-neutral-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}
