import { useState } from "react";

export interface SelectedItemFormValues {
  news_item_id: string;
  sort_order: string;
  selection_reason: string;
}

interface Props {
  mode: "create" | "edit";
  initial?: Partial<SelectedItemFormValues>;
  onSubmit: (values: SelectedItemFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}

export function NewsBulletinSelectedItemForm({
  mode,
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
}: Props) {
  const [values, setValues] = useState<SelectedItemFormValues>({
    news_item_id: initial?.news_item_id ?? "",
    sort_order: initial?.sort_order ?? "0",
    selection_reason: initial?.selection_reason ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof SelectedItemFormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "create" && !values.news_item_id.trim()) {
      setError("News Item ID boş olamaz.");
      return;
    }
    const order = Number(values.sort_order);
    if (isNaN(order) || !isFinite(order) || order < 0) {
      setError("Sort order negatif olamaz.");
      return;
    }
    setError(null);
    onSubmit(values);
  }

  const localError = error ?? submitError;

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {localError && <p style={{ color: "red", margin: 0, wordBreak: "break-word", overflowWrap: "anywhere" }}>{localError}</p>}

      {mode === "create" && (
        <label>
          News Item ID <span style={{ color: "red" }}>*</span>
          <input
            type="text"
            value={values.news_item_id}
            onChange={(e) => set("news_item_id", e.target.value)}
            style={{ display: "block", width: "100%", marginTop: "4px", fontFamily: "monospace" }}
          />
        </label>
      )}

      <label>
        Sort Order
        <input
          type="text"
          value={values.sort_order}
          onChange={(e) => set("sort_order", e.target.value)}
          style={{ display: "block", width: "100%", marginTop: "4px" }}
        />
      </label>

      <label>
        Seçim Gerekçesi
        <input
          type="text"
          value={values.selection_reason}
          onChange={(e) => set("selection_reason", e.target.value)}
          style={{ display: "block", width: "100%", marginTop: "4px" }}
        />
      </label>

      <div style={{ display: "flex", gap: "8px" }}>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : mode === "create" ? "Ekle" : "Güncelle"}
        </button>
        <button type="button" onClick={onCancel}>
          İptal
        </button>
      </div>
    </form>
  );
}
