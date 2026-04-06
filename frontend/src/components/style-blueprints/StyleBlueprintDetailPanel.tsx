import { useState } from "react";
import { useStyleBlueprintDetail } from "../../hooks/useStyleBlueprintDetail";
import { useUpdateStyleBlueprint } from "../../hooks/useUpdateStyleBlueprint";
import { StyleBlueprintForm } from "./StyleBlueprintForm";
import { formatDateTime } from "../../lib/formatDate";
import { JsonPreviewField } from "../shared/JsonPreviewField";
import type { StyleBlueprintFormValues } from "./StyleBlueprintForm";
import { cn } from "../../lib/cn";

interface StyleBlueprintDetailPanelProps {
  blueprintId: string | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="mb-2">
      <span className="text-sm font-semibold text-neutral-600">{label}: </span>
      <span className={cn("text-md break-words [overflow-wrap:anywhere]", value !== null && value !== undefined ? "text-neutral-900" : "text-neutral-500")}>
        {value !== null && value !== undefined ? String(value) : "—"}
      </span>
    </div>
  );
}

export function StyleBlueprintDetailPanel({ blueprintId }: StyleBlueprintDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const { data: blueprint, isLoading, isError, error } = useStyleBlueprintDetail(blueprintId);
  const { mutate, isPending, error: updateError } = useUpdateStyleBlueprint(blueprintId ?? "");

  if (!blueprintId) {
    return (
      <div className="p-8 text-neutral-500 text-md text-center border border-dashed border-border-subtle rounded-md">
        Bir style blueprint seçin.
      </div>
    );
  }

  if (isLoading) return <p className="text-neutral-600 p-4">Yükleniyor...</p>;

  if (isError) {
    return (
      <p className="text-error p-4">
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }

  if (!blueprint) return null;

  if (editing) {
    function handleSubmit(values: StyleBlueprintFormValues) {
      mutate(
        {
          name: values.name.trim(),
          module_scope: values.module_scope.trim() || null,
          status: values.status,
          version: (() => { const v = values.version.trim(); if (!v) return undefined; const n = Number(v); return isNaN(n) || !isFinite(n) ? undefined : n; })(),
          visual_rules_json: values.visual_rules_json.trim() || null,
          motion_rules_json: values.motion_rules_json.trim() || null,
          layout_rules_json: values.layout_rules_json.trim() || null,
          subtitle_rules_json: values.subtitle_rules_json.trim() || null,
          thumbnail_rules_json: values.thumbnail_rules_json.trim() || null,
          preview_strategy_json: values.preview_strategy_json.trim() || null,
          notes: values.notes.trim() || null,
        },
        { onSuccess: () => setEditing(false) }
      );
    }

    return (
      <div className="p-5 border border-border-subtle rounded-md bg-neutral-0">
        <h3 className="m-0 mb-4 text-lg text-neutral-900">Blueprint Düzenle</h3>
        <StyleBlueprintForm
          mode="edit"
          initial={blueprint}
          isSubmitting={isPending}
          submitError={updateError instanceof Error ? updateError.message : null}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(false)}
          submitLabel="Kaydet"
        />
      </div>
    );
  }

  return (
    <div className="p-5 border border-border-subtle rounded-md bg-neutral-0">
      <div className="flex justify-between items-center mb-2">
        <h3 className="m-0 text-lg text-neutral-900" data-testid="sb-detail-heading">{blueprint.name}</h3>
        <button
          onClick={() => setEditing(true)}
          className="py-1 px-3 text-base bg-neutral-100 text-neutral-700 border border-border-subtle rounded-sm cursor-pointer"
        >
          Düzenle
        </button>
      </div>
      <p
        className="m-0 mb-4 text-base text-neutral-500 leading-normal"
        data-testid="sb-detail-workflow-note"
      >
        Bu blueprint gorsel ve yapisal kurallari tanimlar. Sablonlarla
        iliskilendirilerek uretim ciktisinin gorsel yonunu belirler.
      </p>

      <Field label="Module Scope" value={blueprint.module_scope} />
      <Field label="Status" value={blueprint.status} />
      <Field label="Version" value={blueprint.version} />
      <Field label="Notes" value={blueprint.notes} />

      <div className="mt-4 border-t border-neutral-100 pt-4">
        <JsonPreviewField label="visual_rules_json" value={blueprint.visual_rules_json} />
        <JsonPreviewField label="motion_rules_json" value={blueprint.motion_rules_json} />
        <JsonPreviewField label="layout_rules_json" value={blueprint.layout_rules_json} />
        <JsonPreviewField label="subtitle_rules_json" value={blueprint.subtitle_rules_json} />
        <JsonPreviewField label="thumbnail_rules_json" value={blueprint.thumbnail_rules_json} />
        <JsonPreviewField label="preview_strategy_json" value={blueprint.preview_strategy_json} />
      </div>

      <div className="mt-3 border-t border-neutral-100 pt-3">
        <Field label="Created" value={formatDateTime(blueprint.created_at)} />
        <Field label="Updated" value={formatDateTime(blueprint.updated_at)} />
      </div>
    </div>
  );
}
