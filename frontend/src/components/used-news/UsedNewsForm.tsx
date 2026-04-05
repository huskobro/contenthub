import { useState } from "react";
import type { UsedNewsResponse } from "../../api/usedNewsApi";
import { colors, radius, typography } from "../design-system/tokens";

export interface UsedNewsFormValues {
  news_item_id: string;
  usage_type: string;
  target_module: string;
  usage_context: string;
  target_entity_id: string;
  notes: string;
}

interface UsedNewsFormProps {
  mode: "create" | "edit";
  initial?: UsedNewsResponse;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: UsedNewsFormValues) => void;
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

const REQ_MARK: React.CSSProperties = { color: COLOR_ERR };

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

export function UsedNewsForm({
  mode,
  initial,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
  submitLabel,
}: UsedNewsFormProps) {
  const [values, setValues] = useState<UsedNewsFormValues>({
    news_item_id: initial?.news_item_id ?? "",
    usage_type: initial?.usage_type ?? "",
    target_module: initial?.target_module ?? "",
    usage_context: initial?.usage_context ?? "",
    target_entity_id: initial?.target_entity_id ?? "",
    notes: initial?.notes ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof UsedNewsFormValues, string>>>({});
  const isCreate = mode === "create";

  function set(field: keyof UsedNewsFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof UsedNewsFormValues, string>> = {};
    if (isCreate) {
      if (!values.news_item_id.trim()) newErrors.news_item_id = "News Item ID zorunlu";
    }
    if (!values.usage_type.trim()) newErrors.usage_type = "Usage Type zorunlu";
    if (!values.target_module.trim()) newErrors.target_module = "Target Module zorunlu";
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
        <div style={fieldStyle}>
          <label style={labelStyle}>
            News Item ID <span style={REQ_MARK}>*</span>
          </label>
          <input
            style={{ ...inputStyle, borderColor: errors.news_item_id ? COLOR_ERR : colors.border.subtle }}
            value={values.news_item_id}
            onChange={(e) => set("news_item_id", e.target.value)}
            placeholder="News item UUID"
          />
          {errors.news_item_id && <div style={errorStyle}>{errors.news_item_id}</div>}
        </div>
      )}

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Usage Type <span style={REQ_MARK}>*</span>
        </label>
        <input
          style={{ ...inputStyle, borderColor: errors.usage_type ? COLOR_ERR : colors.border.subtle }}
          value={values.usage_type}
          onChange={(e) => set("usage_type", e.target.value)}
          placeholder="ör. bulletin, video"
        />
        {errors.usage_type && <div style={errorStyle}>{errors.usage_type}</div>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Target Module <span style={REQ_MARK}>*</span>
        </label>
        <input
          style={{ ...inputStyle, borderColor: errors.target_module ? COLOR_ERR : colors.border.subtle }}
          value={values.target_module}
          onChange={(e) => set("target_module", e.target.value)}
          placeholder="ör. news_bulletin, standard_video"
        />
        {errors.target_module && <div style={errorStyle}>{errors.target_module}</div>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Usage Context</label>
        <input
          style={inputStyle}
          value={values.usage_context}
          onChange={(e) => set("usage_context", e.target.value)}
          placeholder="Bağlam (opsiyonel)"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Target Entity ID</label>
        <input
          style={inputStyle}
          value={values.target_entity_id}
          onChange={(e) => set("target_entity_id", e.target.value)}
          placeholder="Hedef varlık UUID (opsiyonel)"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, minHeight: "50px", resize: "vertical" }}
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Notlar (opsiyonel)"
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
