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

      <h2 style={{ margin: "0 0 0.25rem" }} data-testid="job-detail-heading">Job Detayı</h2>
      <p style={{ margin: "0 0 0.5rem", color: "#64748b", fontSize: "0.875rem" }}>
        {job.module_type} — <code style={{ fontSize: "0.8125rem" }}>{job.id}</code>
      </p>
      <p
        style={{
          margin: "0 0 1.5rem",
          fontSize: "0.8125rem",
          color: "#94a3b8",
          lineHeight: 1.5,
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

      {/* Job actions — deferred to M14 */}
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          background: "#fafbfc",
          padding: "0.75rem 1rem",
          marginBottom: "1rem",
          fontSize: "0.75rem",
          color: "#94a3b8",
        }}
        data-testid="job-actions-panel"
      >
        Operasyonel aksiyonlar (Retry, Cancel, Skip) M14 milestone'unda aktif edilecektir.
      </div>
    </div>
  );
}
