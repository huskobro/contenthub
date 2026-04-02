import { useState } from "react";
import type { NewsItemResponse } from "../../api/newsItemsApi";

export interface NewsItemFormValues {
  title: string;
  url: string;
  status: string;
  source_id: string;
  summary: string;
  language: string;
  category: string;
  published_at: string;
  dedupe_key: string;
}

interface NewsItemFormProps {
  mode: "create" | "edit";
  initial?: NewsItemResponse;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: NewsItemFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
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

export function NewsItemForm({
  mode,
  initial,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
  submitLabel,
}: NewsItemFormProps) {
  const [values, setValues] = useState<NewsItemFormValues>({
    title: initial?.title ?? "",
    url: initial?.url ?? "",
    status: initial?.status ?? "new",
    source_id: initial?.source_id ?? "",
    summary: initial?.summary ?? "",
    language: initial?.language ?? "",
    category: initial?.category ?? "",
    published_at: initial?.published_at ? initial.published_at.slice(0, 16) : "",
    dedupe_key: initial?.dedupe_key ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof NewsItemFormValues, string>>>({});

  function set(field: keyof NewsItemFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof NewsItemFormValues, string>> = {};
    if (!values.title.trim()) newErrors.title = "Başlık zorunlu";
    if (!values.url.trim()) newErrors.url = "URL zorunlu";
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
          Başlık <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          style={{ ...inputStyle, borderColor: errors.title ? "#dc2626" : "#e2e8f0" }}
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Haber başlığı"
        />
        {errors.title && <div style={errorStyle}>{errors.title}</div>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>
          URL <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          style={{ ...inputStyle, borderColor: errors.url ? "#dc2626" : "#e2e8f0" }}
          value={values.url}
          onChange={(e) => set("url", e.target.value)}
          placeholder="Haber URL'si"
        />
        {errors.url && <div style={errorStyle}>{errors.url}</div>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Status</label>
        <select style={inputStyle} value={values.status} onChange={(e) => set("status", e.target.value)}>
          <option value="new">new</option>
          <option value="pending">pending</option>
          <option value="used">used</option>
          <option value="rejected">rejected</option>
          <option value="archived">archived</option>
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Kaynak ID</label>
        <input
          style={inputStyle}
          value={values.source_id}
          onChange={(e) => set("source_id", e.target.value)}
          placeholder="Source UUID (opsiyonel)"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Dil</label>
        <input
          style={inputStyle}
          value={values.language}
          onChange={(e) => set("language", e.target.value)}
          placeholder="ör. tr, en (opsiyonel)"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Kategori</label>
        <input
          style={inputStyle}
          value={values.category}
          onChange={(e) => set("category", e.target.value)}
          placeholder="ör. Teknoloji (opsiyonel)"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Yayınlanma Tarihi</label>
        <input
          style={inputStyle}
          type="datetime-local"
          value={values.published_at}
          onChange={(e) => set("published_at", e.target.value)}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Özet</label>
        <textarea
          style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
          value={values.summary}
          onChange={(e) => set("summary", e.target.value)}
          placeholder="Kısa özet (opsiyonel)"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Dedupe Key</label>
        <input
          style={inputStyle}
          value={values.dedupe_key}
          onChange={(e) => set("dedupe_key", e.target.value)}
          placeholder="Dedupe anahtarı (opsiyonel)"
        />
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
