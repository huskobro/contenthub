import { useState } from "react";
import { useTemplateDetail } from "../../hooks/useTemplateDetail";
import { useUpdateTemplate } from "../../hooks/useUpdateTemplate";
import { useReadOnly } from "../visibility/ReadOnlyGuard";
import { TemplateForm } from "./TemplateForm";
import type { TemplateFormValues } from "./TemplateForm";
import { formatDateTime } from "../../lib/formatDate";
import { isBlank } from "../../lib/isBlank";
import { JsonPreviewField } from "../shared/JsonPreviewField";
import { cn } from "../../lib/cn";

interface TemplateDetailPanelProps {
  templateId: string | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  const isEmpty = value === null || value === undefined || (typeof value === "string" && isBlank(value));
  return (
    <div className="mb-2">
      <span className="text-sm font-semibold text-neutral-600">{label}: </span>
      <span className={cn("text-md break-words [overflow-wrap:anywhere]", isEmpty ? "text-neutral-500" : "text-neutral-900")}>
        {isEmpty ? "—" : String(value)}
      </span>
    </div>
  );
}

export function TemplateDetailPanel({ templateId }: TemplateDetailPanelProps) {
  const readOnly = useReadOnly();
  const [editMode, setEditMode] = useState(false);
  const { data: template, isLoading, isError, error } = useTemplateDetail(templateId);
  const { mutate: updateTemplate, isPending: isUpdating, error: updateError } = useUpdateTemplate(templateId ?? "");

  const [prevId, setPrevId] = useState(templateId);
  if (prevId !== templateId) {
    setPrevId(templateId);
    setEditMode(false);
  }

  if (!templateId) {
    return (
      <div className="p-8 text-neutral-500 text-md text-center border border-dashed border-border-subtle rounded-md">
        Bir template seçin.
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-neutral-600 p-4">Yükleniyor...</p>;
  }

  if (isError) {
    return (
      <p className="text-error p-4">
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }

  if (!template) return null;

  if (editMode) {
    function handleUpdate(values: TemplateFormValues) {
      updateTemplate(
        {
          name: values.name.trim(),
          template_type: values.template_type,
          owner_scope: values.owner_scope,
          module_scope: values.module_scope.trim() || null,
          description: values.description.trim() || null,
          status: values.status,
          version: (() => { const v = values.version.trim(); if (!v) return undefined; const n = Number(v); return isNaN(n) || !isFinite(n) ? undefined : n; })(),
          style_profile_json: values.style_profile_json.trim() || null,
          content_rules_json: values.content_rules_json.trim() || null,
          publish_profile_json: values.publish_profile_json.trim() || null,
        },
        { onSuccess: () => setEditMode(false) }
      );
    }

    return (
      <div className="p-5 border border-border-subtle rounded-md bg-neutral-0">
        <h3 className="m-0 mb-4 text-lg text-neutral-900">Düzenle</h3>
        <TemplateForm
          mode="edit"
          initial={template}
          isSubmitting={isUpdating}
          submitError={updateError instanceof Error ? updateError.message : null}
          onSubmit={handleUpdate}
          onCancel={() => setEditMode(false)}
          submitLabel="Kaydet"
        />
      </div>
    );
  }

  return (
    <div className="p-5 border border-border-subtle rounded-md bg-neutral-0">
      <div className="flex justify-between items-start mb-2">
        <h3 className="m-0 text-lg text-neutral-900" data-testid="tpl-detail-heading">{template.name}</h3>
        <button
          onClick={() => setEditMode(true)}
          disabled={readOnly}
          className={cn(
            "py-1 px-3 text-base bg-neutral-100 text-neutral-700 border border-border-subtle rounded-sm",
            readOnly ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          )}
        >
          Düzenle
        </button>
      </div>
      <p
        className="m-0 mb-4 text-base text-neutral-500 leading-normal"
        data-testid="tpl-detail-workflow-note"
      >
        Bu sablon uretim hattinda kullanilacak yapi tasidir. Style blueprint
        baglantilari ile gorsel kurallar belirlenir.
      </p>

      <Field label="Type" value={template.template_type} />
      <Field label="Owner Scope" value={template.owner_scope} />
      <Field label="Module Scope" value={template.module_scope} />
      <Field label="Status" value={template.status} />
      <Field label="Version" value={template.version} />
      <Field label="Description" value={template.description} />

      <div className="mt-4 border-t border-neutral-100 pt-4">
        <JsonPreviewField label="style_profile_json" value={template.style_profile_json} />
        <JsonPreviewField label="content_rules_json" value={template.content_rules_json} />
        <JsonPreviewField label="publish_profile_json" value={template.publish_profile_json} />
      </div>

      <div className="mt-3 border-t border-neutral-100 pt-3">
        <Field label="Created" value={formatDateTime(template.created_at)} />
        <Field label="Updated" value={formatDateTime(template.updated_at)} />
      </div>
    </div>
  );
}
