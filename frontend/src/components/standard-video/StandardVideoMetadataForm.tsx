import { useState } from "react";
import { cn } from "../../lib/cn";

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

  const inputCls = "block w-full px-2 py-1.5 text-md border border-border rounded-sm box-border focus:outline-none focus:ring-2 focus:ring-focus";

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
      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1">
          Başlık <span className="text-error">*</span>
        </label>
        <input
          className={inputCls}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Video başlığı"
        />
        {titleError && (
          <p className="text-error text-base mt-1 mb-0">{titleError}</p>
        )}
      </div>

      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1">Açıklama</label>
        <textarea
          className={cn(inputCls, "min-h-[80px] resize-y")}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Video açıklaması"
        />
      </div>

      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1">
          Etiketler{" "}
          <span className="text-sm text-neutral-500 font-normal">
            (virgülle ayır: etiket1, etiket2)
          </span>
        </label>
        <input
          className={inputCls}
          value={form.tags_json}
          onChange={(e) => set("tags_json", e.target.value)}
          placeholder="etiket1, etiket2, etiket3"
        />
      </div>

      <div className="flex gap-4 mb-3.5">
        <div className="flex-1">
          <label className="block text-base font-medium text-neutral-700 mb-1">Kategori</label>
          <input
            className={inputCls}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="örn. education"
          />
        </div>
        <div className="flex-1">
          <label className="block text-base font-medium text-neutral-700 mb-1">Dil</label>
          <input
            className={inputCls}
            value={form.language}
            onChange={(e) => set("language", e.target.value)}
            placeholder="örn. tr, en"
          />
        </div>
      </div>

      <div className="flex gap-4 mb-3.5">
        <div className="flex-1">
          <label className="block text-base font-medium text-neutral-700 mb-1">Kaynak Tipi</label>
          <select
            className={inputCls}
            value={form.source_type}
            onChange={(e) => set("source_type", e.target.value)}
          >
            {SOURCE_TYPE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-base font-medium text-neutral-700 mb-1">Üretim Durumu</label>
          <select
            className={inputCls}
            value={form.generation_status}
            onChange={(e) => set("generation_status", e.target.value)}
          >
            {GENERATION_STATUS_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1">Notlar</label>
        <input
          className={inputCls}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Opsiyonel notlar"
        />
      </div>

      {submitError && (
        <p className="text-error text-md mb-3 break-words [overflow-wrap:anywhere]">
          {submitError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "px-5 py-2 text-md bg-brand-500 text-neutral-0 border-none rounded-sm",
            isSubmitting ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-brand-600 transition-colors duration-fast"
          )}
        >
          {isSubmitting ? "Kaydediliyor..." : mode === "create" ? "Oluştur" : "Güncelle"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 text-md bg-transparent text-neutral-600 border border-border rounded-sm cursor-pointer hover:bg-neutral-50 transition-colors duration-fast"
        >
          İptal
        </button>
      </div>
    </form>
  );
}
