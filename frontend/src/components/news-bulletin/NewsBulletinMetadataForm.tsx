import { useState } from "react";

const FIELD: React.CSSProperties = { display: "block", width: "100%", marginTop: "4px" };

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
  onSubmit: (values: MetadataFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}

export function NewsBulletinMetadataForm({
  mode,
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
}: Props) {
  const [values, setValues] = useState<MetadataFormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    tags_json: initial?.tags_json ?? "",
    category: initial?.category ?? "",
    language: initial?.language ?? "",
    source_type: initial?.source_type ?? "manual",
    generation_status: initial?.generation_status ?? "draft",
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof MetadataFormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) {
      setError("Başlık boş olamaz.");
      return;
    }
    setError(null);
    onSubmit(values);
  }

  const localError = error ?? submitError;

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {localError && <p style={{ color: "red", margin: 0, wordBreak: "break-word", overflowWrap: "anywhere" }}>{localError}</p>}

      <label>
        Başlık <span style={{ color: "red" }}>*</span>
        <input
          type="text"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          style={FIELD}
        />
      </label>

      <label>
        Açıklama
        <textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          style={FIELD}
        />
      </label>

      <label>
        Etiketler (JSON)
        <input
          type="text"
          value={values.tags_json}
          onChange={(e) => set("tags_json", e.target.value)}
          style={FIELD}
        />
      </label>

      <label>
        Kategori
        <input
          type="text"
          value={values.category}
          onChange={(e) => set("category", e.target.value)}
          style={FIELD}
        />
      </label>

      <label>
        Dil
        <input
          type="text"
          value={values.language}
          onChange={(e) => set("language", e.target.value)}
          style={FIELD}
        />
      </label>

      <label>
        Kaynak Tipi
        <select
          value={values.source_type}
          onChange={(e) => set("source_type", e.target.value)}
          style={FIELD}
        >
          <option value="manual">manual</option>
          <option value="generated">generated</option>
        </select>
      </label>

      <label>
        Üretim Durumu
        <select
          value={values.generation_status}
          onChange={(e) => set("generation_status", e.target.value)}
          style={FIELD}
        >
          <option value="draft">draft</option>
          <option value="ready">ready</option>
        </select>
      </label>

      <label>
        Notlar
        <textarea
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          style={FIELD}
        />
      </label>

      <div style={{ display: "flex", gap: "8px" }}>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : mode === "create" ? "Oluştur" : "Güncelle"}
        </button>
        <button type="button" onClick={onCancel}>
          İptal
        </button>
      </div>
    </form>
  );
}
