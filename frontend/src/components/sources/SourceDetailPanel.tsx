import { useState } from "react";
import { useSourceDetail } from "../../hooks/useSourceDetail";
import { useUpdateSource } from "../../hooks/useUpdateSource";
import { useReadOnly } from "../visibility/ReadOnlyGuard";
import { SourceForm } from "./SourceForm";
import { formatDateTime } from "../../lib/formatDate";
import { isBlank } from "../../lib/isBlank";
import type { SourceCreatePayload } from "../../api/sourcesApi";
import { cn } from "../../lib/cn";

interface SourceDetailPanelProps {
  sourceId: string | null;
}

function Field({ label, value }: { label: string; value: string | null }) {
  const blank = isBlank(value);
  return (
    <div className="mb-2">
      <span className="text-sm font-semibold text-neutral-600">{label}: </span>
      <span className={cn("text-sm break-words [overflow-wrap:anywhere]", blank ? "text-neutral-500" : "text-neutral-900")}>
        {blank ? "—" : value}
      </span>
    </div>
  );
}

function UrlField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="mb-2">
      <span className="text-sm font-semibold text-neutral-600">{label}: </span>
      {!isBlank(value) ? (
        <span className="text-base text-brand-700 break-all [overflow-wrap:anywhere] font-mono">
          {value}
        </span>
      ) : (
        <span className="text-sm text-neutral-500">—</span>
      )}
    </div>
  );
}

function ScanModeBadge({ scanMode }: { scanMode: string | null }) {
  if (!scanMode) return <span className="text-sm text-neutral-500">--</span>;

  const config: Record<string, { label: string; bg: string; text: string }> = {
    auto: { label: "Otomatik Tarama Aktif", bg: "bg-success-light", text: "text-success-dark" },
    manual: { label: "Manuel Tarama", bg: "bg-neutral-100", text: "text-neutral-700" },
    curated: { label: "Kuratorlu Tarama", bg: "bg-info-light", text: "text-info-dark" },
  };

  const c = config[scanMode] ?? { label: scanMode, bg: "bg-neutral-100", text: "text-neutral-700" };

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium", c.bg, c.text)}>
      {c.label}
    </span>
  );
}

export function SourceDetailPanel({ sourceId }: SourceDetailPanelProps) {
  const readOnly = useReadOnly();
  const [editMode, setEditMode] = useState(false);
  const { data: source, isLoading, isError, error } = useSourceDetail(sourceId);
  const { mutate: updateMutate, isPending: isUpdating, error: updateError } = useUpdateSource(sourceId ?? "");

  // Reset edit mode when selected source changes
  const [prevSourceId, setPrevSourceId] = useState(sourceId);
  if (sourceId !== prevSourceId) {
    setPrevSourceId(sourceId);
    setEditMode(false);
  }

  if (!sourceId) {
    return (
      <div className="p-8 text-neutral-500 text-sm text-center border border-dashed border-border-subtle rounded-md">
        Bir source seçin.
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

  if (!source) return null;

  if (editMode) {
    return (
      <div className="p-5 border border-border-subtle rounded-md bg-neutral-0">
        <h3 className="m-0 mb-4 text-lg text-neutral-900">Düzenle: {source.name}</h3>
        <SourceForm
          initial={source}
          onSubmit={(payload: SourceCreatePayload) => {
            updateMutate(payload, {
              onSuccess: () => setEditMode(false),
            });
          }}
          onCancel={() => setEditMode(false)}
          isPending={isUpdating}
          submitError={updateError instanceof Error ? updateError.message : null}
          submitLabel="Güncelle"
        />
      </div>
    );
  }

  return (
    <div className="p-5 border border-border-subtle rounded-md bg-neutral-0">
      <div className="flex justify-between items-center mb-4">
        <h3 className="m-0 text-lg text-neutral-900">{source.name}</h3>
        <button
          onClick={() => setEditMode(true)}
          disabled={readOnly}
          className={cn(
            "px-3 py-1 bg-transparent text-brand-700 border border-info-light rounded-sm text-base",
            readOnly ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-info-light transition-colors duration-fast"
          )}
        >
          Düzenle
        </button>
      </div>

      <Field label="Source Type" value={source.source_type} />
      <Field label="Status" value={source.status} />
      <Field label="Trust Level" value={source.trust_level} />
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-neutral-600">Scan Mode: </span>
        <ScanModeBadge scanMode={source.scan_mode} />
      </div>
      <Field label="Language" value={source.language} />
      <Field label="Category" value={source.category} />

      <div className="mt-4 border-t border-neutral-100 pt-4">
        <UrlField label="Base URL" value={source.base_url} />
        <UrlField label="Feed URL" value={source.feed_url} />
        <UrlField label="API Endpoint" value={source.api_endpoint} />
      </div>

      {!isBlank(source.notes) && (
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <Field label="Notes" value={source.notes} />
        </div>
      )}

      <div className="mt-3 border-t border-neutral-100 pt-3">
        <Field label="Created" value={formatDateTime(source.created_at)} />
        <Field label="Updated" value={formatDateTime(source.updated_at)} />
      </div>
    </div>
  );
}
