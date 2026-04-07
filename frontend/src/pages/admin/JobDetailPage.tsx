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

export function JobDetailPage() {
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
