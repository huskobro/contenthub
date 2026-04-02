import { useSourceScanDetail } from "../../hooks/useSourceScanDetail";

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

  return (
    <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#fff" }}>
      <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", color: "#1e293b" }}>Scan Detayı</h3>

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
        <Field label="Started" value={scan.started_at ? new Date(scan.started_at).toLocaleString() : null} />
        <Field label="Finished" value={scan.finished_at ? new Date(scan.finished_at).toLocaleString() : null} />
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
        <Field label="Created" value={new Date(scan.created_at).toLocaleString()} />
        <Field label="Updated" value={new Date(scan.updated_at).toLocaleString()} />
      </div>
    </div>
  );
}
