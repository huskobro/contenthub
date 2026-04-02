import { useState } from "react";
import type { StyleBlueprintResponse } from "../../api/styleBlueprintsApi";

export interface StyleBlueprintFormValues {
  name: string;
  module_scope: string;
  status: string;
  version: string;
  visual_rules_json: string;
  motion_rules_json: string;
  layout_rules_json: string;
  subtitle_rules_json: string;
  thumbnail_rules_json: string;
  preview_strategy_json: string;
  notes: string;
}

interface StyleBlueprintFormProps {
  mode: "create" | "edit";
  initial?: StyleBlueprintResponse;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: StyleBlueprintFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

function validateJson(value: string): string | null {
  if (!value.trim()) return null;
  try {
    JSON.parse(value);
    return null;
  } catch {
    return "Geçersiz JSON";
  }
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.375rem 0.5rem",
  fontSize: "0.875rem",
  border: "1px solid #e2e8f0",
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

export function StyleBlueprintForm({
  mode,
  initial,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
  submitLabel,
}: StyleBlueprintFormProps) {
  const [values, setValues] = useState<StyleBlueprintFormValues>({
    name: initial?.name ?? "",
    module_scope: initial?.module_scope ?? "",
    status: initial?.status ?? "draft",
    version: initial ? String(initial.version) : "1",
    visual_rules_json: initial?.visual_rules_json ?? "",
    motion_rules_json: initial?.motion_rules_json ?? "",
    layout_rules_json: initial?.layout_rules_json ?? "",
    subtitle_rules_json: initial?.subtitle_rules_json ?? "",
    thumbnail_rules_json: initial?.thumbnail_rules_json ?? "",
    preview_strategy_json: initial?.preview_strategy_json ?? "",
    notes: initial?.notes ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof StyleBlueprintFormValues, string>>>({});

  function set(field: keyof StyleBlueprintFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof StyleBlueprintFormValues, string>> = {};

    if (!values.name.trim()) newErrors.name = "Ad zorunlu";

    const versionNum = Number(values.version);
    if (values.version.trim() !== "" && (isNaN(versionNum) || versionNum < 0)) {
      newErrors.version = "Version negatif olamaz";
    }

    const jsonFields: (keyof StyleBlueprintFormValues)[] = [
      "visual_rules_json",
      "motion_rules_json",
      "layout_rules_json",
      "subtitle_rules_json",
      "thumbnail_rules_json",
      "preview_strategy_json",
    ];
    for (const f of jsonFields) {
      const err = validateJson(values[f]);
      if (err) newErrors[f] = err;
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
      <div style={fieldStyle}>
        <label style={labelStyle}>
          Ad <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          style={{ ...inputStyle, borderColor: errors.name ? "#dc2626" : "#e2e8f0" }}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Blueprint adı"
        />
        {errors.name && <div style={errorStyle}>{errors.name}</div>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Module Scope</label>
        <input
          style={inputStyle}
          value={values.module_scope}
          onChange={(e) => set("module_scope", e.target.value)}
          placeholder="ör. standard_video (opsiyonel)"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Status</label>
        <select style={inputStyle} value={values.status} onChange={(e) => set("status", e.target.value)}>
          <option value="draft">draft</option>
          <option value="active">active</option>
          <option value="archived">archived</option>
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Version</label>
        <input
          style={{ ...inputStyle, borderColor: errors.version ? "#dc2626" : "#e2e8f0" }}
          type="text"
          value={values.version}
          onChange={(e) => set("version", e.target.value)}
        />
        {errors.version && <div style={errorStyle}>{errors.version}</div>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Opsiyonel notlar"
        />
      </div>

      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
        {(
          [
            ["visual_rules_json", "visual_rules_json"],
            ["motion_rules_json", "motion_rules_json"],
            ["layout_rules_json", "layout_rules_json"],
            ["subtitle_rules_json", "subtitle_rules_json"],
            ["thumbnail_rules_json", "thumbnail_rules_json"],
            ["preview_strategy_json", "preview_strategy_json"],
          ] as [keyof StyleBlueprintFormValues, string][]
        ).map(([field, label]) => (
          <div key={field} style={fieldStyle}>
            <label style={labelStyle}>{label}</label>
            <textarea
              style={{
                ...inputStyle,
                minHeight: "70px",
                resize: "vertical",
                fontFamily: "monospace",
                fontSize: "0.8rem",
                borderColor: errors[field] ? "#dc2626" : "#e2e8f0",
              }}
              value={values[field]}
              onChange={(e) => set(field, e.target.value)}
              placeholder='{"key": "value"}'
            />
            {errors[field] && <div style={errorStyle}>{errors[field]}</div>}
          </div>
        ))}
      </div>

      {submitError && (
        <div style={{ color: "#dc2626", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{submitError}</div>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "0.375rem 1rem",
            fontSize: "0.875rem",
            background: isSubmitting ? "#93c5fd" : "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? "Kaydediliyor..." : (submitLabel ?? (mode === "create" ? "Oluştur" : "Kaydet"))}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            padding: "0.375rem 1rem",
            fontSize: "0.875rem",
            background: "#f1f5f9",
            color: "#475569",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          İptal
        </button>
      </div>
    </form>
  );
}
