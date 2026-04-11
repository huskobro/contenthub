import { useParams, useNavigate } from "react-router-dom";
import { useJobDetail } from "../../hooks/useJobDetail";
import { useSSE } from "../../hooks/useSSE";
import { usePublishRecordForJob, useCreatePublishRecordFromJob } from "../../hooks/usePublish";
import { JobOverviewPanel } from "../../components/jobs/JobOverviewPanel";
import { JobTimelinePanel } from "../../components/jobs/JobTimelinePanel";
import { JobSystemPanels } from "../../components/jobs/JobSystemPanels";
import { JobActionsPanel } from "../../components/jobs/JobActionsPanel";
import {
  PageShell,
  Mono,
  SectionShell,
  ActionButton,
  StatusBadge,
} from "../../components/design-system/primitives";
import { useToast } from "../../hooks/useToast";
import { VideoPlayer } from "../../components/shared/VideoPlayer";
import type { JobStepResponse } from "../../api/jobsApi";
import { useSurfacePageOverride } from "../../surfaces/SurfaceContext";

const VIDEO_EXTS = ["mp4", "webm", "mov"];
const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp"];

function extractOutputArtifacts(steps: JobStepResponse[]): { videos: string[]; images: string[]; others: string[] } {
  const videos: string[] = [];
  const images: string[] = [];
  const others: string[] = [];

  const classify = (p: unknown) => {
    if (typeof p !== "string") return;
    const ext = p.split(".").pop()?.toLowerCase() ?? "";
    if (VIDEO_EXTS.includes(ext)) videos.push(p);
    else if (IMAGE_EXTS.includes(ext)) images.push(p);
    else others.push(p);
  };

  for (const step of steps) {
    if (!step.artifact_refs_json) continue;
    try {
      const parsed = JSON.parse(step.artifact_refs_json);
      if (!parsed || typeof parsed !== "object") continue;
      const obj = parsed as Record<string, unknown>;
      // Singular string keys (current schema)
      for (const key of ["output_path", "exported_path", "artifact_path"]) {
        classify(obj[key]);
      }
      // Legacy array fallback
      const arr = obj.output_paths;
      if (Array.isArray(arr)) {
        for (const p of arr) classify(p);
      }
      // Generic string scan (catches thumbnail_path, poster_path etc.)
      for (const [k, v] of Object.entries(obj)) {
        if (k === "output_path" || k === "exported_path" || k === "artifact_path" || k === "output_paths") continue;
        classify(v);
      }
    } catch { /* skip malformed JSON */ }
  }

  return { videos, images, others };
}

function artifactUrl(jobId: string, path: string): string {
  // Extract just the filename from the full path
  const filename = path.split("/").pop() ?? path;
  return `/api/v1/jobs/${jobId}/artifacts/${encodeURIComponent(filename)}`;
}

function publishStatusVariant(status: string): string {
  switch (status) {
    case "published": return "ready";
    case "approved": return "info";
    case "scheduled": return "info";
    case "publishing": return "processing";
    case "pending_review": return "warning";
    case "draft": return "draft";
    case "failed": return "failed";
    case "cancelled": return "failed";
    case "review_rejected": return "failed";
    default: return "draft";
  }
}

/**
 * Public entry point. Delegates to a surface override when the active admin
 * surface declares one for `admin.jobs.detail` (Faz 2: Bridge cockpit).
 * Otherwise falls through to the legacy implementation below.
 */
export function JobDetailPage() {
  const Override = useSurfacePageOverride("admin.jobs.detail");
  if (Override) return <Override />;
  return <LegacyJobDetailPage />;
}

function LegacyJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: job, isLoading, isError, error } = useJobDetail(jobId ?? null);
  const { data: publishRecords } = usePublishRecordForJob(jobId);
  const createPublishMutation = useCreatePublishRecordFromJob();

  const isActiveJob = !!job && ["queued", "running", "processing", "retrying"].includes(job.status);
  const { connected: sseConnected, reconnecting: sseReconnecting } = useSSE({
    url: `/api/v1/sse/jobs/${jobId}`,
    enabled: !!jobId && isActiveJob,
    invalidateKeys: [["job", jobId ?? ""]],
    eventTypes: ["job:status_changed", "job:step_changed"],
  });

  if (isLoading) {
    return (
      <PageShell title="Job Detayı" breadcrumb={[{ label: "Isler", to: "/admin/jobs" }, { label: "Detay" }]} testId="job-detail-loading">
        <p className="text-neutral-500">Yükleniyor...</p>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell title="Job Detayı" breadcrumb={[{ label: "Isler", to: "/admin/jobs" }, { label: "Detay" }]} testId="job-detail">
        <p className="text-error">
          Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </p>
      </PageShell>
    );
  }

  if (!job) {
    return (
      <PageShell title="Job Detayı" breadcrumb={[{ label: "Isler", to: "/admin/jobs" }, { label: "Detay" }]} testId="job-detail">
        <p className="text-neutral-500">Job bulunamadi.</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Job Detayı"
      subtitle={`Modul: ${job.module_type}`}
      breadcrumb={[{ label: "Isler", to: "/admin/jobs" }, { label: "Detay" }]}
      testId="job-detail"
    >
      <p className="m-0 mb-2 text-sm text-neutral-600">
        Job ID: <Mono>{job.id}</Mono>
      </p>
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="job-detail-workflow-note">
        Ilerleme, adimlar, sure ve operasyonel aksiyonlar (retry, cancel, skip).
      </p>

      {/* SSE connection indicator — only show when disconnected for active jobs */}
      {isActiveJob && !sseConnected && (
        <div
          className={`flex items-center gap-2 text-xs text-warning-dark bg-warning-light border border-warning rounded px-3 py-1.5 mb-3 ${sseReconnecting ? "animate-pulse" : ""}`}
          data-testid="sse-connection-banner"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-warning shrink-0" />
          Canli baglanti kesildi — yeniden baglaniliyor...
        </div>
      )}

      <JobOverviewPanel job={job} />
      <JobTimelinePanel steps={job.steps} />
      <JobSystemPanels steps={job.steps} jobId={job.id} />
      <JobActionsPanel job={job} />

      {/* Ciktilar */}
      {(() => {
        const { videos, images } = extractOutputArtifacts(job.steps);
        const hasOutputs = videos.length > 0 || images.length > 0;

        return (
          <SectionShell title="Ciktilar" testId="job-outputs">
            {hasOutputs ? (
              <div className="flex flex-col gap-4">
                {videos.map((v, i) => (
                  <VideoPlayer
                    key={v}
                    src={artifactUrl(job.id, v)}
                    title={videos.length > 1 ? `Video ${i + 1}` : undefined}
                    showDownload
                    testId={`job-output-video-${i}`}
                  />
                ))}
                {images.map((img, i) => (
                  <div key={img} className="flex flex-col gap-1">
                    {images.length > 1 && (
                      <span className="text-xs text-neutral-500">Gorsel {i + 1}</span>
                    )}
                    <img
                      src={artifactUrl(job.id, img)}
                      alt={`Output ${i + 1}`}
                      className="rounded-lg object-contain bg-neutral-100 border border-border-subtle max-h-96 w-full"
                      data-testid={`job-output-image-${i}`}
                    />
                    <span className="text-xs text-neutral-400 truncate" title={img}>
                      {img.split("/").pop()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 m-0 py-2">Henuz cikti yok.</p>
            )}
          </SectionShell>
        );
      })()}

      {/* Yayın Durumu */}
      <SectionShell title="Yayin Durumu" testId="job-publish-linkage">
        {publishRecords && publishRecords.length > 0 ? (
          <div className="flex items-center gap-3 py-2">
            <StatusBadge status={publishStatusVariant(publishRecords[0].status)} label={publishRecords[0].status} />
            <span className="text-sm text-neutral-600 capitalize">{publishRecords[0].platform}</span>
            <button
              className="text-brand-600 bg-transparent border-none cursor-pointer p-0 text-sm font-medium ml-auto"
              onClick={() => navigate(`/admin/publish/${publishRecords[0].id}`)}
              data-testid="job-publish-detail-link"
            >
              Detay &rarr;
            </button>
          </div>
        ) : job.status === "completed" ? (
          <div className="flex items-center gap-3 py-2">
            <span className="text-sm text-neutral-500">Yayin kaydi bulunamadi.</span>
            <ActionButton
              variant="primary"
              size="sm"
              loading={createPublishMutation.isPending}
              onClick={async () => {
                try {
                  const record = await createPublishMutation.mutateAsync({
                    jobId: job.id,
                    body: {
                      platform: "youtube",
                      content_ref_type: job.module_type,
                    },
                  });
                  toast.success("Yayin kaydi olusturuldu.");
                  navigate(`/admin/publish/${record.id}`);
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "Islem basarisiz.");
                }
              }}
              data-testid="job-create-publish-btn"
            >
              Yayina Hazirla
            </ActionButton>
          </div>
        ) : (
          <p className="text-sm text-neutral-400 m-0 py-2">Job tamamlandiginda yayin kaydi olusturulabilir.</p>
        )}
      </SectionShell>
    </PageShell>
  );
}
