import { useState } from "react";
import type { UsedNewsResponse } from "../../api/usedNewsApi";
import { cn } from "../../lib/cn";

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
        <div className="mb-3">
          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            News Item ID <span className="text-error">*</span>
          </label>
          <input
            className={cn("w-full py-1.5 px-2 text-md border rounded-sm box-border", errors.news_item_id ? "border-error" : "border-border-subtle")}
            value={values.news_item_id}
            onChange={(e) => set("news_item_id", e.target.value)}
            placeholder="News item UUID"
          />
          {errors.news_item_id && <div className="text-sm text-error mt-0.5">{errors.news_item_id}</div>}
        </div>
      )}

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">
          Usage Type <span className="text-error">*</span>
        </label>
        <input
          className={cn("w-full py-1.5 px-2 text-md border rounded-sm box-border", errors.usage_type ? "border-error" : "border-border-subtle")}
          value={values.usage_type}
          onChange={(e) => set("usage_type", e.target.value)}
          placeholder="ör. bulletin, video"
        />
        {errors.usage_type && <div className="text-sm text-error mt-0.5">{errors.usage_type}</div>}
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">
          Target Module <span className="text-error">*</span>
        </label>
        <input
          className={cn("w-full py-1.5 px-2 text-md border rounded-sm box-border", errors.target_module ? "border-error" : "border-border-subtle")}
          value={values.target_module}
          onChange={(e) => set("target_module", e.target.value)}
          placeholder="ör. news_bulletin, standard_video"
        />
        {errors.target_module && <div className="text-sm text-error mt-0.5">{errors.target_module}</div>}
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Usage Context</label>
        <input
          className="w-full py-1.5 px-2 text-md border border-border-subtle rounded-sm box-border"
          value={values.usage_context}
          onChange={(e) => set("usage_context", e.target.value)}
          placeholder="Bağlam (opsiyonel)"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Target Entity ID</label>
        <input
          className="w-full py-1.5 px-2 text-md border border-border-subtle rounded-sm box-border"
          value={values.target_entity_id}
          onChange={(e) => set("target_entity_id", e.target.value)}
          placeholder="Hedef varlık UUID (opsiyonel)"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Notes</label>
        <textarea
          className="w-full py-1.5 px-2 text-md border border-border-subtle rounded-sm box-border min-h-[50px] resize-y"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Notlar (opsiyonel)"
        />
      </div>

      {submitError && (
        <div className="text-error text-md mb-3 break-words" style={{ overflowWrap: "anywhere" }}>{submitError}</div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "py-1.5 px-4 text-md text-neutral-0 border-none rounded-sm",
            isSubmitting ? "bg-info-light cursor-not-allowed" : "bg-brand-500 cursor-pointer"
          )}
        >
          {isSubmitting ? "Kaydediliyor..." : (submitLabel ?? (isCreate ? "Oluştur" : "Kaydet"))}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className={cn("py-1.5 px-4 text-md bg-neutral-100 text-neutral-700 border border-border-subtle rounded-sm", isSubmitting ? "cursor-not-allowed" : "cursor-pointer")}
        >
          İptal
        </button>
      </div>
    </form>
  );
}
