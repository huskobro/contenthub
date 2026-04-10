/**
 * CanvasProjectDetailPage — Faz 3.
 *
 * Canvas override for `user.projects.detail`. Re-presents the user's content
 * project as a workspace "home base" instead of a flat info sheet:
 *
 *   ┌───────────────────────────────────────────────────────────────────┐
 *   │ Hero: title + status badges + primary action (start production)  │
 *   ├─────────────────────────┬─────────────────────────────────────────┤
 *   │ Preview slot            │ Metadata rail                            │
 *   │ (pending / placeholder) │ (module / stage / owner / dates)         │
 *   ├─────────────────────────┴─────────────────────────────────────────┤
 *   │ Jobs timeline (linked jobs grouped by status)                     │
 *   └───────────────────────────────────────────────────────────────────┘
 *
 * Data contract:
 *   - `useContentProject(projectId)` — single project fetch.
 *   - `fetchJobs()` + client-side filter by `content_project_id` — identical
 *     to the legacy page's behavior.
 *   - `fetchStandardVideos` gated by `project.module_type === "standard_video"`
 *     to find the pending video eligible for production start.
 *   - `startStandardVideoProduction(videoId)` mutation, identical to legacy.
 *   - NO invented backend endpoints.
 *
 * Preview-first:
 *   - The preview slot is explicitly a placeholder pending final render.
 *     Never pretend a render exists when it doesn't.
 */

import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useContentProject } from "../../hooks/useContentProjects";
import { fetchJobs, type JobResponse } from "../../api/jobsApi";
import {
  fetchStandardVideos,
  startStandardVideoProduction,
} from "../../api/standardVideoApi";
import { useToast } from "../../hooks/useToast";
import { StatusBadge, Mono } from "../../components/design-system/primitives";
import { formatDateISO } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standart Video",
  news_bulletin: "Haber Bulteni",
  product_review: "Urun Degerlendirme",
  educational_video: "Egitim Videosu",
  howto_video: "Nasil Yapilir",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  in_progress: "Devam Ediyor",
  rendering: "Render Ediliyor",
  completed: "Tamamlandi",
  failed: "Basarisiz",
  published: "Yayinlandi",
  unpublished: "Yayinlanmadi",
  not_required: "Gerekmiyor",
};

export function CanvasProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const {
    data: project,
    isLoading,
    isError,
    error,
  } = useContentProject(projectId ?? "");

  const { data: allJobs } = useQuery({
    queryKey: ["jobs", { canvasProjectDetail: projectId }],
    queryFn: () => fetchJobs(),
    enabled: !!projectId,
  });

  const { data: linkedVideos } = useQuery({
    queryKey: [
      "standard-videos",
      { content_project_id: projectId, canvas: true },
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

  const pendingVideo = linkedVideos?.find(
    (v) => !["rendering", "completed", "published"].includes(v.status),
  );
  const isRendering = linkedVideos?.some((v) => v.status === "rendering");

  const { mutate: startProduction, isPending: isStarting } = useMutation({
    mutationFn: (videoId: string) => startStandardVideoProduction(videoId),
    onSuccess: (data) => {
      toast.success("Uretim baslatildi.");
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["standard-videos"] });
      qc.invalidateQueries({ queryKey: ["content-projects"] });
      navigate(`/admin/jobs/${data.job_id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Uretim baslatilamadi.");
    },
  });

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-4 max-w-[1280px]"
        data-testid="canvas-project-detail-loading"
      >
        <div className="rounded-xl border border-border-subtle bg-surface-card p-8 text-sm text-neutral-500">
          Proje yukleniyor...
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div
        className="flex flex-col gap-4 max-w-[1280px]"
        data-testid="canvas-project-detail-error"
      >
        <div className="rounded-xl border border-error-base/30 bg-error-light/40 p-6 text-sm text-error-dark">
          {error instanceof Error ? error.message : "Proje bulunamadi."}
        </div>
        <button
          type="button"
          onClick={() => navigate("/user/projects")}
          className="self-start px-3 py-1.5 text-xs font-semibold rounded-md border border-border-subtle hover:bg-neutral-50"
        >
          &larr; Projelere Don
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-5 max-w-[1280px]"
      data-testid="canvas-project-detail"
    >
      {/* Hero ------------------------------------------------------------- */}
      <section
        className={cn(
          "rounded-xl border border-border-subtle bg-surface-card shadow-sm",
          "px-6 py-5",
        )}
        data-testid="canvas-project-hero"
      >
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <nav
              className="text-xs text-neutral-500 font-mono mb-2"
              aria-label="breadcrumb"
              data-testid="canvas-project-breadcrumb"
            >
              <Link
                to="/user/projects"
                className="text-neutral-500 hover:text-brand-600 no-underline"
              >
                workspace / projelerim
              </Link>
              <span className="mx-1">/</span>
              <span className="text-neutral-700">detay</span>
            </nav>
            <h1 className="m-0 text-xl font-semibold text-neutral-900 truncate">
              {project.title}
            </h1>
            <p className="m-0 mt-1 text-sm text-neutral-500">
              {MODULE_LABELS[project.module_type] ?? project.module_type}
            </p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <StatusBadge
                status={project.content_status}
                label={STATUS_LABELS[project.content_status] ?? project.content_status}
              />
              <StatusBadge
                status={project.publish_status}
                label={STATUS_LABELS[project.publish_status] ?? project.publish_status}
              />
              <span className="text-[10px] font-mono uppercase text-neutral-500">
                oncelik: {project.priority}
              </span>
            </div>
          </div>

          {/* Primary action --------------------------------------------------- */}
          <div className="flex flex-col gap-2 shrink-0">
            {project.module_type === "standard_video" && pendingVideo ? (
              <button
                type="button"
                onClick={() => startProduction(pendingVideo.id)}
                disabled={isStarting}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-semibold",
                  "bg-brand-600 text-white hover:bg-brand-700 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
                data-testid="canvas-project-start-production"
              >
                {isStarting ? "Baslatiliyor..." : "▶ Uretime Basla"}
              </button>
            ) : null}
            {project.module_type === "standard_video" && isRendering ? (
              <span
                className="text-xs text-neutral-500 font-mono text-right"
                data-testid="canvas-project-rendering-note"
              >
                ⏳ render devam ediyor
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => navigate("/user/projects")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold",
                "border border-border-subtle hover:bg-neutral-50",
              )}
              data-testid="canvas-project-back-link"
            >
              &larr; Projelere Don
            </button>
          </div>
        </div>
      </section>

      {/* Preview + metadata rail --------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr,1fr] gap-4">
        {/* Preview slot — labeled placeholder, never a fake render */}
        <section
          className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
          data-testid="canvas-project-preview-slot"
        >
          <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50">
            <h2 className="m-0 text-sm font-semibold text-neutral-800">
              On Izleme
            </h2>
            <p className="m-0 mt-0.5 text-xs text-neutral-500">
              Render cikti olustugunda burada gosterilir.
            </p>
          </header>
          <div
            className={cn(
              "h-[240px] flex items-center justify-center",
              "bg-gradient-to-br from-brand-50 via-neutral-50 to-neutral-100",
            )}
          >
            <span className="text-xs font-mono uppercase text-neutral-400">
              on izleme &middot; pending render
            </span>
          </div>
        </section>

        {/* Metadata rail */}
        <section
          className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
          data-testid="canvas-project-metadata"
        >
          <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50">
            <h2 className="m-0 text-sm font-semibold text-neutral-800">
              Proje Bilgileri
            </h2>
          </header>
          <dl className="m-0 px-5 py-3 text-sm text-neutral-800">
            <MetaRow label="Proje ID">
              <Mono>{project.id}</Mono>
            </MetaRow>
            <MetaRow label="Modul">
              {MODULE_LABELS[project.module_type] ?? project.module_type}
            </MetaRow>
            <MetaRow label="Olusturulma">
              {formatDateISO(project.created_at) || "—"}
            </MetaRow>
            <MetaRow label="Guncelleme">
              {formatDateISO(project.updated_at) || "—"}
            </MetaRow>
            {project.active_job_id ? (
              <MetaRow label="Aktif Job">
                <Link
                  to={`/admin/jobs/${project.active_job_id}`}
                  className="text-brand-600 hover:text-brand-700 underline text-sm"
                >
                  {project.active_job_id.slice(0, 12)}&hellip;
                </Link>
              </MetaRow>
            ) : null}
            {project.description ? (
              <MetaRow label="Aciklama">
                <span className="text-neutral-700">{project.description}</span>
              </MetaRow>
            ) : null}
          </dl>
        </section>
      </div>

      {/* Linked jobs timeline ------------------------------------------------ */}
      <section
        className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
        data-testid="canvas-project-jobs"
      >
        <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50 flex items-center gap-3">
          <h2 className="m-0 text-sm font-semibold text-neutral-800 flex-1">
            Bagli Isler
          </h2>
          <span className="text-xs text-neutral-500 font-mono">
            {linkedJobs.length} kayit
          </span>
        </header>
        {linkedJobs.length === 0 ? (
          <div
            className="px-5 py-6 text-center text-sm text-neutral-500"
            data-testid="canvas-project-jobs-empty"
          >
            Henuz bu projeye bagli is yok.
          </div>
        ) : (
          <ul className="list-none m-0 p-0">
            {linkedJobs.map((job) => (
              <li
                key={job.id}
                className={cn(
                  "flex items-center gap-3 px-5 py-3",
                  "border-b border-border-subtle last:border-b-0",
                  "hover:bg-brand-50 cursor-pointer transition-colors",
                )}
                onClick={() => navigate(`/admin/jobs/${job.id}`)}
                data-testid={`canvas-project-job-${job.id}`}
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start py-1.5 border-b border-neutral-100 last:border-b-0">
      <dt className="w-[130px] shrink-0 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </dt>
      <dd className="m-0 text-sm text-neutral-800">{children}</dd>
    </div>
  );
}
