import { useState } from "react";
import type { TemplateResponse } from "../../api/templatesApi";
import { validateJson } from "../../lib/safeJson";

export interface TemplateFormValues {
  name: string;
  template_type: string;
  owner_scope: string;
  module_scope: string;
  description: string;
  status: string;
  version: string;
  style_profile_json: string;
  content_rules_json: string;
  publish_profile_json: string;
}

interface TemplateFormProps {
  mode: "create" | "edit";
  initial?: TemplateResponse;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: TemplateFormValues) => void;
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

export function TemplateForm({
  mode,
  initial,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
  submitLabel,
}: TemplateFormProps) {
  const [values, setValues] = useState<TemplateFormValues>({
    name: initial?.name ?? "",
    template_type: initial?.template_type ?? "style",
    owner_scope: initial?.owner_scope ?? "admin",
    module_scope: initial?.module_scope ?? "",
    description: initial?.description ?? "",
    status: initial?.status ?? "draft",
    version: initial ? String(initial.version ?? 1) : "1",
    style_profile_json: initial?.style_profile_json ?? "",
    content_rules_json: initial?.content_rules_json ?? "",
    publish_profile_json: initial?.publish_profile_json ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TemplateFormValues, string>>>({});

  function set(field: keyof TemplateFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof TemplateFormValues, string>> = {};

    if (!values.name.trim()) newErrors.name = "Ad zorunlu";
    if (!values.template_type.trim()) newErrors.template_type = "Tür zorunlu";
    if (!values.owner_scope.trim()) newErrors.owner_scope = "Owner scope zorunlu";

    const versionNum = Number(values.version);
    if (values.version.trim() !== "" && (isNaN(versionNum) || !isFinite(versionNum) || versionNum < 0)) {
      newErrors.version = "Version negatif olamaz";
    }

    const styleErr = validateJson(values.style_profile_json);
    if (styleErr) newErrors.style_profile_json = styleErr;
    const contentErr = validateJson(values.content_rules_json);
    if (contentErr) newErrors.content_rules_json = contentErr;
    const publishErr = validateJson(values.publish_profile_json);
    if (publishErr) newErrors.publish_profile_json = publishErr;

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
          style={{ ...inputStyle, borderColor: errors.name ? "#dc2626" : BORDER_COLOR }}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Template adı"
        />
        {errors.name && <div style={errorStyle}>{errors.name}</div>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Template Type <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <select style={inputStyle} value={values.template_type} onChange={(e) => set("template_type", e.target.value)}>
          <option value="style">style</option>
          <option value="content">content</option>
          <option value="publish">publish</option>
        </select>
        {errors.template_type && <div style={errorStyle}>{errors.template_type}</div>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Owner Scope <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <select style={inputStyle} value={values.owner_scope} onChange={(e) => set("owner_scope", e.target.value)}>
          <option value="system">system</option>
          <option value="admin">admin</option>
          <option value="user">user</option>
        </select>
        {errors.owner_scope && <div style={errorStyle}>{errors.owner_scope}</div>}
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
        <label style={labelStyle}>Açıklama</label>
        <textarea
          style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Opsiyonel açıklama"
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
          style={{ ...inputStyle, borderColor: errors.version ? "#dc2626" : BORDER_COLOR }}
          type="number"
          min={0}
          value={values.version}
          onChange={(e) => set("version", e.target.value)}
        />
        {errors.version && <div style={errorStyle}>{errors.version}</div>}
      </div>

      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>style_profile_json</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: "70px",
              resize: "vertical",
              fontFamily: "monospace",
              fontSize: "0.8rem",
              borderColor: errors.style_profile_json ? "#dc2626" : BORDER_COLOR,
            }}
            value={values.style_profile_json}
            onChange={(e) => set("style_profile_json", e.target.value)}
            placeholder='{"key": "value"}'
          />
          {errors.style_profile_json && <div style={errorStyle}>{errors.style_profile_json}</div>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>content_rules_json</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: "70px",
              resize: "vertical",
              fontFamily: "monospace",
              fontSize: "0.8rem",
              borderColor: errors.content_rules_json ? "#dc2626" : BORDER_COLOR,
            }}
            value={values.content_rules_json}
            onChange={(e) => set("content_rules_json", e.target.value)}
            placeholder='{"key": "value"}'
          />
          {errors.content_rules_json && <div style={errorStyle}>{errors.content_rules_json}</div>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>publish_profile_json</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: "70px",
              resize: "vertical",
              fontFamily: "monospace",
              fontSize: "0.8rem",
              borderColor: errors.publish_profile_json ? "#dc2626" : BORDER_COLOR,
            }}
            value={values.publish_profile_json}
            onChange={(e) => set("publish_profile_json", e.target.value)}
            placeholder='{"key": "value"}'
          />
          {errors.publish_profile_json && <div style={errorStyle}>{errors.publish_profile_json}</div>}
        </div>
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
