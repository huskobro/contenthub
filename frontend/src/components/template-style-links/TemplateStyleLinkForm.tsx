import { useState } from "react";
import type { TemplateStyleLinkResponse } from "../../api/templateStyleLinksApi";
import { cn } from "../../lib/cn";

export interface TemplateStyleLinkFormValues {
  template_id: string;
  style_blueprint_id: string;
  link_role: string;
  status: string;
  notes: string;
}

interface TemplateStyleLinkFormProps {
  mode: "create" | "edit";
  initial?: TemplateStyleLinkResponse;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: TemplateStyleLinkFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function TemplateStyleLinkForm({
  mode,
  initial,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
  submitLabel,
}: TemplateStyleLinkFormProps) {
  const [values, setValues] = useState<TemplateStyleLinkFormValues>({
    template_id: initial?.template_id ?? "",
    style_blueprint_id: initial?.style_blueprint_id ?? "",
    link_role: initial?.link_role ?? "",
    status: initial?.status ?? "active",
    notes: initial?.notes ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TemplateStyleLinkFormValues, string>>>({});
  const isCreate = mode === "create";

  function set(field: keyof TemplateStyleLinkFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof TemplateStyleLinkFormValues, string>> = {};
    if (isCreate) {
      if (!values.template_id.trim()) newErrors.template_id = "Template ID zorunlu";
      if (!values.style_blueprint_id.trim()) newErrors.style_blueprint_id = "Blueprint ID zorunlu";
    }
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
        <>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-700 mb-1">
              Template ID <span className="text-error">*</span>
            </label>
            <input
              className={cn(
                "w-full px-2 py-1.5 text-md border rounded-sm box-border",
                errors.template_id ? "border-error" : "border-border-subtle",
              )}
              value={values.template_id}
              onChange={(e) => set("template_id", e.target.value)}
              placeholder="Template UUID"
            />
            {errors.template_id && <div className="text-sm text-error mt-0.5">{errors.template_id}</div>}
          </div>

          <div className="mb-3">
            <label className="block text-sm font-semibold text-neutral-700 mb-1">
              Style Blueprint ID <span className="text-error">*</span>
            </label>
            <input
              className={cn(
                "w-full px-2 py-1.5 text-md border rounded-sm box-border",
                errors.style_blueprint_id ? "border-error" : "border-border-subtle",
              )}
              value={values.style_blueprint_id}
              onChange={(e) => set("style_blueprint_id", e.target.value)}
              placeholder="Style Blueprint UUID"
            />
            {errors.style_blueprint_id && <div className="text-sm text-error mt-0.5">{errors.style_blueprint_id}</div>}
          </div>
        </>
      )}

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Link Role</label>
        <input
          className="w-full px-2 py-1.5 text-md border border-border-subtle rounded-sm box-border"
          value={values.link_role}
          onChange={(e) => set("link_role", e.target.value)}
          placeholder="ör. primary, fallback, experimental (opsiyonel)"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Status</label>
        <select
          className="w-full px-2 py-1.5 text-md border border-border-subtle rounded-sm box-border"
          value={values.status}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="archived">archived</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Notes</label>
        <textarea
          className="w-full px-2 py-1.5 text-md border border-border-subtle rounded-sm box-border min-h-[60px] resize-y"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Opsiyonel not"
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
            isSubmitting ? "bg-info-light cursor-not-allowed" : "bg-brand-500 cursor-pointer",
          )}
        >
          {isSubmitting ? "Kaydediliyor..." : (submitLabel ?? (isCreate ? "Oluştur" : "Kaydet"))}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className={cn(
            "px-4 py-1.5 text-md bg-neutral-100 text-neutral-700 border border-border-subtle rounded-sm",
            isSubmitting ? "cursor-not-allowed" : "cursor-pointer",
          )}
        >
          İptal
        </button>
      </div>
    </form>
  );
}
