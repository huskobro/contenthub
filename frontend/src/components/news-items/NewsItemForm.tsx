import { useState } from "react";
import type { NewsItemResponse } from "../../api/newsItemsApi";
import { normalizeDateForInput } from "../../lib/formatDate";
import { cn } from "../../lib/cn";

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
    published_at: normalizeDateForInput(initial?.published_at),
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

  const inputCls = "w-full px-2 py-1.5 text-md border border-border-subtle rounded-sm box-border focus:outline-none focus:ring-2 focus:ring-focus";
  const inputErrCls = "w-full px-2 py-1.5 text-md border border-error rounded-sm box-border focus:outline-none focus:ring-2 focus:ring-error";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">
          Başlık <span className="text-error">*</span>
        </label>
        <input
          className={errors.title ? inputErrCls : inputCls}
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Haber başlığı"
        />
        {errors.title && <div className="text-sm text-error mt-0.5">{errors.title}</div>}
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">
          URL <span className="text-error">*</span>
        </label>
        <input
          className={errors.url ? inputErrCls : inputCls}
          value={values.url}
          onChange={(e) => set("url", e.target.value)}
          placeholder="Haber URL'si"
        />
        {errors.url && <div className="text-sm text-error mt-0.5">{errors.url}</div>}
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Status</label>
        <select className={inputCls} value={values.status} onChange={(e) => set("status", e.target.value)}>
          <option value="new">new</option>
          <option value="pending">pending</option>
          <option value="used">used</option>
          <option value="rejected">rejected</option>
          <option value="archived">archived</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Kaynak ID</label>
        <input
          className={inputCls}
          value={values.source_id}
          onChange={(e) => set("source_id", e.target.value)}
          placeholder="Source UUID (opsiyonel)"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Dil</label>
        <input
          className={inputCls}
          value={values.language}
          onChange={(e) => set("language", e.target.value)}
          placeholder="ör. tr, en (opsiyonel)"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Kategori</label>
        <input
          className={inputCls}
          value={values.category}
          onChange={(e) => set("category", e.target.value)}
          placeholder="ör. Teknoloji (opsiyonel)"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Yayınlanma Tarihi</label>
        <input
          className={inputCls}
          type="datetime-local"
          value={values.published_at}
          onChange={(e) => set("published_at", e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Özet</label>
        <textarea
          className={cn(inputCls, "min-h-[60px] resize-y")}
          value={values.summary}
          onChange={(e) => set("summary", e.target.value)}
          placeholder="Kısa özet (opsiyonel)"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Dedupe Key</label>
        <input
          className={inputCls}
          value={values.dedupe_key}
          onChange={(e) => set("dedupe_key", e.target.value)}
          placeholder="Dedupe anahtarı (opsiyonel)"
        />
      </div>

      {submitError && (
        <div className="text-error text-md mb-3 break-words [overflow-wrap:anywhere]">{submitError}</div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "px-4 py-1.5 text-md text-neutral-0 border-none rounded-sm",
            isSubmitting ? "bg-info-light cursor-not-allowed" : "bg-brand-500 cursor-pointer hover:bg-brand-600 transition-colors duration-fast"
          )}
        >
          {isSubmitting ? "Kaydediliyor..." : (submitLabel ?? (mode === "create" ? "Oluştur" : "Kaydet"))}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className={cn(
            "px-4 py-1.5 text-md bg-neutral-100 text-neutral-700 border border-border-subtle rounded-sm",
            isSubmitting ? "cursor-not-allowed" : "cursor-pointer hover:bg-neutral-200 transition-colors duration-fast"
          )}
        >
          İptal
        </button>
      </div>
    </form>
  );
}
