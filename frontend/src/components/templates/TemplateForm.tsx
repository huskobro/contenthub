import { useState, useMemo } from "react";
import type { TemplateResponse } from "../../api/templatesApi";
import { validateJson } from "../../lib/safeJson";
import { cn } from "../../lib/cn";
import {
  TEMPLATE_TYPES,
  OWNER_SCOPES,
  TEMPLATE_STATUSES,
} from "../../constants/statusOptions";
import { TemplateVisualPreview } from "../preview/TemplateVisualPreview";

export interface TemplateFormValues {
  name: string;
  template_type: string;
  owner_scope: string;
  module_scope: string;
  description: string;
  status: string;
  version: string;
  style_profile_json: string;
  content_rules_json: string;
  publish_profile_json: string;
}

interface TemplateFormProps {
  mode: "create" | "edit";
  initial?: TemplateResponse;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: TemplateFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
}

export function TemplateForm({
  mode,
  initial,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel = "İptal",
}: TemplateFormProps) {
  const [values, setValues] = useState<TemplateFormValues>({
    name: initial?.name ?? "",
    template_type: initial?.template_type ?? "style",
    owner_scope: initial?.owner_scope ?? "admin",
    module_scope: initial?.module_scope ?? "",
    description: initial?.description ?? "",
    status: initial?.status ?? "draft",
    version: initial ? String(initial.version ?? 1) : "1",
    style_profile_json: initial?.style_profile_json ?? "",
    content_rules_json: initial?.content_rules_json ?? "",
    publish_profile_json: initial?.publish_profile_json ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TemplateFormValues, string>>>({});

  const templatePreviewProps = useMemo(() => {
    function safeParse(json: string) {
      if (!json.trim()) return undefined;
      try { return JSON.parse(json); } catch { return undefined; }
    }
    return {
      templateName: values.name || undefined,
      styleProfile: safeParse(values.style_profile_json),
      contentRules: safeParse(values.content_rules_json),
    };
  }, [values.name, values.style_profile_json, values.content_rules_json]);

  function set(field: keyof TemplateFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof TemplateFormValues, string>> = {};

    if (!values.name.trim()) newErrors.name = "Ad zorunlu";
    if (!values.template_type.trim()) newErrors.template_type = "Tür zorunlu";
    if (!values.owner_scope.trim()) newErrors.owner_scope = "Owner scope zorunlu";

    const versionNum = Number(values.version);
    if (values.version.trim() !== "" && (isNaN(versionNum) || !isFinite(versionNum) || versionNum < 0)) {
      newErrors.version = "Version negatif olamaz";
    }

    const styleErr = validateJson(values.style_profile_json);
    if (styleErr) newErrors.style_profile_json = styleErr;
    const contentErr = validateJson(values.content_rules_json);
    if (contentErr) newErrors.content_rules_json = contentErr;
    const publishErr = validateJson(values.publish_profile_json);
    if (publishErr) newErrors.publish_profile_json = publishErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">
          Ad <span className="text-error">*</span>
        </label>
        <input
          className={cn("w-full py-1.5 px-2 text-md border rounded-sm box-border", errors.name ? "border-error" : "border-border-subtle")}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Template adı"
        />
        {errors.name && <div className="text-sm text-error mt-0.5">{errors.name}</div>}
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">
          Template Type <span className="text-error">*</span>
        </label>
        <select className="w-full py-1.5 px-2 text-md border border-border-subtle rounded-sm box-border" value={values.template_type} onChange={(e) => set("template_type", e.target.value)}>
          {TEMPLATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {errors.template_type && <div className="text-sm text-error mt-0.5">{errors.template_type}</div>}
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">
          Owner Scope <span className="text-error">*</span>
        </label>
        <select className="w-full py-1.5 px-2 text-md border border-border-subtle rounded-sm box-border" value={values.owner_scope} onChange={(e) => set("owner_scope", e.target.value)}>
          {OWNER_SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {errors.owner_scope && <div className="text-sm text-error mt-0.5">{errors.owner_scope}</div>}
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Module Scope</label>
        <input
          className="w-full py-1.5 px-2 text-md border border-border-subtle rounded-sm box-border"
          value={values.module_scope}
          onChange={(e) => set("module_scope", e.target.value)}
          placeholder="ör. standard_video (opsiyonel)"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Açıklama</label>
        <textarea
          className="w-full py-1.5 px-2 text-md border border-border-subtle rounded-sm box-border min-h-[60px] resize-y"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Opsiyonel açıklama"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Status</label>
        <select className="w-full py-1.5 px-2 text-md border border-border-subtle rounded-sm box-border" value={values.status} onChange={(e) => set("status", e.target.value)}>
          {TEMPLATE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Version</label>
        <input
          className={cn("w-full py-1.5 px-2 text-md border rounded-sm box-border", errors.version ? "border-error" : "border-border-subtle")}
          type="number"
          min={0}
          value={values.version}
          onChange={(e) => set("version", e.target.value)}
        />
        {errors.version && <div className="text-sm text-error mt-0.5">{errors.version}</div>}
      </div>

      <div className="border-t border-neutral-100 pt-3 mt-1">
        <div className="mb-3">
          <label className="block text-sm font-semibold text-neutral-700 mb-1">style_profile_json</label>
          <textarea
            className={cn("w-full py-1.5 px-2 text-base font-mono border rounded-sm box-border min-h-[70px] resize-y", errors.style_profile_json ? "border-error" : "border-border-subtle")}
            value={values.style_profile_json}
            onChange={(e) => set("style_profile_json", e.target.value)}
            placeholder='{"key": "value"}'
          />
          {errors.style_profile_json && <div className="text-sm text-error mt-0.5">{errors.style_profile_json}</div>}
        </div>

        <div className="mb-3">
          <label className="block text-sm font-semibold text-neutral-700 mb-1">content_rules_json</label>
          <textarea
            className={cn("w-full py-1.5 px-2 text-base font-mono border rounded-sm box-border min-h-[70px] resize-y", errors.content_rules_json ? "border-error" : "border-border-subtle")}
            value={values.content_rules_json}
            onChange={(e) => set("content_rules_json", e.target.value)}
            placeholder='{"key": "value"}'
          />
          {errors.content_rules_json && <div className="text-sm text-error mt-0.5">{errors.content_rules_json}</div>}
        </div>

        <div className="mb-3">
          <label className="block text-sm font-semibold text-neutral-700 mb-1">publish_profile_json</label>
          <textarea
            className={cn("w-full py-1.5 px-2 text-base font-mono border rounded-sm box-border min-h-[70px] resize-y", errors.publish_profile_json ? "border-error" : "border-border-subtle")}
            value={values.publish_profile_json}
            onChange={(e) => set("publish_profile_json", e.target.value)}
            placeholder='{"key": "value"}'
          />
          {errors.publish_profile_json && <div className="text-sm text-error mt-0.5">{errors.publish_profile_json}</div>}
        </div>
      </div>

      {/* Live template preview */}
      {(templatePreviewProps.templateName || templatePreviewProps.styleProfile || templatePreviewProps.contentRules) && (
        <div className="border-t border-neutral-100 pt-3 mt-1 mb-3">
          <label className="block text-sm font-semibold text-neutral-700 mb-2">Sablon Onizlemesi</label>
          <TemplateVisualPreview {...templatePreviewProps} />
        </div>
      )}

      {submitError && (
        <div className="text-error text-md mb-3 break-words [overflow-wrap:anywhere]">{submitError}</div>
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
          {isSubmitting ? "Kaydediliyor..." : (submitLabel ?? (mode === "create" ? "Oluştur" : "Kaydet"))}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className={cn("py-1.5 px-4 text-md bg-neutral-100 text-neutral-700 border border-border-subtle rounded-sm", isSubmitting ? "cursor-not-allowed" : "cursor-pointer")}
        >
          {cancelLabel}
        </button>
      </div>
    </form>
  );
}
