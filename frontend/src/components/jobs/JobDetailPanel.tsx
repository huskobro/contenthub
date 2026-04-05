import { useJobDetail } from "../../hooks/useJobDetail";
import { JobStepsList } from "./JobStepsList";
import { DurationBadge } from "./DurationBadge";
import { formatDateISO } from "../../lib/formatDate";
import { colors, typography } from "../design-system/tokens";

interface JobDetailPanelProps {
  selectedId: string | null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", padding: "0.375rem 0", borderBottom: `1px solid ${colors.neutral[100]}` }}>
      <span style={{ width: "200px", flexShrink: 0, color: colors.neutral[600], fontSize: typography.size.base }}>
        {label}
      </span>
      <span style={{ fontSize: typography.size.md, wordBreak: "break-word", overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

export function JobDetailPanel({ selectedId }: JobDetailPanelProps) {
  const { data, isLoading, isError, error } = useJobDetail(selectedId);

  if (!selectedId) {
    return (
      <div style={{ color: colors.neutral[500], padding: "1rem" }}>
        Detay görmek için bir job seçin.
      </div>
    );
  }

  if (isLoading) {
    return <div style={{ padding: "1rem", color: colors.neutral[600] }}>Yükleniyor...</div>;
  }

  if (isError) {
    return (
      <div style={{ padding: "1rem", color: colors.error.base }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </div>
    );
  }

  if (!data) return null;

  const em = <em style={{ color: colors.neutral[500] }}>—</em>;

  return (
    <div style={{ padding: "1rem" }}>
      <h3 style={{ margin: "0 0 0.75rem", fontSize: typography.size.lg }}>Job Detayı</h3>
      <Row label="id"><code style={{ fontSize: typography.size.sm }}>{data.id}</code></Row>
      <Row label="module_type">{data.module_type}</Row>
      <Row label="status">{data.status}</Row>
      <Row label="owner_id">{data.owner_id ?? em}</Row>
      <Row label="template_id">{data.template_id ?? em}</Row>
      <Row label="current_step_key">{data.current_step_key ?? em}</Row>
      <Row label="retry_count">{data.retry_count}</Row>
      <Row label="workspace_path">{data.workspace_path ?? em}</Row>
      <Row label="last_error">
        {data.last_error ? (
          <span style={{ color: colors.error.base }}>{data.last_error}</span>
        ) : em}
      </Row>
      <Row label="elapsed_total_seconds">
        <DurationBadge seconds={data.elapsed_total_seconds} />
      </Row>
      <Row label="estimated_remaining_seconds">
        <DurationBadge seconds={data.estimated_remaining_seconds} approximate />
      </Row>
      <Row label="created_at">{formatDateISO(data.created_at, em)}</Row>
      <Row label="started_at">{formatDateISO(data.started_at, em)}</Row>
      <Row label="finished_at">{formatDateISO(data.finished_at, em)}</Row>

      <h4 style={{ margin: "1rem 0 0.5rem", fontSize: typography.size.lg }}>Steps</h4>
      <JobStepsList steps={data.steps} />
    </div>
  );
}
