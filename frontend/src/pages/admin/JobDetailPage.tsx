import { useParams } from "react-router-dom";
import { useJobDetail } from "../../hooks/useJobDetail";
import { useSSE } from "../../hooks/useSSE";
import { JobOverviewPanel } from "../../components/jobs/JobOverviewPanel";
import { JobTimelinePanel } from "../../components/jobs/JobTimelinePanel";
import { JobSystemPanels } from "../../components/jobs/JobSystemPanels";
import { JobActionsPanel } from "../../components/jobs/JobActionsPanel";
import { colors, typography, spacing } from "../../components/design-system/tokens";
import {
  PageShell,
  Mono,
} from "../../components/design-system/primitives";

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: job, isLoading, isError, error } = useJobDetail(jobId ?? null);

  // SSE live updates — active only for running/queued jobs
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
        <p style={{ color: colors.neutral[500] }}>Yükleniyor...</p>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell title="Job Detayı" breadcrumb={[{ label: "Isler", to: "/admin/jobs" }, { label: "Detay" }]} testId="job-detail">
        <p style={{ color: colors.error.base }}>
          Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
        </p>
      </PageShell>
    );
  }

  if (!job) {
    return (
      <PageShell title="Job Detayı" breadcrumb={[{ label: "Isler", to: "/admin/jobs" }, { label: "Detay" }]} testId="job-detail">
        <p style={{ color: colors.neutral[500] }}>Job bulunamadi.</p>
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
      <p style={{ margin: `0 0 ${spacing[2]}`, fontSize: typography.size.sm, color: colors.neutral[600] }}>
        Job ID: <Mono>{job.id}</Mono>
      </p>
      <p
        style={{
          margin: `0 0 ${spacing[5]}`,
          fontSize: typography.size.base,
          color: colors.neutral[500],
          lineHeight: typography.lineHeight.normal,
          maxWidth: "640px",
        }}
        data-testid="job-detail-workflow-note"
      >
        Bu isin ilerleme durumunu, adimlarini ve sure bilgilerini asagidaki
        timeline ve panellerden takip edebilirsiniz. Is tamamlandiginda
        yayin hazirlik durumu ve sonuclari buradan gorunur. Basarisiz veya
        bekleyen isler icin retry, cancel ve skip aksiyonlari
        asagidaki operasyon panelinden yonetilebilir.
      </p>

      <JobOverviewPanel job={job} />
      <JobTimelinePanel steps={job.steps} />
      <JobSystemPanels steps={job.steps} />
      <JobActionsPanel job={job} />
    </PageShell>
  );
}
