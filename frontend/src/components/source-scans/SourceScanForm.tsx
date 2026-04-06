import { useState } from "react";
import type { SourceScanResponse } from "../../api/sourceScansApi";
import { cn } from "../../lib/cn";

export interface SourceScanFormValues {
  source_id: string;
  scan_mode: string;
  status: string;
  requested_by: string;
  result_count: string;
  error_summary: string;
  notes: string;
}

interface SourceScanFormProps {
  mode: "create" | "edit";
  initial?: SourceScanResponse;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: SourceScanFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function SourceScanForm({
  mode,
  initial,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
  submitLabel,
}: SourceScanFormProps) {
  const [values, setValues] = useState<SourceScanFormValues>({
    source_id: initial?.source_id ?? "",
    scan_mode: initial?.scan_mode ?? "manual",
    status: initial?.status ?? "queued",
    requested_by: initial?.requested_by ?? "",
    result_count: initial?.result_count != null ? String(initial.result_count) : "",
    error_summary: initial?.error_summary ?? "",
    notes: initial?.notes ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SourceScanFormValues, string>>>({});
  const isCreate = mode === "create";

  function set(field: keyof SourceScanFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof SourceScanFormValues, string>> = {};
    if (isCreate) {
      if (!values.source_id.trim()) newErrors.source_id = "Source ID zorunlu";
      if (!values.scan_mode.trim()) newErrors.scan_mode = "Scan mode zorunlu";
    }
    if (values.result_count.trim() !== "") {
      const n = Number(values.result_count);
      if (isNaN(n) || !isFinite(n) || n < 0) newErrors.result_count = "Result count negatif olamaz";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {isCreate && (
        <>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-700 mb-1">
              Source ID <span className="text-error">*</span>
            </label>
            <input
              className={cn(
                "w-full px-2 py-1.5 text-md border rounded-sm box-border",
                errors.source_id ? "border-error" : "border-border-subtle",
              )}
              value={values.source_id}
              onChange={(e) => set("source_id", e.target.value)}
              placeholder="Source UUID"
            />
            {errors.source_id && <div className="text-sm text-error mt-0.5">{errors.source_id}</div>}
          </div>

          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-700 mb-1">
              Scan Mode <span className="text-error">*</span>
            </label>
            <select
              className={cn(
                "w-full px-2 py-1.5 text-md border rounded-sm box-border",
                errors.scan_mode ? "border-error" : "border-border-subtle",
              )}
              value={values.scan_mode}
              onChange={(e) => set("scan_mode", e.target.value)}
            >
              <option value="manual">manual</option>
              <option value="auto">auto</option>
              <option value="curated">curated</option>
            </select>
            {errors.scan_mode && <div className="text-sm text-error mt-0.5">{errors.scan_mode}</div>}
          </div>
        </>
      )}

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Status</label>
        <select
          className="w-full px-2 py-1.5 text-md border border-border-subtle rounded-sm box-border"
          value={values.status}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="queued">queued</option>
          <option value="running">running</option>
          <option value="done">done</option>
          <option value="failed">failed</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Requested By</label>
        <input
          className="w-full px-2 py-1.5 text-md border border-border-subtle rounded-sm box-border"
          value={values.requested_by}
          onChange={(e) => set("requested_by", e.target.value)}
          placeholder="ör. admin (opsiyonel)"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Result Count</label>
        <input
          className={cn(
            "w-full px-2 py-1.5 text-md border rounded-sm box-border",
            errors.result_count ? "border-error" : "border-border-subtle",
          )}
          type="text"
          value={values.result_count}
          onChange={(e) => set("result_count", e.target.value)}
          placeholder="Sayı (opsiyonel)"
        />
        {errors.result_count && <div className="text-sm text-error mt-0.5">{errors.result_count}</div>}
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Error Summary</label>
        <textarea
          className="w-full px-2 py-1.5 text-md border border-border-subtle rounded-sm box-border min-h-[50px] resize-y"
          value={values.error_summary}
          onChange={(e) => set("error_summary", e.target.value)}
          placeholder="Hata özeti (opsiyonel)"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Notes</label>
        <textarea
          className="w-full px-2 py-1.5 text-md border border-border-subtle rounded-sm box-border min-h-[50px] resize-y"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Notlar (opsiyonel)"
        />
      </div>

      {submitError && (
        <div className="text-error text-md mb-3 break-words [overflow-wrap:anywhere]">{submitError}</div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "px-4 py-1.5 text-md text-neutral-0 border-none rounded-sm",
            isSubmitting ? "bg-info-light cursor-not-allowed" : "bg-brand-500 cursor-pointer",
          )}
        >
          {isSubmitting ? "Kaydediliyor..." : (submitLabel ?? (isCreate ? "Oluştur" : "Kaydet"))}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className={cn(
            "px-4 py-1.5 text-md bg-neutral-100 text-neutral-700 border border-border-subtle rounded-sm",
            isSubmitting ? "cursor-not-allowed" : "cursor-pointer",
          )}
        >
          İptal
        </button>
      </div>
    </form>
  );
}
