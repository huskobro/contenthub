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

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useContentProject } from "../../hooks/useContentProjects";
import { useJobDetail } from "../../hooks/useJobDetail";
import { usePublishRecordForJob } from "../../hooks/usePublish";
import { fetchJobs, type JobResponse } from "../../api/jobsApi";
import {
  fetchStandardVideos,
  startStandardVideoProduction,
} from "../../api/standardVideoApi";
import { useToast } from "../../hooks/useToast";
import { useAuthStore } from "../../stores/authStore";
import { StatusBadge, Mono } from "../../components/design-system/primitives";
import { VideoPlayer } from "../../components/shared/VideoPlayer";
import { formatDateISO } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

const VIDEO_EXTS = ["mp4", "webm", "mov"];

/**
 * Walk a job's steps and pull the first video artifact path, if any.
 *
 * The backend step schema uses singular string keys (`output_path`,
 * `exported_path`, `artifact_path`). Legacy/forward-compat plural
 * `output_paths` array form is also handled. We scan the most recent
 * step first because the final render is usually at the tail.
 */
function findFirstVideoArtifact(
  steps: ReadonlyArray<{ artifact_refs_json?: string | null }> | null | undefined,
): string | null {
  if (!steps) return null;
  const isVideoPath = (p: unknown): p is string =>
    typeof p === "string" &&
    VIDEO_EXTS.includes(p.split(".").pop()?.toLowerCase() ?? "");
  for (const step of [...steps].reverse()) {
    if (!step.artifact_refs_json) continue;
    try {
      const parsed = JSON.parse(step.artifact_refs_json);
      if (!parsed || typeof parsed !== "object") continue;
      const obj = parsed as Record<string, unknown>;
      // Preferred singular keys first
      for (const key of ["output_path", "exported_path", "artifact_path"]) {
        const v = obj[key];
        if (isVideoPath(v)) return v;
      }
      // Legacy plural array form
      const arr = obj.output_paths;
      if (Array.isArray(arr)) {
        for (const v of arr) if (isVideoPath(v)) return v;
      }
      // Last-ditch: scan every string value on the object
      for (const v of Object.values(obj)) {
        if (isVideoPath(v)) return v;
      }
    } catch {
      /* skip malformed json */
    }
  }
  return null;
}

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

export function CanvasProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  // Non-admin users cannot reach /admin/jobs/:id; route them to their own
  // project workspace and keep admin-only links out of their DOM.
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const openJob = (jobId: string) => {
    if (isAdmin) {
      navigate(`/admin/jobs/${jobId}`);
    } else if (projectId) {
      navigate(`/user/projects/${projectId}`);
    }
  };

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

  // En son job (created_at DESC). active_job_id varsa onu, yoksa
  // listedeki ilk kaydı seçiyoruz — bu, ilerleme durumunu ve son
  // yayın bağlantısını göstermek için yeterli.
  //
  // F33 (critical UX fix pack): Önceki tasarım yalnızca job id'lerini
  // listeliyordu; kullanıcı bir sonraki aksiyonu, canlı ilerlemeyi ve
  // yayın durumunu göremiyordu. Bu ek, mevcut hook'larla yeni bir
  // backend çağrısı eklemeden durumu okunabilir hale getirir.
  const focusJobId = useMemo(() => {
    if (project?.active_job_id) return project.active_job_id;
    if (linkedJobs.length === 0) return null;
    const sorted = [...linkedJobs].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return sorted[0]?.id ?? null;
  }, [project?.active_job_id, linkedJobs]);

  const { data: focusJob } = useJobDetail(focusJobId);
  const { data: focusJobPublishRecords } = usePublishRecordForJob(
    focusJobId ?? undefined,
  );
  const focusPublish = focusJobPublishRecords?.[0];

  // Preview: focus job'un ilk video artifact'ini bulup VideoPlayer'a baglar.
  // Artifact yoksa veya job henuz tamamlanmamissa placeholder gosterilir.
  const focusVideoArtifactPath = useMemo(
    () => findFirstVideoArtifact(focusJob?.steps),
    [focusJob?.steps],
  );
  const focusVideoUrl = useMemo(() => {
    if (!focusJobId || !focusVideoArtifactPath) return null;
    const basename =
      focusVideoArtifactPath.split("/").pop() ?? focusVideoArtifactPath;
    return `/api/v1/jobs/${focusJobId}/artifacts/${encodeURIComponent(basename)}`;
  }, [focusJobId, focusVideoArtifactPath]);

  // Lightbox state for the preview slot — clicking the compact thumbnail
  // opens a full-screen overlay with the real keyboard-controlled VideoPlayer.
  const [previewLightboxOpen, setPreviewLightboxOpen] = useState(false);

  // ESC to close the lightbox. Guarded by open state so we only attach when
  // the overlay is actually visible.
  useEffect(() => {
    if (!previewLightboxOpen) return undefined;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewLightboxOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [previewLightboxOpen]);

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
        className="flex flex-col gap-4 max-w-[1280px]"
        data-testid="canvas-project-detail-loading"
      >
        <div className="rounded-xl border border-border-subtle bg-surface-card p-8 text-sm text-neutral-500">
          Proje yükleniyor...
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
          {error instanceof Error ? error.message : "Proje bulunamadı."}
        </div>
        <button
          type="button"
          onClick={() => navigate("/user/projects")}
          className="self-start px-3 py-1.5 text-xs font-semibold rounded-md border border-border-subtle hover:bg-neutral-50"
        >
          &larr; Projelere Dön
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
                öncelik: <span lang="en">{project.priority}</span>
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
                {isStarting ? "Başlatılıyor..." : "▶ Üretime Başla"}
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
              &larr; Projelere Dön
            </button>
          </div>
        </div>
      </section>

      {/* Preview + metadata rail ---------------------------------------------
          Preview slot shows a compact thumbnail-sized player (max ~320px wide)
          so vertical (9:16) renders don't dominate the page. Clicking the
          player opens a full-screen lightbox overlay for comfortable viewing.
          The metadata rail now expands to fill the remaining horizontal space
          so the right side of the page is no longer empty. */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-4 items-start">
        {/* Preview slot — real VideoPlayer when final render exists,
            labeled placeholder otherwise. Never a fake render. */}
        <section
          className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
          data-testid="canvas-project-preview-slot"
        >
          <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50">
            <h2 className="m-0 text-sm font-semibold text-neutral-800">
              Ön İzleme
            </h2>
            <p className="m-0 mt-0.5 text-xs text-neutral-500">
              {focusVideoUrl
                ? "Büyütmek için tıklayın."
                : "Render çıktı oluştuğunda burada gösterilir."}
            </p>
          </header>
          {focusVideoUrl ? (
            <div className="p-4" data-testid="canvas-project-preview-player">
              <button
                type="button"
                onClick={() => setPreviewLightboxOpen(true)}
                className={cn(
                  "relative group block w-full rounded-lg overflow-hidden",
                  "bg-neutral-900 border border-border-subtle",
                  "cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-brand-400",
                )}
                style={{ maxHeight: "420px" }}
                data-testid="canvas-project-preview-thumb-button"
                aria-label="Ön izlemeyi büyüt"
              >
                <video
                  src={focusVideoUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="block w-full h-auto max-h-[420px] object-contain mx-auto"
                  data-testid="canvas-project-preview-thumb-video"
                />
                {/* Play overlay */}
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center",
                    "bg-black/20 group-hover:bg-black/40 transition-colors",
                  )}
                >
                  <span
                    className={cn(
                      "w-12 h-12 rounded-full bg-white/90 text-neutral-900",
                      "flex items-center justify-center text-xl font-bold",
                      "shadow-lg group-hover:scale-110 transition-transform",
                    )}
                    aria-hidden="true"
                  >
                    ▶
                  </span>
                </div>
              </button>
              <p className="mt-2 mb-0 text-[11px] text-neutral-500 text-center">
                {focusVideoArtifactPath
                  ? focusVideoArtifactPath.split("/").pop()
                  : ""}
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "h-[240px] flex items-center justify-center",
                "bg-gradient-to-br from-brand-50 via-neutral-50 to-neutral-100",
              )}
            >
              <span className="text-xs font-mono uppercase text-neutral-400">
                ön izleme &middot; pending render
              </span>
            </div>
          )}
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
            <MetaRow label="Modül">
              {MODULE_LABELS[project.module_type] ?? project.module_type}
            </MetaRow>
            <MetaRow label="Oluşturulma">
              {formatDateISO(project.created_at) || "—"}
            </MetaRow>
            <MetaRow label="Güncelleme">
              {formatDateISO(project.updated_at) || "—"}
            </MetaRow>
            {project.active_job_id && isAdmin ? (
              <MetaRow label="Aktif Job">
                <Link
                  to={`/admin/jobs/${project.active_job_id}`}
                  className="text-brand-600 hover:text-brand-700 underline text-sm"
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

      {/* Üretim + Yayın durumu (F33 — daha zengin detay) ------------------- */}
      {focusJob && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,1fr] gap-4">
          {/* Üretim özeti — son job'ın adım ilerlemesi */}
          <section
            className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
            data-testid="canvas-project-production-summary"
          >
            <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50 flex items-center gap-2">
              <h2 className="m-0 text-sm font-semibold text-neutral-800 flex-1">
                Üretim Durumu
              </h2>
              <StatusBadge status={focusJob.status} size="sm" />
            </header>
            <div className="px-5 py-3 text-sm text-neutral-800">
              <div className="flex items-center justify-between mb-2 text-xs text-neutral-500">
                <span>
                  Aktif adım:{" "}
                  <Mono>{focusJob.current_step_key ?? "—"}</Mono>
                </span>
                <span>
                  {focusJob.steps.filter((s) => s.status === "completed").length}
                  {" / "}
                  {focusJob.steps.length} tamamlandı
                </span>
              </div>
              <ul className="list-none m-0 p-0 space-y-1">
                {focusJob.steps.map((step) => (
                  <li
                    key={step.step_key}
                    className={cn(
                      "flex items-center gap-2 text-xs",
                      step.status === "completed" && "text-success-text",
                      step.status === "running" && "text-brand-600 font-semibold",
                      step.status === "failed" && "text-error-dark",
                      (step.status === "pending" || step.status === "queued") &&
                        "text-neutral-500",
                    )}
                  >
                    <span className="w-4 shrink-0 text-center">
                      {step.status === "completed"
                        ? "✓"
                        : step.status === "running"
                          ? "▶"
                          : step.status === "failed"
                            ? "✗"
                            : "·"}
                    </span>
                    <Mono>{step.step_key}</Mono>
                    <span className="ml-auto text-[10px] text-neutral-400 font-mono">
                      {step.status}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-neutral-500">
                <span>
                  Toplam:{" "}
                  <Mono>
                    {focusJob.elapsed_total_seconds != null
                      ? `${Math.round(focusJob.elapsed_total_seconds)}s`
                      : "—"}
                  </Mono>
                </span>
                {focusJob.retry_count > 0 && (
                  <span className="text-warning-dark">
                    retry: {focusJob.retry_count}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Yayın bağlantısı */}
          <section
            className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
            data-testid="canvas-project-publish-summary"
          >
            <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50 flex items-center gap-2">
              <h2 className="m-0 text-sm font-semibold text-neutral-800 flex-1">
                Yayın Durumu
              </h2>
              {focusPublish ? (
                <StatusBadge status={focusPublish.status} size="sm" />
              ) : (
                <span className="text-[10px] font-mono uppercase text-neutral-400">
                  henüz yok
                </span>
              )}
            </header>
            <div className="px-5 py-4 text-sm text-neutral-800">
              {focusPublish ? (
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-neutral-600">
                    <span className="capitalize font-semibold">
                      {focusPublish.platform}
                    </span>{" "}
                    üzerinde yayın kaydı mevcut.
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono truncate">
                    id: {focusPublish.id.slice(0, 12)}…
                  </div>
                  <Link
                    to="/user/publish"
                    className="self-start mt-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-brand-400 bg-brand-50 text-brand-700 hover:bg-brand-100 no-underline"
                    data-testid="canvas-project-publish-open"
                  >
                    Yayın Atölyesi'ne Git →
                  </Link>
                </div>
              ) : focusJob.status === "completed" ? (
                <div className="flex flex-col gap-2">
                  <p className="m-0 text-xs text-neutral-600">
                    Üretim tamamlandı. Yayına hazırlamak için{" "}
                    <strong>Yayın Atölyesi</strong>'ni kullanın.
                  </p>
                  <Link
                    to="/user/publish"
                    className="self-start px-3 py-1.5 text-xs font-semibold rounded-md border border-brand-400 bg-brand-50 text-brand-700 hover:bg-brand-100 no-underline"
                  >
                    Yayın Atölyesi'ne Git →
                  </Link>
                </div>
              ) : (
                <p className="m-0 text-xs text-neutral-500">
                  Üretim tamamlandığında burada yayın bağlantısı görünecek.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Linked jobs timeline ------------------------------------------------ */}
      <section
        className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
        data-testid="canvas-project-jobs"
      >
        <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50 flex items-center gap-3">
          <h2 className="m-0 text-sm font-semibold text-neutral-800 flex-1">
            Bağlı İşler
          </h2>
          <span className="text-xs text-neutral-500 font-mono">
            {linkedJobs.length} kayıt
          </span>
        </header>
        {linkedJobs.length === 0 ? (
          <div
            className="px-5 py-6 text-center text-sm text-neutral-500"
            data-testid="canvas-project-jobs-empty"
          >
            Henüz bu projeye bağlı iş yok.
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
                onClick={() => openJob(job.id)}
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

      {/* Lightbox overlay — full-size VideoPlayer with keyboard controls.
          Clicking the backdrop or pressing ESC closes it. */}
      {previewLightboxOpen && focusVideoUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ön izleme"
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center",
            "bg-black/80 backdrop-blur-sm p-4",
          )}
          onClick={() => setPreviewLightboxOpen(false)}
          data-testid="canvas-project-preview-lightbox"
        >
          <div
            className={cn(
              "relative max-w-[min(90vw,800px)] max-h-[90vh]",
              "bg-neutral-900 rounded-xl shadow-2xl overflow-hidden",
              "flex flex-col",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
              <p className="m-0 text-sm font-semibold text-neutral-100 truncate">
                {project.title}
              </p>
              <button
                type="button"
                onClick={() => setPreviewLightboxOpen(false)}
                className={cn(
                  "ml-4 w-8 h-8 rounded-md shrink-0",
                  "text-neutral-300 hover:text-white hover:bg-neutral-800",
                  "flex items-center justify-center text-lg font-bold",
                )}
                aria-label="Kapat"
                data-testid="canvas-project-preview-lightbox-close"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-auto">
              <VideoPlayer
                src={focusVideoUrl}
                title={project.title}
                showDownload
                autoPlay
                testId="canvas-project-preview-video"
              />
            </div>
          </div>
        </div>
      ) : null}
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
