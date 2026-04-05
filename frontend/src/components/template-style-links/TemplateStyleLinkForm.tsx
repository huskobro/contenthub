import { useState } from "react";
import type { TemplateStyleLinkResponse } from "../../api/templateStyleLinksApi";
import { colors, radius, typography } from "../design-system/tokens";

export interface TemplateStyleLinkFormValues {
  template_id: string;
  style_blueprint_id: string;
  link_role: string;
  status: string;
  notes: string;
}

interface TemplateStyleLinkFormProps {
  mode: "create" | "edit";
  initial?: TemplateStyleLinkResponse;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: TemplateStyleLinkFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const COLOR_ERR = colors.error.base;
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.375rem 0.5rem",
  fontSize: typography.size.md,
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: radius.sm,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: typography.size.sm,
  fontWeight: 600,
  color: colors.neutral[700],
  marginBottom: "0.25rem",
};

const fieldStyle: React.CSSProperties = {
  marginBottom: "0.75rem",
};

const errorStyle: React.CSSProperties = {
  fontSize: typography.size.sm,
  color: COLOR_ERR,
  marginTop: "0.2rem",
};

const BTN_PRIMARY: React.CSSProperties = {
  padding: "0.375rem 1rem",
  fontSize: typography.size.md,
  color: colors.neutral[0],
  border: "none",
  borderRadius: radius.sm,
};

const BTN_CANCEL: React.CSSProperties = {
  padding: "0.375rem 1rem",
  fontSize: typography.size.md,
  background: colors.neutral[100],
  color: colors.neutral[700],
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: radius.sm,
};

export function TemplateStyleLinkForm({
  mode,
  initial,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
  submitLabel,
}: TemplateStyleLinkFormProps) {
  const [values, setValues] = useState<TemplateStyleLinkFormValues>({
    template_id: initial?.template_id ?? "",
    style_blueprint_id: initial?.style_blueprint_id ?? "",
    link_role: initial?.link_role ?? "",
    status: initial?.status ?? "active",
    notes: initial?.notes ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TemplateStyleLinkFormValues, string>>>({});
  const isCreate = mode === "create";

  function set(field: keyof TemplateStyleLinkFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof TemplateStyleLinkFormValues, string>> = {};
    if (isCreate) {
      if (!values.template_id.trim()) newErrors.template_id = "Template ID zorunlu";
      if (!values.style_blueprint_id.trim()) newErrors.style_blueprint_id = "Blueprint ID zorunlu";
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
          <div style={fieldStyle}>
            <label style={labelStyle}>
              Template ID <span style={{ color: COLOR_ERR }}>*</span>
            </label>
            <input
              style={{ ...inputStyle, borderColor: errors.template_id ? COLOR_ERR : colors.border.subtle }}
              value={values.template_id}
              onChange={(e) => set("template_id", e.target.value)}
              placeholder="Template UUID"
            />
            {errors.template_id && <div style={errorStyle}>{errors.template_id}</div>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Style Blueprint ID <span style={{ color: COLOR_ERR }}>*</span>
            </label>
            <input
              style={{ ...inputStyle, borderColor: errors.style_blueprint_id ? COLOR_ERR : colors.border.subtle }}
              value={values.style_blueprint_id}
              onChange={(e) => set("style_blueprint_id", e.target.value)}
              placeholder="Style Blueprint UUID"
            />
            {errors.style_blueprint_id && <div style={errorStyle}>{errors.style_blueprint_id}</div>}
          </div>
        </>
      )}

      <div style={fieldStyle}>
        <label style={labelStyle}>Link Role</label>
        <input
          style={inputStyle}
          value={values.link_role}
          onChange={(e) => set("link_role", e.target.value)}
          placeholder="ör. primary, fallback, experimental (opsiyonel)"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Status</label>
        <select style={inputStyle} value={values.status} onChange={(e) => set("status", e.target.value)}>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="archived">archived</option>
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Opsiyonel not"
        />
      </div>

      {submitError && (
        <div style={{ color: COLOR_ERR, fontSize: typography.size.md, marginBottom: "0.75rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>{submitError}</div>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ ...BTN_PRIMARY, background: isSubmitting ? colors.info.light : colors.brand[500], cursor: isSubmitting ? "not-allowed" : "pointer" }}
        >
          {isSubmitting ? "Kaydediliyor..." : (submitLabel ?? (isCreate ? "Oluştur" : "Kaydet"))}
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
