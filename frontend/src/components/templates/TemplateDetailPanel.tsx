import { useState } from "react";
import { useTemplateDetail } from "../../hooks/useTemplateDetail";
import { useUpdateTemplate } from "../../hooks/useUpdateTemplate";
import { TemplateForm } from "./TemplateForm";
import type { TemplateFormValues } from "./TemplateForm";
import { formatDateTime } from "../../lib/formatDate";
import { isBlank } from "../../lib/isBlank";
import { JsonPreviewField } from "../shared/JsonPreviewField";

const COLOR_DARK = "#1e293b";
const BORDER = "1px solid #e2e8f0";
const PANEL_BOX: React.CSSProperties = { padding: "1.25rem", border: BORDER, borderRadius: "6px", background: "#fff" };
const SECTION_DIVIDER: React.CSSProperties = { marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" };

interface TemplateDetailPanelProps {
  templateId: string | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  const isEmpty = value === null || value === undefined || (typeof value === "string" && isBlank(value));
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>{label}: </span>
      <span style={{ fontSize: "0.875rem", color: isEmpty ? "#94a3b8" : COLOR_DARK, wordBreak: "break-word", overflowWrap: "anywhere" }}>
        {isEmpty ? "—" : String(value)}
      </span>
    </div>
  );
}

export function TemplateDetailPanel({ templateId }: TemplateDetailPanelProps) {
  const [editMode, setEditMode] = useState(false);
  const { data: template, isLoading, isError, error } = useTemplateDetail(templateId);
  const { mutate: updateTemplate, isPending: isUpdating, error: updateError } = useUpdateTemplate(templateId ?? "");

  // Reset edit mode when template selection changes
  const [prevId, setPrevId] = useState(templateId);
  if (prevId !== templateId) {
    setPrevId(templateId);
    setEditMode(false);
  }

  if (!templateId) {
    return (
      <div
        style={{
          padding: "2rem",
          color: "#94a3b8",
          fontSize: "0.875rem",
          textAlign: "center",
          border: "1px dashed #e2e8f0",
          borderRadius: "6px",
        }}
      >
        Bir template seçin.
      </div>
    );
  }

  if (isLoading) {
    return <p style={{ color: "#64748b", padding: "1rem" }}>Yükleniyor...</p>;
  }

  if (isError) {
    return (
      <p style={{ color: "#dc2626", padding: "1rem" }}>
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
      <div
        style={PANEL_BOX}
      >
        <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", color: COLOR_DARK }}>Düzenle</h3>
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
    <div
      style={{
        padding: "1.25rem",
        border: BORDER,
        borderRadius: "6px",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", color: COLOR_DARK }}>{template.name}</h3>
        <button
          onClick={() => setEditMode(true)}
          style={{
            padding: "0.25rem 0.75rem",
            fontSize: "0.8rem",
            background: "#f1f5f9",
            color: "#475569",
            border: BORDER,
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Düzenle
        </button>
      </div>

      <Field label="Type" value={template.template_type} />
      <Field label="Owner Scope" value={template.owner_scope} />
      <Field label="Module Scope" value={template.module_scope} />
      <Field label="Status" value={template.status} />
      <Field label="Version" value={template.version} />
      <Field label="Description" value={template.description} />

      <div style={{ marginTop: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
        <JsonPreviewField label="style_profile_json" value={template.style_profile_json} />
        <JsonPreviewField label="content_rules_json" value={template.content_rules_json} />
        <JsonPreviewField label="publish_profile_json" value={template.publish_profile_json} />
      </div>

      <div style={SECTION_DIVIDER}>
        <Field label="Created" value={formatDateTime(template.created_at)} />
        <Field label="Updated" value={formatDateTime(template.updated_at)} />
      </div>
    </div>
  );
}
