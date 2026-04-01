import { useParams, Link } from "react-router-dom";
import { useJobDetail } from "../../hooks/useJobDetail";
import { JobOverviewPanel } from "../../components/jobs/JobOverviewPanel";
import { JobTimelinePanel } from "../../components/jobs/JobTimelinePanel";
import { JobSystemPanels } from "../../components/jobs/JobSystemPanels";

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: job, isLoading, isError, error } = useJobDetail(jobId ?? null);

  if (isLoading) {
    return <p style={{ color: "#64748b" }}>Yükleniyor...</p>;
  }

  if (isError) {
    return (
      <p style={{ color: "#dc2626" }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }

  if (!job) {
    return <p style={{ color: "#64748b" }}>Job bulunamadı.</p>;
  }

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <Link
          to="/admin/jobs"
          style={{ fontSize: "0.875rem", color: "#3b82f6", textDecoration: "none" }}
        >
          ← Jobs listesine dön
        </Link>
      </div>

      <h2 style={{ margin: "0 0 0.25rem" }}>Job Detayı</h2>
      <p style={{ margin: "0 0 1.5rem", color: "#64748b", fontSize: "0.875rem" }}>
        {job.module_type} — <code style={{ fontSize: "0.8125rem" }}>{job.id}</code>
      </p>

      <JobOverviewPanel job={job} />
      <JobTimelinePanel steps={job.steps} />
      <JobSystemPanels />
    </div>
  );
}
