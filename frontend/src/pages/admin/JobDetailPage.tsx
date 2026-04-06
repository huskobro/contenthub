import { useParams } from "react-router-dom";
import { useJobDetail } from "../../hooks/useJobDetail";
import { useSSE } from "../../hooks/useSSE";
import { JobOverviewPanel } from "../../components/jobs/JobOverviewPanel";
import { JobTimelinePanel } from "../../components/jobs/JobTimelinePanel";
import { JobSystemPanels } from "../../components/jobs/JobSystemPanels";
import { JobActionsPanel } from "../../components/jobs/JobActionsPanel";
import {
  PageShell,
  Mono,
} from "../../components/design-system/primitives";

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: job, isLoading, isError, error } = useJobDetail(jobId ?? null);

  const isActiveJob = !!job && ["queued", "running", "processing", "retrying"].includes(job.status);
  useSSE({
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

      <JobOverviewPanel job={job} />
      <JobTimelinePanel steps={job.steps} />
      <JobSystemPanels steps={job.steps} />
      <JobActionsPanel job={job} />
    </PageShell>
  );
}
