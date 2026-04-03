import { useState } from "react";
import { useSourceScanDetail } from "../../hooks/useSourceScanDetail";
import { useUpdateSourceScan } from "../../hooks/useUpdateSourceScan";
import { SourceScanForm } from "./SourceScanForm";
import type { SourceScanFormValues } from "./SourceScanForm";
import { formatDateTime } from "../../lib/formatDate";
import { isBlank } from "../../lib/isBlank";
import { JsonPreviewField } from "../shared/JsonPreviewField";

const FONT_SM = "0.875rem";
const LABEL_SPAN: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 600, color: "#64748b" };
const PANEL_BOX: React.CSSProperties = { padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#fff" };
const SECTION_DIVIDER: React.CSSProperties = { marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" };

interface SourceScanDetailPanelProps {
  scanId: string | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  const isEmpty = value === null || value === undefined || (typeof value === "string" && isBlank(value));
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={LABEL_SPAN}>{label}: </span>
      <span style={{ fontSize: FONT_SM, color: isEmpty ? "#94a3b8" : "#1e293b", wordBreak: "break-word", overflowWrap: "anywhere" }}>
        {isEmpty ? "—" : String(value)}
      </span>
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
        padding: "2rem", color: "#94a3b8", fontSize: FONT_SM,
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
        result_count: (() => { const v = (values.result_count ?? "").trim(); if (v === "") return null; const n = Number(v); return isNaN(n) || !isFinite(n) ? null : n; })(),
        error_summary: (values.error_summary ?? "").trim() || null,
        notes: (values.notes ?? "").trim() || null,
      };
      updateMutation.mutate(payload, {
        onSuccess: () => setEditing(false),
      });
    }

    return (
      <div style={PANEL_BOX}>
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
    <div style={PANEL_BOX}>
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
          <span style={{ fontSize: FONT_SM, color: "#dc2626" }}>{scan.error_summary}</span>
        </div>
      )}

      <div style={SECTION_DIVIDER}>
        <Field label="Started" value={formatDateTime(scan.started_at)} />
        <Field label="Finished" value={formatDateTime(scan.finished_at)} />
      </div>

      <div style={SECTION_DIVIDER}>
        <JsonPreviewField label="raw_result_preview_json" value={scan.raw_result_preview_json} />
      </div>

      {!isBlank(scan.notes) && (
        <div style={{ marginTop: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.5rem" }}>
          <Field label="Notes" value={scan.notes} />
        </div>
      )}

      <div style={SECTION_DIVIDER}>
        <Field label="Created" value={formatDateTime(scan.created_at)} />
        <Field label="Updated" value={formatDateTime(scan.updated_at)} />
      </div>
    </div>
  );
}
