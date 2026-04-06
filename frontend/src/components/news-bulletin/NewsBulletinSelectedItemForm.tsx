import { useState } from "react";

const FIELD_CLASS = "block w-full mt-1";

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
  const isCreate = mode === "create";

  function set(field: keyof SelectedItemFormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isCreate && !values.news_item_id.trim()) {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      {localError && <p className="text-red-600 m-0 break-words [overflow-wrap:anywhere]">{localError}</p>}

      {isCreate && (
        <label>
          News Item ID <span className="text-red-600">*</span>
          <input
            type="text"
            value={values.news_item_id}
            onChange={(e) => set("news_item_id", e.target.value)}
            className="block w-full mt-1 font-mono"
          />
        </label>
      )}

      <label>
        Sort Order
        <input
          type="text"
          value={values.sort_order}
          onChange={(e) => set("sort_order", e.target.value)}
          className={FIELD_CLASS}
        />
      </label>

      <label>
        Seçim Gerekçesi
        <input
          type="text"
          value={values.selection_reason}
          onChange={(e) => set("selection_reason", e.target.value)}
          className={FIELD_CLASS}
        />
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : isCreate ? "Ekle" : "Güncelle"}
        </button>
        <button type="button" onClick={onCancel}>
          İptal
        </button>
      </div>
    </form>
  );
}
