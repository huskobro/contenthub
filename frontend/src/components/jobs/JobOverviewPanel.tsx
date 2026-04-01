import type { JobResponse } from "../../api/jobsApi";
import { DurationBadge } from "./DurationBadge";

interface JobOverviewPanelProps {
  job: JobResponse;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", padding: "0.4rem 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ width: "220px", flexShrink: 0, color: "#64748b", fontSize: "0.8125rem" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.875rem", wordBreak: "break-word" }}>{children}</span>
    </div>
  );
}

const em = <em style={{ color: "#94a3b8" }}>—</em>;

export function JobOverviewPanel({ job }: JobOverviewPanelProps) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        background: "#fafbfc",
        padding: "1rem",
        marginBottom: "1.5rem",
      }}
    >
      <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Genel Bilgi</h3>
      <Row label="id"><code style={{ fontSize: "0.75rem" }}>{job.id}</code></Row>
      <Row label="module_type">{job.module_type}</Row>
      <Row label="status">{job.status}</Row>
      <Row label="current_step_key">{job.current_step_key ?? em}</Row>
      <Row label="retry_count">{job.retry_count}</Row>
      <Row label="owner_id">{job.owner_id ?? em}</Row>
      <Row label="template_id">{job.template_id ?? em}</Row>
      <Row label="workspace_path">{job.workspace_path ?? em}</Row>
      <Row label="elapsed_total">
        <DurationBadge seconds={job.elapsed_total_seconds} />
      </Row>
      <Row label="estimated_remaining">
        <DurationBadge seconds={job.estimated_remaining_seconds} approximate />
      </Row>
      <Row label="last_error">
        {job.last_error ? (
          <span style={{ color: "#dc2626" }}>{job.last_error}</span>
        ) : em}
      </Row>
      <Row label="created_at">{job.created_at.slice(0, 19).replace("T", " ")}</Row>
      <Row label="started_at">
        {job.started_at ? job.started_at.slice(0, 19).replace("T", " ") : em}
      </Row>
      <Row label="finished_at">
        {job.finished_at ? job.finished_at.slice(0, 19).replace("T", " ") : em}
      </Row>
    </div>
  );
}
