import { useJobDetail } from "../../hooks/useJobDetail";
import { JobStepsList } from "./JobStepsList";
import { DurationBadge } from "./DurationBadge";
import { formatDateISO } from "../../lib/formatDate";

interface JobDetailPanelProps {
  selectedId: string | null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-2 border-b border-neutral-100">
      <span className="w-[200px] shrink-0 text-neutral-600 text-base font-medium">
        {label}
      </span>
      <span className="text-md break-words [overflow-wrap:anywhere] text-neutral-800">{children}</span>
    </div>
  );
}

export function JobDetailPanel({ selectedId }: JobDetailPanelProps) {
  const { data, isLoading, isError, error } = useJobDetail(selectedId);

  if (!selectedId) {
    return (
      <div className="text-neutral-500 p-4">
        Detay görmek için bir job seçin.
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4 text-neutral-600">Yükleniyor...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-error">
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </div>
    );
  }

  if (!data) return null;

  const em = <em className="text-neutral-500">—</em>;

  return (
    <div className="p-4">
      <h3 className="m-0 mb-3 text-xl font-bold text-neutral-900">
        Job Detayı
      </h3>

      {/* Overview section */}
      <div className="bg-surface-card border border-border-subtle rounded-lg p-4 mb-4 shadow-xs">
        <Row label="id"><code className="text-sm font-mono bg-neutral-100 px-2 py-1 rounded-sm">{data.id}</code></Row>
        <Row label="module_type">{data.module_type}</Row>
        <Row label="status">{data.status}</Row>
        <Row label="owner_id">{data.owner_id ?? em}</Row>
        <Row label="template_id">{data.template_id ?? em}</Row>
        <Row label="current_step_key">{data.current_step_key ?? em}</Row>
        <Row label="retry_count">{data.retry_count}</Row>
        <Row label="workspace_path">{data.workspace_path ?? em}</Row>
        <Row label="last_error">
          {data.last_error ? (
            <span className="text-error">{data.last_error}</span>
          ) : em}
        </Row>
      </div>

      {/* Timing section */}
      <div className="bg-surface-inset border border-border-subtle rounded-lg p-4 mb-4">
        <div className="text-sm font-semibold text-neutral-600 uppercase tracking-wider mb-2">
          Zamanlama
        </div>
        <Row label="elapsed_total_seconds">
          <DurationBadge seconds={data.elapsed_total_seconds} />
        </Row>
        <Row label="estimated_remaining_seconds">
          <DurationBadge seconds={data.estimated_remaining_seconds} approximate />
        </Row>
        <Row label="created_at">{formatDateISO(data.created_at, em)}</Row>
        <Row label="started_at">{formatDateISO(data.started_at, em)}</Row>
        <Row label="finished_at">{formatDateISO(data.finished_at, em)}</Row>
      </div>

      <h4 className="m-0 mb-3 text-lg font-semibold text-neutral-800">
        Steps
      </h4>
      <JobStepsList steps={data.steps} />
    </div>
  );
}
