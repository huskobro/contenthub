/**
 * AtriumProjectDetailPage — Faz 4.
 *
 * Atrium override for `user.projects.detail`. Re-presents the project detail
 * as a showcase + control cover page:
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ Large editorial hero (preview-dominant) — title, module, status, │
 *   │ primary action (start production / view render)                  │
 *   ├──────────────────────────┬───────────────────────────────────────┤
 *   │ Production timeline      │ Editorial metadata rail                │
 *   │ (linked jobs grouped)    │ (module / owner / dates / publish)     │
 *   └──────────────────────────┴───────────────────────────────────────┘
 *
 * Data contract (identical to canvas detail):
 *   - `useContentProject(projectId)` single project fetch.
 *   - `useQuery(fetchJobs)` + client-side filter by `content_project_id`.
 *   - `fetchStandardVideos` + `startStandardVideoProduction` for the
 *     standard_video start CTA — same mutation path as canvas.
 *   - `useChannelProfile(id)` for channel name on the metadata rail.
 *   - NO invented backend endpoints.
 *
 * Preview-first discipline:
 *   - The giant preview band is clearly labeled "pending render" when no
 *     render exists. Never a fake thumbnail.
 */

import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useContentProject } from "../../hooks/useContentProjects";
import { useChannelProfile } from "../../hooks/useChannelProfiles";
import { useAuthStore } from "../../stores/authStore";
import { fetchJobs, type JobResponse } from "../../api/jobsApi";
import {
  fetchStandardVideos,
  startStandardVideoProduction,
} from "../../api/standardVideoApi";
import { useToast } from "../../hooks/useToast";
import { StatusBadge, Mono } from "../../components/design-system/primitives";
import { ProjectAutomationPanel } from "../../components/full-auto/ProjectAutomationPanel";
import { formatDateISO } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bülteni",
  product_review: "Ürün Değerlendirme",
  educational_video: "Eğitim Videosu",
  howto_video: "Nasıl Yapılır",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  in_progress: "Devam Ediyor",
  rendering: "Render Ediliyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
  published: "Yayınlandı",
  unpublished: "Yayınlanmadı",
  not_required: "Gerekmiyor",
};

// Group jobs into "canli" vs "gecmis".
const LIVE_STATUSES = new Set([
  "queued",
  "running",
  "pending",
  "scheduled",
  "waiting",
  "waiting_review",
]);

// ---------------------------------------------------------------------------
// Local presentational primitives
// ---------------------------------------------------------------------------

function MetaRow({
  label,
  children,
  testId,
}: {
  label: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <div
      className="flex items-start py-2 border-b border-neutral-200 last:border-b-0"
      data-testid={testId}
    >
      <dt className="w-[130px] shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </dt>
      <dd className="m-0 text-sm text-neutral-800 flex-1 min-w-0 break-words">
        {children}
      </dd>
    </div>
  );
}

function JobRow({
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
        "w-full flex items-center gap-3 px-4 py-3 text-left",
        "border-b border-neutral-200 last:border-b-0",
        "hover:bg-neutral-50 transition-colors",
      )}
      data-testid={`atrium-project-job-${job.id}`}
    >
      <StatusBadge status={job.status} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="m-0 text-sm text-neutral-800">
          <Mono>{job.id.slice(0, 12)}&hellip;</Mono>
        </p>
        <p className="m-0 mt-0.5 text-[10px] text-neutral-500">
          {job.module_type} &middot; {formatDateISO(job.created_at)}
        </p>
      </div>
      <span className="text-[10px] font-mono text-neutral-500 shrink-0">
        {job.current_step_key ?? "—"}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function AtriumProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  // Role guard: only admins can access /admin/jobs/:id — non-admin users
  // should stay in their own project workspace.
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const openJob = (jobId: string) => {
    if (isAdmin) {
      navigate(`/admin/jobs/${jobId}`);
    } else if (projectId) {
      // Non-admin: stay on the project detail page (refresh scroll)
      navigate(`/user/projects/${projectId}`);
    }
  };

  const {
    data: project,
    isLoading,
    isError,
    error,
  } = useContentProject(projectId ?? "");

  const { data: channel } = useChannelProfile(
    project?.channel_profile_id ?? "",
  );

  const { data: allJobs } = useQuery({
    queryKey: ["jobs", { atriumProjectDetail: projectId }],
    queryFn: () => fetchJobs(),
    enabled: !!projectId,
  });

  const { data: linkedVideos } = useQuery({
    queryKey: [
      "standard-videos",
      { content_project_id: projectId, atrium: true },
    ],
    queryFn: () => fetchStandardVideos({ limit: 10 }),
    enabled: !!projectId && project?.module_type === "standard_video",
    select: (videos) => videos.filter((v) => v.content_project_id === projectId),
  });

  const linkedJobs = useMemo(
    () =>
      (allJobs ?? []).filter(
        (j: JobResponse) => j.content_project_id === projectId,
      ),
    [allJobs, projectId],
  );

  const liveJobs = useMemo(
    () => linkedJobs.filter((j) => LIVE_STATUSES.has(j.status)),
    [linkedJobs],
  );
  const historyJobs = useMemo(
    () => linkedJobs.filter((j) => !LIVE_STATUSES.has(j.status)),
    [linkedJobs],
  );

  const pendingVideo = linkedVideos?.find(
    (v) => !["rendering", "completed", "published"].includes(v.status),
  );
  const isRendering = linkedVideos?.some((v) => v.status === "rendering");

  const { mutate: startProduction, isPending: isStarting } = useMutation({
    mutationFn: (videoId: string) => startStandardVideoProduction(videoId),
    onSuccess: (data) => {
      toast.success("Üretim başlatıldı.");
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["standard-videos"] });
      qc.invalidateQueries({ queryKey: ["content-projects"] });
      // Admins hop into job cockpit; non-admin users stay on the project
      // detail (they don't have /admin access).
      if (isAdmin) {
        navigate(`/admin/jobs/${data.job_id}`);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Üretim başlatılamadı.");
    },
  });

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-4"
        data-testid="atrium-project-detail-loading"
      >
        <div className="rounded-3xl border border-neutral-200 bg-white p-12 text-center text-sm text-neutral-500">
          Stüdyo yükleniyor...
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div
        className="flex flex-col gap-4"
        data-testid="atrium-project-detail-error"
      >
        <div className="rounded-3xl border border-red-300 bg-red-50 p-8 text-sm text-red-700">
          {error instanceof Error ? error.message : "Proje bulunamadı."}
        </div>
        <button
          type="button"
          onClick={() => navigate("/user/projects")}
          className="self-start px-4 py-2 rounded-full text-xs font-semibold border border-neutral-300 hover:bg-neutral-100"
        >
          ← Portföye Dön
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-8"
      data-testid="atrium-project-detail"
    >
      {/* Showcase hero --------------------------------------------------- */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl",
          "border border-neutral-200 shadow-2xl",
          "bg-gradient-to-br from-neutral-900 via-indigo-950 to-neutral-900",
          "text-neutral-50",
        )}
        data-testid="atrium-project-hero"
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.45),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(236,72,153,0.35),transparent_60%)]"
        />

        {/* Top nav strip -------------------------------------------------- */}
        <nav
          className="relative flex items-center gap-2 px-6 md:px-10 pt-6 text-[11px] font-mono text-neutral-400"
          aria-label="breadcrumb"
          data-testid="atrium-project-breadcrumb"
        >
          <Link
            to="/user"
            className="text-neutral-400 hover:text-neutral-200 no-underline"
          >
            showcase
          </Link>
          <span>/</span>
          <Link
            to="/user/projects"
            className="text-neutral-400 hover:text-neutral-200 no-underline"
          >
            portfolio
          </Link>
          <span>/</span>
          <span className="text-neutral-200">stüdyo</span>
        </nav>

        {/* Preview band (showcase hero) ---------------------------------- */}
        <div
          className="relative mx-6 md:mx-10 mt-5 rounded-2xl overflow-hidden border border-white/10"
          data-testid="atrium-project-preview-slot"
        >
          <div
            className={cn(
              "h-[220px] md:h-[280px]",
              "bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-amber-300",
              "relative flex items-center justify-center",
            )}
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,rgba(255,255,255,0.35),transparent_60%)]"
            />
            <span className="relative text-xs font-mono uppercase tracking-[0.2em] text-white/80">
              ön izleme · pending render
            </span>
          </div>
        </div>

        {/* Title + actions ----------------------------------------------- */}
        <div className="relative px-6 md:px-10 py-6 md:py-7 flex flex-col md:flex-row gap-5 md:gap-8 items-start md:items-end">
          <div className="flex-1 min-w-0">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-300">
              {MODULE_LABELS[project.module_type] ?? project.module_type}
            </p>
            <h1 className="m-0 mt-2 text-2xl md:text-3xl font-bold text-white leading-tight">
              {project.title}
            </h1>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <StatusBadge
                status={project.content_status}
                label={
                  STATUS_LABELS[project.content_status] ?? project.content_status
                }
              />
              <StatusBadge
                status={project.publish_status}
                label={
                  STATUS_LABELS[project.publish_status] ?? project.publish_status
                }
              />
              <span className="text-[10px] font-mono uppercase text-indigo-200">
                öncelik: <span lang="en">{project.priority}</span>
              </span>
              {project.active_job_id ? (
                <span className="text-[10px] font-mono uppercase text-amber-300">
                  ⚡ canlı iş
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {project.module_type === "standard_video" && pendingVideo ? (
              <button
                type="button"
                onClick={() => startProduction(pendingVideo.id)}
                disabled={isStarting}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-semibold",
                  "bg-white text-neutral-900 hover:bg-neutral-200 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
                data-testid="atrium-project-start-production"
              >
                {isStarting ? "Başlatılıyor..." : "▶ Üretime Başla"}
              </button>
            ) : null}
            {project.module_type === "standard_video" && isRendering ? (
              <span
                className="text-xs font-mono uppercase text-amber-300"
                data-testid="atrium-project-rendering-note"
              >
                ⏳ render devam ediyor
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => navigate("/user/publish")}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-semibold",
                "border border-white/30 text-white hover:bg-white/10 transition-colors",
              )}
              data-testid="atrium-project-open-publish"
            >
              Dağıtım Atölyesi →
            </button>
            <button
              type="button"
              onClick={() => navigate("/user/projects")}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-semibold",
                "border border-white/30 text-white hover:bg-white/10 transition-colors",
              )}
              data-testid="atrium-project-back-link"
            >
              ← Portföy
            </button>
          </div>
        </div>
      </section>

      {/* Two-column body ------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr,1fr] gap-8">
        {/* Production timeline -------------------------------------------- */}
        <section
          className="flex flex-col gap-5"
          data-testid="atrium-project-jobs"
        >
          <div className="border-b border-neutral-200 pb-2">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Production Timeline
            </p>
            <h2 className="m-0 mt-0.5 text-lg font-semibold text-neutral-900">
              Bağlı işler
            </h2>
          </div>

          {linkedJobs.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center text-sm text-neutral-500"
              data-testid="atrium-project-jobs-empty"
            >
              Henüz bu yapıma bağlı iş yok. Üretim başlatıldığında burada
              görünür.
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {liveJobs.length > 0 ? (
                <div
                  className="rounded-2xl border border-indigo-200 bg-white overflow-hidden"
                  data-testid="atrium-project-jobs-live"
                >
                  <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-200">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
                      Canlı ({liveJobs.length})
                    </span>
                  </div>
                  {liveJobs.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      onOpen={() => openJob(job.id)}
                    />
                  ))}
                </div>
              ) : null}
              {historyJobs.length > 0 ? (
                <div
                  className="rounded-2xl border border-neutral-200 bg-white overflow-hidden"
                  data-testid="atrium-project-jobs-history"
                >
                  <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-600">
                      Geçmiş ({historyJobs.length})
                    </span>
                  </div>
                  {historyJobs.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      onOpen={() => openJob(job.id)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>

        {/* Editorial metadata rail ---------------------------------------- */}
        <section
          className="flex flex-col gap-5"
          data-testid="atrium-project-metadata"
        >
          <div className="border-b border-neutral-200 pb-2">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Editoryal Bilgi
            </p>
            <h2 className="m-0 mt-0.5 text-lg font-semibold text-neutral-900">
              Yapım detayları
            </h2>
          </div>

          <dl className="m-0 rounded-2xl border border-neutral-200 bg-white px-5 py-2">
            <MetaRow label="Yapım ID">
              <Mono>{project.id}</Mono>
            </MetaRow>
            <MetaRow label="Modül">
              {MODULE_LABELS[project.module_type] ?? project.module_type}
            </MetaRow>
            <MetaRow label="Kanal">
              {channel ? (
                <Link
                  to={`/user/channels/${channel.id}`}
                  className="text-indigo-600 hover:text-indigo-700 no-underline"
                >
                  {channel.profile_name}
                </Link>
              ) : (
                <span className="text-neutral-500">—</span>
              )}
            </MetaRow>
            <MetaRow label="İnceleme">
              <StatusBadge
                status={project.review_status}
                label={
                  STATUS_LABELS[project.review_status] ?? project.review_status
                }
                size="sm"
              />
            </MetaRow>
            <MetaRow label="Oluşturulma">
              {formatDateISO(project.created_at) || "—"}
            </MetaRow>
            <MetaRow label="Güncelleme">
              {formatDateISO(project.updated_at) || "—"}
            </MetaRow>
            {project.deadline_at ? (
              <MetaRow label="Son Tarih">
                {formatDateISO(project.deadline_at) || "—"}
              </MetaRow>
            ) : null}
            {project.active_job_id && isAdmin ? (
              <MetaRow label="Aktif Job">
                <Link
                  to={`/admin/jobs/${project.active_job_id}`}
                  className="text-indigo-600 hover:text-indigo-700 underline text-sm"
                >
                  {project.active_job_id.slice(0, 12)}&hellip;
                </Link>
              </MetaRow>
            ) : project.active_job_id ? (
              <MetaRow label="Aktif Job">
                <span className="text-neutral-600 text-sm font-mono">
                  {project.active_job_id.slice(0, 12)}&hellip;
                </span>
              </MetaRow>
            ) : null}
            {project.description ? (
              <MetaRow label="Açıklama">
                <span className="text-neutral-700">{project.description}</span>
              </MetaRow>
            ) : null}
          </dl>
        </section>
      </div>

      {/* Automation — collapsible (#11) ------------------------------------ */}
      {projectId && (
        <CollapsibleAutomationSection
          projectId={projectId}
          moduleType={project.module_type}
        />
      )}

    </div>
  );
}

/**
 * Collapsible automation section (#11) — Atrium style.
 * Header always visible, content toggles. Default: closed.
 */
function CollapsibleAutomationSection({
  projectId,
  moduleType,
}: {
  projectId: string;
  moduleType: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section
      className="rounded-3xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
      data-testid="atrium-project-automation-section"
    >
      <button
        type="button"
        onClick={() => setOpen((v: boolean) => !v)}
        className={cn(
          "w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer",
          "bg-gradient-to-r from-brand-50/50 to-neutral-50",
          "hover:from-brand-50/70 hover:to-neutral-100/60 transition-colors",
          open && "border-b border-border-subtle",
        )}
        data-testid="atrium-project-automation-toggle"
      >
        <div>
          <p className="m-0 text-sm font-semibold text-neutral-800">
            Otomasyon
          </p>
          <p className="m-0 mt-0.5 text-[10px] text-neutral-500">
            Proje bazli tam otomatik mod, zamanlama ve koruma ayarlari.
          </p>
        </div>
        <span
          className={cn(
            "text-neutral-400 text-xs transition-transform duration-200",
            open && "rotate-180",
          )}
        >
          ▼
        </span>
      </button>
      {open && (
        <div className="px-6 py-5">
          <ProjectAutomationPanel
            projectId={projectId}
            moduleType={moduleType}
            testId="atrium-project-automation"
          />
        </div>
      )}
    </section>
  );
}
