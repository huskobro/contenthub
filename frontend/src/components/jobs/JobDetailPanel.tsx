import { useJobDetail } from "../../hooks/useJobDetail";
import { JobStepsList } from "./JobStepsList";

interface JobDetailPanelProps {
  selectedId: string | null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", padding: "0.375rem 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ width: "200px", flexShrink: 0, color: "#64748b", fontSize: "0.8125rem" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.875rem", wordBreak: "break-word" }}>{children}</span>
    </div>
  );
}

export function JobDetailPanel({ selectedId }: JobDetailPanelProps) {
  const { data, isLoading, isError, error } = useJobDetail(selectedId);

  if (!selectedId) {
    return (
      <div style={{ color: "#94a3b8", padding: "1rem" }}>
        Detay görmek için bir job seçin.
      </div>
    );
  }

  if (isLoading) {
    return <div style={{ padding: "1rem", color: "#64748b" }}>Yükleniyor...</div>;
  }

  if (isError) {
    return (
      <div style={{ padding: "1rem", color: "#dc2626" }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </div>
    );
  }

  if (!data) return null;

  const em = <em style={{ color: "#94a3b8" }}>—</em>;

  return (
    <div style={{ padding: "1rem" }}>
      <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Job Detayı</h3>
      <Row label="id"><code style={{ fontSize: "0.75rem" }}>{data.id}</code></Row>
      <Row label="module_type">{data.module_type}</Row>
      <Row label="status">{data.status}</Row>
      <Row label="owner_id">{data.owner_id ?? em}</Row>
      <Row label="template_id">{data.template_id ?? em}</Row>
      <Row label="current_step_key">{data.current_step_key ?? em}</Row>
      <Row label="retry_count">{data.retry_count}</Row>
      <Row label="workspace_path">{data.workspace_path ?? em}</Row>
      <Row label="last_error">
        {data.last_error ? (
          <span style={{ color: "#dc2626" }}>{data.last_error}</span>
        ) : em}
      </Row>
      <Row label="elapsed_total_seconds">
        {data.elapsed_total_seconds != null ? `${data.elapsed_total_seconds}s` : em}
      </Row>
      <Row label="estimated_remaining_seconds">
        {data.estimated_remaining_seconds != null ? `${data.estimated_remaining_seconds}s` : em}
      </Row>
      <Row label="created_at">{data.created_at.slice(0, 19).replace("T", " ")}</Row>
      <Row label="started_at">
        {data.started_at ? data.started_at.slice(0, 19).replace("T", " ") : em}
      </Row>
      <Row label="finished_at">
        {data.finished_at ? data.finished_at.slice(0, 19).replace("T", " ") : em}
      </Row>

      <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.9375rem" }}>Steps</h4>
      <JobStepsList steps={data.steps} />
    </div>
  );
}
