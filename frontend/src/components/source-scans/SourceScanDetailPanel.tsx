import { useState } from "react";
import { useSourceScanDetail } from "../../hooks/useSourceScanDetail";
import { useUpdateSourceScan } from "../../hooks/useUpdateSourceScan";
import { SourceScanForm } from "./SourceScanForm";
import type { SourceScanFormValues } from "./SourceScanForm";
import { formatDateTime } from "../../lib/formatDate";
import { isBlank } from "../../lib/isBlank";
import { JsonPreviewField } from "../shared/JsonPreviewField";
import { cn } from "../../lib/cn";

interface SourceScanDetailPanelProps {
  scanId: string | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  const isEmpty = value === null || value === undefined || (typeof value === "string" && isBlank(value));
  return (
    <div className="mb-2">
      <span className="text-sm font-semibold text-neutral-600">{label}: </span>
      <span className={cn("text-sm break-words [overflow-wrap:anywhere]", isEmpty ? "text-neutral-500" : "text-neutral-900")}>
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
      <div className="p-8 text-neutral-500 text-sm text-center border border-dashed border-border-subtle rounded-md">
        Bir scan kaydı seçin.
      </div>
    );
  }

  if (isLoading) return <p className="text-neutral-600 p-4">Yükleniyor...</p>;

  if (isError) {
    return (
      <p className="text-error p-4">
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
      <div className="p-5 border border-border-subtle rounded-md bg-neutral-0">
        <h3 className="m-0 mb-4 text-lg text-neutral-900">Scan Düzenle</h3>
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
    <div className="p-5 border border-border-subtle rounded-md bg-neutral-0">
      <div className="flex justify-between items-center mb-4">
        <h3 className="m-0 text-lg text-neutral-900">Scan Detayı</h3>
        <button
          onClick={() => setEditing(true)}
          className="px-3 py-1 text-base bg-neutral-100 text-neutral-700 border border-border-subtle rounded-sm cursor-pointer"
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
        <div className="mb-2">
          <span className="text-sm font-semibold text-error">Error: </span>
          <span className="text-sm text-error">{scan.error_summary}</span>
        </div>
      )}

      <div className="mt-3 border-t border-neutral-100 pt-3">
        <Field label="Started" value={formatDateTime(scan.started_at)} />
        <Field label="Finished" value={formatDateTime(scan.finished_at)} />
      </div>

      <div className="mt-3 border-t border-neutral-100 pt-3">
        <JsonPreviewField label="raw_result_preview_json" value={scan.raw_result_preview_json} />
      </div>

      {!isBlank(scan.notes) && (
        <div className="mt-2 border-t border-neutral-100 pt-2">
          <Field label="Notes" value={scan.notes} />
        </div>
      )}

      <div className="mt-3 border-t border-neutral-100 pt-3">
        <Field label="Created" value={formatDateTime(scan.created_at)} />
        <Field label="Updated" value={formatDateTime(scan.updated_at)} />
      </div>
    </div>
  );
}
