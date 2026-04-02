import { useState } from "react";

export interface ScriptFormValues {
  content: string;
  source_type: string;
  generation_status: string;
  notes: string;
}

interface Props {
  mode: "create" | "edit";
  initial?: Partial<ScriptFormValues>;
  onSubmit: (values: ScriptFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}

export function NewsBulletinScriptForm({
  mode,
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
}: Props) {
  const [values, setValues] = useState<ScriptFormValues>({
    content: initial?.content ?? "",
    source_type: initial?.source_type ?? "manual",
    generation_status: initial?.generation_status ?? "draft",
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof ScriptFormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.content.trim()) {
      setError("İçerik boş olamaz.");
      return;
    }
    setError(null);
    onSubmit(values);
  }

  const localError = error ?? submitError;

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {localError && <p style={{ color: "red", margin: 0 }}>{localError}</p>}

      <label>
        İçerik <span style={{ color: "red" }}>*</span>
        <textarea
          value={values.content}
          onChange={(e) => set("content", e.target.value)}
          rows={8}
          style={{ display: "block", width: "100%", marginTop: "4px", fontFamily: "monospace", fontSize: "0.85em" }}
        />
      </label>

      <label>
        Kaynak Tipi
        <select
          value={values.source_type}
          onChange={(e) => set("source_type", e.target.value)}
          style={{ display: "block", width: "100%", marginTop: "4px" }}
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
          style={{ display: "block", width: "100%", marginTop: "4px" }}
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
          style={{ display: "block", width: "100%", marginTop: "4px" }}
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
