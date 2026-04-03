import { useState } from "react";
import { useSourceScanDetail } from "../../hooks/useSourceScanDetail";
import { useUpdateSourceScan } from "../../hooks/useUpdateSourceScan";
import { SourceScanForm } from "./SourceScanForm";
import type { SourceScanFormValues } from "./SourceScanForm";
import { formatDateTime } from "../../lib/formatDate";

interface SourceScanDetailPanelProps {
  scanId: string | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>{label}: </span>
      <span style={{ fontSize: "0.875rem", color: value !== null && value !== undefined ? "#1e293b" : "#94a3b8" }}>
        {value !== null && value !== undefined ? String(value) : "—"}
      </span>
    </div>
  );
}

function JsonPreviewField({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return (
      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }}>{label}</div>
        <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>—</span>
      </div>
    );
  }
  let formatted = value;
  try { formatted = JSON.stringify(JSON.parse(value), null, 2); } catch { /* show as-is */ }
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }}>{label}</div>
      <pre style={{
        margin: 0, padding: "0.5rem", background: "#f8fafc",
        border: "1px solid #e2e8f0", borderRadius: "4px",
        fontSize: "0.8rem", overflowX: "auto", maxHeight: "120px",
        whiteSpace: "pre-wrap", wordBreak: "break-all",
      }}>{formatted}</pre>
    </div>
  );
}

export function SourceScanDetailPanel({ scanId }: SourceScanDetailPanelProps) {
  const { data: scan, isLoading, isError, error } = useSourceScanDetail(scanId);
  const updateMutation = useUpdateSourceScan(scanId ?? "");
  const [editing, setEditing] = useState(false);

  if (!scanId) {
    return (
      <div style={{
        padding: "2rem", color: "#94a3b8", fontSize: "0.875rem",
        textAlign: "center", border: "1px dashed #e2e8f0", borderRadius: "6px",
      }}>
        Bir scan kaydı seçin.
      </div>
    );
  }

  if (isLoading) return <p style={{ color: "#64748b", padding: "1rem" }}>Yükleniyor...</p>;

  if (isError) {
    return (
      <p style={{ color: "#dc2626", padding: "1rem" }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }

  if (!scan) return null;

  if (editing) {
    function handleUpdate(values: SourceScanFormValues) {
      const payload = {
        status: values.status || undefined,
        requested_by: (values.requested_by ?? "").trim() || null,
        result_count: (values.result_count ?? "").trim() !== "" ? Number(values.result_count) : null,
        error_summary: (values.error_summary ?? "").trim() || null,
        notes: (values.notes ?? "").trim() || null,
      };
      updateMutation.mutate(payload, {
        onSuccess: () => setEditing(false),
      });
    }

    return (
      <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#fff" }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", color: "#1e293b" }}>Scan Düzenle</h3>
        <SourceScanForm
          mode="edit"
          initial={scan}
          isSubmitting={updateMutation.isPending}
          submitError={updateMutation.error instanceof Error ? updateMutation.error.message : updateMutation.error ? String(updateMutation.error) : null}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          submitLabel="Kaydet"
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", color: "#1e293b" }}>Scan Detayı</h3>
        <button
          onClick={() => setEditing(true)}
          style={{
            padding: "0.25rem 0.75rem",
            fontSize: "0.8rem",
            background: "#f1f5f9",
            color: "#475569",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Düzenle
        </button>
      </div>

      <Field label="ID" value={scan.id} />
      <Field label="Source ID" value={scan.source_id} />
      <Field label="Scan Mode" value={scan.scan_mode} />
      <Field label="Status" value={scan.status} />
      <Field label="Requested By" value={scan.requested_by} />
      <Field label="Result Count" value={scan.result_count} />

      {scan.error_summary && (
        <div style={{ marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#dc2626" }}>Error: </span>
          <span style={{ fontSize: "0.875rem", color: "#dc2626" }}>{scan.error_summary}</span>
        </div>
      )}

      <div style={{ marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
        <Field label="Started" value={formatDateTime(scan.started_at)} />
        <Field label="Finished" value={formatDateTime(scan.finished_at)} />
      </div>

      <div style={{ marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
        <JsonPreviewField label="raw_result_preview_json" value={scan.raw_result_preview_json} />
      </div>

      {scan.notes && (
        <div style={{ marginTop: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.5rem" }}>
          <Field label="Notes" value={scan.notes} />
        </div>
      )}

      <div style={{ marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
        <Field label="Created" value={formatDateTime(scan.created_at)} />
        <Field label="Updated" value={formatDateTime(scan.updated_at)} />
      </div>
    </div>
  );
}
