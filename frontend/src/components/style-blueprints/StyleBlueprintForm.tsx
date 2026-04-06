import { useState } from "react";
import type { StyleBlueprintResponse } from "../../api/styleBlueprintsApi";
import { validateJson } from "../../lib/safeJson";
import { cn } from "../../lib/cn";
import { BLUEPRINT_STATUSES } from "../../constants/statusOptions";

export interface StyleBlueprintFormValues {
  name: string;
  module_scope: string;
  status: string;
  version: string;
  visual_rules_json: string;
  motion_rules_json: string;
  layout_rules_json: string;
  subtitle_rules_json: string;
  thumbnail_rules_json: string;
  preview_strategy_json: string;
  notes: string;
}

interface StyleBlueprintFormProps {
  mode: "create" | "edit";
  initial?: StyleBlueprintResponse;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: StyleBlueprintFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function StyleBlueprintForm({
  mode,
  initial,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
  submitLabel,
}: StyleBlueprintFormProps) {
  const [values, setValues] = useState<StyleBlueprintFormValues>({
    name: initial?.name ?? "",
    module_scope: initial?.module_scope ?? "",
    status: initial?.status ?? "draft",
    version: initial ? String(initial.version ?? 1) : "1",
    visual_rules_json: initial?.visual_rules_json ?? "",
    motion_rules_json: initial?.motion_rules_json ?? "",
    layout_rules_json: initial?.layout_rules_json ?? "",
    subtitle_rules_json: initial?.subtitle_rules_json ?? "",
    thumbnail_rules_json: initial?.thumbnail_rules_json ?? "",
    preview_strategy_json: initial?.preview_strategy_json ?? "",
    notes: initial?.notes ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof StyleBlueprintFormValues, string>>>({});

  function set(field: keyof StyleBlueprintFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof StyleBlueprintFormValues, string>> = {};

    if (!values.name.trim()) newErrors.name = "Ad zorunlu";

    const versionNum = Number(values.version);
    if (values.version.trim() !== "" && (isNaN(versionNum) || !isFinite(versionNum) || versionNum < 0)) {
      newErrors.version = "Version negatif olamaz";
    }

    const jsonFields: (keyof StyleBlueprintFormValues)[] = [
      "visual_rules_json",
      "motion_rules_json",
      "layout_rules_json",
      "subtitle_rules_json",
      "thumbnail_rules_json",
      "preview_strategy_json",
    ];
    for (const f of jsonFields) {
      const err = validateJson(values[f]);
      if (err) newErrors[f] = err;
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
      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">
          Ad <span className="text-error">*</span>
        </label>
        <input
          className={cn("w-full py-1.5 px-2 text-md border rounded-sm box-border", errors.name ? "border-error" : "border-border-subtle")}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Blueprint adı"
        />
        {errors.name && <div className="text-sm text-error mt-0.5">{errors.name}</div>}
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
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Status</label>
        <select className="w-full py-1.5 px-2 text-md border border-border-subtle rounded-sm box-border" value={values.status} onChange={(e) => set("status", e.target.value)}>
          {BLUEPRINT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Version</label>
        <input
          className={cn("w-full py-1.5 px-2 text-md border rounded-sm box-border", errors.version ? "border-error" : "border-border-subtle")}
          type="text"
          value={values.version}
          onChange={(e) => set("version", e.target.value)}
        />
        {errors.version && <div className="text-sm text-error mt-0.5">{errors.version}</div>}
      </div>

      <div className="mb-3">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">Notes</label>
        <textarea
          className="w-full py-1.5 px-2 text-md border border-border-subtle rounded-sm box-border min-h-[60px] resize-y"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Opsiyonel notlar"
        />
      </div>

      <div className="border-t border-neutral-100 pt-3 mt-1">
        {(
          [
            ["visual_rules_json", "visual_rules_json"],
            ["motion_rules_json", "motion_rules_json"],
            ["layout_rules_json", "layout_rules_json"],
            ["subtitle_rules_json", "subtitle_rules_json"],
            ["thumbnail_rules_json", "thumbnail_rules_json"],
            ["preview_strategy_json", "preview_strategy_json"],
          ] as [keyof StyleBlueprintFormValues, string][]
        ).map(([field, label]) => (
          <div key={field} className="mb-3">
            <label className="block text-sm font-semibold text-neutral-700 mb-1">{label}</label>
            <textarea
              className={cn("w-full py-1.5 px-2 text-base font-mono border rounded-sm box-border min-h-[70px] resize-y", errors[field] ? "border-error" : "border-border-subtle")}
              value={values[field]}
              onChange={(e) => set(field, e.target.value)}
              placeholder='{"key": "value"}'
            />
            {errors[field] && <div className="text-sm text-error mt-0.5">{errors[field]}</div>}
          </div>
        ))}
      </div>

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
          İptal
        </button>
      </div>
    </form>
  );
}
