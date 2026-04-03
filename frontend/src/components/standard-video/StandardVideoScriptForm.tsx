import { useState } from "react";

const FIELD_STYLE: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.375rem 0.5rem",
  fontSize: "0.875rem",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "#475569",
  marginBottom: "0.25rem",
};

const ROW_STYLE: React.CSSProperties = { marginBottom: "0.875rem" };

const BTN_PRIMARY: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  fontSize: "0.875rem",
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
};

const BTN_CANCEL: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  fontSize: "0.875rem",
  background: "transparent",
  color: "#64748b",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  cursor: "pointer",
};

const SOURCE_TYPE_OPTIONS = ["manual", "generated"] as const;
const GENERATION_STATUS_OPTIONS = ["draft", "ready"] as const;

export interface ScriptFormValues {
  content: string;
  source_type: string;
  generation_status: string;
  notes: string;
}

interface Props {
  mode: "create" | "edit";
  initial?: Partial<ScriptFormValues>;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: ScriptFormValues) => void;
  onCancel: () => void;
}

export function StandardVideoScriptForm({
  mode,
  initial,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<ScriptFormValues>({
    content: initial?.content ?? "",
    source_type: initial?.source_type ?? "manual",
    generation_status: initial?.generation_status ?? "draft",
    notes: initial?.notes ?? "",
  });
  const [contentError, setContentError] = useState("");

  function set(field: keyof ScriptFormValues, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.content.trim()) {
      setContentError("İçerik zorunludur.");
      return;
    }
    setContentError("");
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={ROW_STYLE}>
        <label style={LABEL_STYLE}>
          İçerik <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <textarea
          style={{ ...FIELD_STYLE, minHeight: "160px", resize: "vertical" }}
          value={form.content}
          onChange={(e) => set("content", e.target.value)}
          placeholder="Script içeriği..."
        />
        {contentError && (
          <p style={{ color: "#dc2626", fontSize: "0.8rem", margin: "0.25rem 0 0" }}>
            {contentError}
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "0.875rem" }}>
        <div style={{ flex: 1 }}>
          <label style={LABEL_STYLE}>Kaynak Tipi</label>
          <select
            style={FIELD_STYLE}
            value={form.source_type}
            onChange={(e) => set("source_type", e.target.value)}
          >
            {SOURCE_TYPE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={LABEL_STYLE}>Üretim Durumu</label>
          <select
            style={FIELD_STYLE}
            value={form.generation_status}
            onChange={(e) => set("generation_status", e.target.value)}
          >
            {GENERATION_STATUS_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={ROW_STYLE}>
        <label style={LABEL_STYLE}>Notlar</label>
        <input
          style={FIELD_STYLE}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Opsiyonel notlar"
        />
      </div>

      {submitError && (
        <p style={{ color: "#dc2626", fontSize: "0.875rem", marginBottom: "0.75rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {submitError}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ ...BTN_PRIMARY, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? "Kaydediliyor..." : mode === "create" ? "Oluştur" : "Güncelle"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={BTN_CANCEL}
        >
          İptal
        </button>
      </div>
    </form>
  );
}
