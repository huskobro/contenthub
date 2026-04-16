/**
 * JobDetailBody — PHASE AD.
 *
 * Tek kaynaktan iki surface (admin + user) için kullanılan job detail içeriği.
 * Parallel pattern yaratmadan aynı body her iki panel'de render edilir.
 *
 * - `basePath` — `/admin` veya `/user`. Breadcrumb ve iç linkler (publish
 *   detay, jobs listesi) buna göre üretilir.
 * - `titleLabel` — başlık; admin için "Job Detayı", user için "İş Detayı".
 * - Ownership filtresi backend tarafında zaten uygulandığı için body'nin
 *   kendisi ekstra bir gate yapmaz; user erişilmemesi gereken bir job'a
 *   istek atarsa backend 403/404 döner ve `useJobDetail` error state'i
 *   sayfayı "Job bulunamadi" olarak gösterir.
 */

import { useParams, useNavigate } from "react-router-dom";
import { useJobDetail } from "../../hooks/useJobDetail";
import { useSSE } from "../../hooks/useSSE";
import { usePublishRecordForJob, useCreatePublishRecordFromJob } from "../../hooks/usePublish";
import { JobOverviewPanel } from "./JobOverviewPanel";
import { JobTimelinePanel } from "./JobTimelinePanel";
import { JobSystemPanels } from "./JobSystemPanels";
import { JobActionsPanel } from "./JobActionsPanel";
import {
  PageShell,
  Mono,
  SectionShell,
  ActionButton,
  StatusBadge,
} from "../design-system/primitives";
import { useToast } from "../../hooks/useToast";
import { VideoPlayer } from "../shared/VideoPlayer";
import { JobPreviewList } from "../preview/JobPreviewList";
import type { JobStepResponse } from "../../api/jobsApi";

const VIDEO_EXTS = ["mp4", "webm", "mov"];
const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp"];

function extractOutputArtifacts(
  steps: JobStepResponse[],
): { videos: string[]; images: string[]; others: string[] } {
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
      for (const key of ["output_path", "exported_path", "artifact_path"]) {
        classify(obj[key]);
      }
      const arr = obj.output_paths;
      if (Array.isArray(arr)) {
        for (const p of arr) classify(p);
      }
      for (const [k, v] of Object.entries(obj)) {
        if (
          k === "output_path" ||
          k === "exported_path" ||
          k === "artifact_path" ||
          k === "output_paths"
        )
          continue;
        classify(v);
      }
    } catch {
      /* skip malformed JSON */
    }
  }

  return { videos, images, others };
}

function artifactUrl(jobId: string, path: string): string {
  const filename = path.split("/").pop() ?? path;
  return `/api/v1/jobs/${jobId}/artifacts/${encodeURIComponent(filename)}`;
}

function publishStatusVariant(status: string): string {
  switch (status) {
    case "published":
      return "ready";
    case "approved":
    case "scheduled":
      return "info";
    case "publishing":
      return "processing";
    case "pending_review":
      return "warning";
    case "draft":
      return "draft";
    case "failed":
    case "cancelled":
    case "review_rejected":
      return "failed";
    default:
      return "draft";
  }
}

export interface JobDetailBodyProps {
  basePath: "/admin" | "/user";
  titleLabel?: string;
  testIdPrefix?: string;
}

export function JobDetailBody({
  basePath,
  titleLabel = "Job Detayı",
  testIdPrefix = "job-detail",
}: JobDetailBodyProps) {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: job, isLoading, isError, error } = useJobDetail(jobId ?? null);
  const { data: publishRecords } = usePublishRecordForJob(jobId);
  const createPublishMutation = useCreatePublishRecordFromJob();

  const jobsListLabel = basePath === "/admin" ? "Isler" : "Projelerim";
  const jobsListPath = basePath === "/admin" ? "/admin/jobs" : "/user/projects";
  const publishDetailPath = (recordId: string) =>
    `${basePath}/publish/${recordId}`;

  const isActiveJob =
    !!job && ["queued", "running", "processing", "retrying"].includes(job.status);
  const { connected: sseConnected, reconnecting: sseReconnecting } = useSSE({
    url: `/api/v1/sse/jobs/${jobId}`,
    enabled: !!jobId && isActiveJob,
    invalidateKeys: [["job", jobId ?? ""]],
    eventTypes: ["job:status_changed", "job:step_changed"],
  });

  const baseBreadcrumb = [
    { label: jobsListLabel, to: jobsListPath },
    { label: "Detay" },
  ];

  if (isLoading) {
    return (
      <PageShell
        title={titleLabel}
        breadcrumb={baseBreadcrumb}
        testId={`${testIdPrefix}-loading`}
      >
        <p className="text-neutral-500">Yükleniyor...</p>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell
        title={titleLabel}
        breadcrumb={baseBreadcrumb}
        testId={testIdPrefix}
      >
        <p className="text-error">
          Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </p>
      </PageShell>
    );
  }

  if (!job) {
    return (
      <PageShell
        title={titleLabel}
        breadcrumb={baseBreadcrumb}
        testId={testIdPrefix}
      >
        <p className="text-neutral-500">Job bulunamadi.</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={titleLabel}
      subtitle={`Modul: ${job.module_type}`}
      breadcrumb={baseBreadcrumb}
      testId={testIdPrefix}
    >
      <p className="m-0 mb-2 text-sm text-neutral-600">
        Job ID: <Mono>{job.id}</Mono>
      </p>
      <p
        className="m-0 mb-3 text-xs text-neutral-400"
        data-testid={`${testIdPrefix}-workflow-note`}
      >
        Ilerleme, adimlar, sure ve operasyonel aksiyonlar (retry, cancel, skip).
      </p>

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

      <JobPreviewList jobId={job.id} testId={`${testIdPrefix}-previews`} />

      {(() => {
        const { videos, images } = extractOutputArtifacts(job.steps);
        const hasOutputs = videos.length > 0 || images.length > 0;

        return (
          <SectionShell title="Ciktilar" testId={`${testIdPrefix}-outputs`}>
            {hasOutputs ? (
              <div className="flex flex-col gap-4">
                {videos.map((v, i) => (
                  <VideoPlayer
                    key={v}
                    src={artifactUrl(job.id, v)}
                    title={videos.length > 1 ? `Video ${i + 1}` : undefined}
                    showDownload
                    testId={`${testIdPrefix}-output-video-${i}`}
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
                      data-testid={`${testIdPrefix}-output-image-${i}`}
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

      <SectionShell title="Yayin Durumu" testId={`${testIdPrefix}-publish-linkage`}>
        {publishRecords && publishRecords.length > 0 ? (
          <div className="flex items-center gap-3 py-2">
            <StatusBadge
              status={publishStatusVariant(publishRecords[0].status)}
              label={publishRecords[0].status}
            />
            <span className="text-sm text-neutral-600 capitalize">
              {publishRecords[0].platform}
            </span>
            <button
              className="text-brand-600 bg-transparent border-none cursor-pointer p-0 text-sm font-medium ml-auto"
              onClick={() => navigate(publishDetailPath(publishRecords[0].id))}
              data-testid={`${testIdPrefix}-publish-detail-link`}
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
                  navigate(publishDetailPath(record.id));
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "Islem basarisiz.");
                }
              }}
              data-testid={`${testIdPrefix}-create-publish-btn`}
            >
              Yayina Hazirla
            </ActionButton>
          </div>
        ) : (
          <p className="text-sm text-neutral-400 m-0 py-2">
            Job tamamlandiginda yayin kaydi olusturulabilir.
          </p>
        )}
      </SectionShell>
    </PageShell>
  );
}
