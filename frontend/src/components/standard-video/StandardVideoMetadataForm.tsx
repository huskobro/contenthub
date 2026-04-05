import { colors, radius, typography } from "../design-system/tokens";
import { useState } from "react";

const COLOR_ERR = colors.error.base;
const FIELD_STYLE: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.375rem 0.5rem",
  fontSize: typography.size.md,
  border: `1px solid ${colors.border.default}`,
  borderRadius: radius.sm,
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: typography.size.base,
  fontWeight: 500,
  color: colors.neutral[700],
  marginBottom: "0.25rem",
};

const ROW_STYLE: React.CSSProperties = { marginBottom: "0.875rem" };

const PAIR_ROW: React.CSSProperties = { display: "flex", gap: "1rem", marginBottom: "0.875rem" };

const FLEX_1: React.CSSProperties = { flex: 1 };

const BTN_PRIMARY: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  fontSize: typography.size.md,
  background: colors.brand[500],
  color: colors.neutral[0],
  border: "none",
  borderRadius: radius.sm,
};

const BTN_CANCEL: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  fontSize: typography.size.md,
  background: "transparent",
  color: colors.neutral[600],
  border: `1px solid ${colors.border.default}`,
  borderRadius: radius.sm,
  cursor: "pointer",
};

const SOURCE_TYPE_OPTIONS = ["manual", "generated"] as const;
const GENERATION_STATUS_OPTIONS = ["draft", "ready"] as const;

export interface MetadataFormValues {
  title: string;
  description: string;
  tags_json: string;
  category: string;
  language: string;
  source_type: string;
  generation_status: string;
  notes: string;
}

interface Props {
  mode: "create" | "edit";
  initial?: Partial<MetadataFormValues>;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: MetadataFormValues) => void;
  onCancel: () => void;
}

export function StandardVideoMetadataForm({
  mode,
  initial,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<MetadataFormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    tags_json: initial?.tags_json ?? "",
    category: initial?.category ?? "",
    language: initial?.language ?? "",
    source_type: initial?.source_type ?? "manual",
    generation_status: initial?.generation_status ?? "draft",
    notes: initial?.notes ?? "",
  });
  const [titleError, setTitleError] = useState("");

  function set(field: keyof MetadataFormValues, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setTitleError("Başlık zorunludur.");
      return;
    }
    setTitleError("");
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={ROW_STYLE}>
        <label style={LABEL_STYLE}>
          Başlık <span style={{ color: COLOR_ERR }}>*</span>
        </label>
        <input
          style={FIELD_STYLE}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Video başlığı"
        />
        {titleError && (
          <p style={{ color: COLOR_ERR, fontSize: typography.size.base, margin: "0.25rem 0 0" }}>
            {titleError}
          </p>
        )}
      </div>

      <div style={ROW_STYLE}>
        <label style={LABEL_STYLE}>Açıklama</label>
        <textarea
          style={{ ...FIELD_STYLE, minHeight: "80px", resize: "vertical" }}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Video açıklaması"
        />
      </div>

      <div style={ROW_STYLE}>
        <label style={LABEL_STYLE}>
          Etiketler{" "}
          <span style={{ fontSize: typography.size.sm, color: colors.neutral[500], fontWeight: 400 }}>
            (virgülle ayır: etiket1, etiket2)
          </span>
        </label>
        <input
          style={FIELD_STYLE}
          value={form.tags_json}
          onChange={(e) => set("tags_json", e.target.value)}
          placeholder="etiket1, etiket2, etiket3"
        />
      </div>

      <div style={PAIR_ROW}>
        <div style={FLEX_1}>
          <label style={LABEL_STYLE}>Kategori</label>
          <input
            style={FIELD_STYLE}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="örn. education"
          />
        </div>
        <div style={FLEX_1}>
          <label style={LABEL_STYLE}>Dil</label>
          <input
            style={FIELD_STYLE}
            value={form.language}
            onChange={(e) => set("language", e.target.value)}
            placeholder="örn. tr, en"
          />
        </div>
      </div>

      <div style={PAIR_ROW}>
        <div style={FLEX_1}>
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
        <div style={FLEX_1}>
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
        <p style={{ color: COLOR_ERR, fontSize: typography.size.md, marginBottom: "0.75rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>
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
