import { useState } from "react";
import type { SourceScanResponse } from "../../api/sourceScansApi";

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

const BORDER_COLOR = "#e2e8f0";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.375rem 0.5rem",
  fontSize: "0.875rem",
  border: `1px solid ${BORDER_COLOR}`,
  borderRadius: "4px",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#475569",
  marginBottom: "0.25rem",
};

const fieldStyle: React.CSSProperties = {
  marginBottom: "0.75rem",
};

const errorStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#dc2626",
  marginTop: "0.2rem",
};

const TEXTAREA: React.CSSProperties = {
  ...inputStyle,
  minHeight: "50px",
  resize: "vertical",
};

const BTN_PRIMARY: React.CSSProperties = {
  padding: "0.375rem 1rem",
  fontSize: "0.875rem",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
};

const BTN_CANCEL: React.CSSProperties = {
  padding: "0.375rem 1rem",
  fontSize: "0.875rem",
  background: "#f1f5f9",
  color: "#475569",
  border: `1px solid ${BORDER_COLOR}`,
  borderRadius: "4px",
};

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

  function set(field: keyof SourceScanFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof SourceScanFormValues, string>> = {};
    if (mode === "create") {
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
      {mode === "create" && (
        <>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Source ID <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              style={{ ...inputStyle, borderColor: errors.source_id ? "#dc2626" : BORDER_COLOR }}
              value={values.source_id}
              onChange={(e) => set("source_id", e.target.value)}
              placeholder="Source UUID"
            />
            {errors.source_id && <div style={errorStyle}>{errors.source_id}</div>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Scan Mode <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              style={{ ...inputStyle, borderColor: errors.scan_mode ? "#dc2626" : BORDER_COLOR }}
              value={values.scan_mode}
              onChange={(e) => set("scan_mode", e.target.value)}
            >
              <option value="manual">manual</option>
              <option value="auto">auto</option>
              <option value="curated">curated</option>
            </select>
            {errors.scan_mode && <div style={errorStyle}>{errors.scan_mode}</div>}
          </div>
        </>
      )}

      <div style={fieldStyle}>
        <label style={labelStyle}>Status</label>
        <select style={inputStyle} value={values.status} onChange={(e) => set("status", e.target.value)}>
          <option value="queued">queued</option>
          <option value="running">running</option>
          <option value="done">done</option>
          <option value="failed">failed</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Requested By</label>
        <input
          style={inputStyle}
          value={values.requested_by}
          onChange={(e) => set("requested_by", e.target.value)}
          placeholder="ör. admin (opsiyonel)"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Result Count</label>
        <input
          style={{ ...inputStyle, borderColor: errors.result_count ? "#dc2626" : BORDER_COLOR }}
          type="text"
          value={values.result_count}
          onChange={(e) => set("result_count", e.target.value)}
          placeholder="Sayı (opsiyonel)"
        />
        {errors.result_count && <div style={errorStyle}>{errors.result_count}</div>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Error Summary</label>
        <textarea
          style={TEXTAREA}
          value={values.error_summary}
          onChange={(e) => set("error_summary", e.target.value)}
          placeholder="Hata özeti (opsiyonel)"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Notes</label>
        <textarea
          style={TEXTAREA}
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Notlar (opsiyonel)"
        />
      </div>

      {submitError && (
        <div style={{ color: "#dc2626", fontSize: "0.875rem", marginBottom: "0.75rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>{submitError}</div>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ ...BTN_PRIMARY, background: isSubmitting ? "#93c5fd" : "#3b82f6", cursor: isSubmitting ? "not-allowed" : "pointer" }}
        >
          {isSubmitting ? "Kaydediliyor..." : (submitLabel ?? (mode === "create" ? "Oluştur" : "Kaydet"))}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{ ...BTN_CANCEL, cursor: isSubmitting ? "not-allowed" : "pointer" }}
        >
          İptal
        </button>
      </div>
    </form>
  );
}
