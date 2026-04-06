import { useState } from "react";
import { cn } from "../../lib/cn";

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

  const inputCls = "block w-full px-2 py-1.5 text-md border border-border rounded-sm box-border focus:outline-none focus:ring-2 focus:ring-focus";

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
      <div className="mb-3.5">
        <label className="block text-base font-medium text-neutral-700 mb-1">
          İçerik <span className="text-error">*</span>
        </label>
        <textarea
          className={cn(inputCls, "min-h-[160px] resize-y")}
          value={form.content}
          onChange={(e) => set("content", e.target.value)}
          placeholder="Script içeriği..."
        />
        {contentError && (
          <p className="text-error text-base mt-1 mb-0">{contentError}</p>
        )}
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
