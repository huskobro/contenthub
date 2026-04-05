import { useState } from "react";
import { useTemplateDetail } from "../../hooks/useTemplateDetail";
import { useUpdateTemplate } from "../../hooks/useUpdateTemplate";
import { useReadOnly } from "../visibility/ReadOnlyGuard";
import { TemplateForm } from "./TemplateForm";
import type { TemplateFormValues } from "./TemplateForm";
import { formatDateTime } from "../../lib/formatDate";
import { isBlank } from "../../lib/isBlank";
import { JsonPreviewField } from "../shared/JsonPreviewField";
import { colors, radius, typography } from "../design-system/tokens";

const COLOR_DARK = colors.neutral[900];
const BORDER = `1px solid ${colors.border.subtle}`;
const PANEL_BOX: React.CSSProperties = { padding: "1.25rem", border: BORDER, borderRadius: radius.md, background: colors.neutral[0] };
const SECTION_DIVIDER: React.CSSProperties = { marginTop: "0.75rem", borderTop: `1px solid ${colors.neutral[100]}`, paddingTop: "0.75rem" };

interface TemplateDetailPanelProps {
  templateId: string | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  const isEmpty = value === null || value === undefined || (typeof value === "string" && isBlank(value));
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={{ fontSize: typography.size.sm, fontWeight: 600, color: colors.neutral[600] }}>{label}: </span>
      <span style={{ fontSize: typography.size.md, color: isEmpty ? colors.neutral[500] : COLOR_DARK, wordBreak: "break-word", overflowWrap: "anywhere" }}>
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
          color: colors.neutral[500],
          fontSize: typography.size.md,
          textAlign: "center",
          border: `1px dashed ${colors.border.subtle}`,
          borderRadius: radius.md,
        }}
      >
        Bir template seçin.
      </div>
    );
  }

  if (isLoading) {
    return <p style={{ color: colors.neutral[600], padding: "1rem" }}>Yükleniyor...</p>;
  }

  if (isError) {
    return (
      <p style={{ color: colors.error.base, padding: "1rem" }}>
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
        <h3 style={{ margin: "0 0 1rem", fontSize: typography.size.lg, color: COLOR_DARK }}>Düzenle</h3>
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
        borderRadius: radius.md,
        background: colors.neutral[0],
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <h3 style={{ margin: 0, fontSize: typography.size.lg, color: COLOR_DARK }} data-testid="tpl-detail-heading">{template.name}</h3>
        <button
          onClick={() => setEditMode(true)}
          disabled={readOnly}
          style={{
            padding: "0.25rem 0.75rem",
            fontSize: typography.size.base,
            background: colors.neutral[100],
            color: colors.neutral[700],
            border: BORDER,
            borderRadius: radius.sm,
            cursor: readOnly ? "not-allowed" : "pointer",
            opacity: readOnly ? 0.5 : 1,
          }}
        >
          Düzenle
        </button>
      </div>
      <p
        style={{
          margin: "0 0 1rem",
          fontSize: typography.size.base,
          color: colors.neutral[500],
          lineHeight: 1.5,
        }}
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

      <div style={{ marginTop: "1rem", borderTop: `1px solid ${colors.neutral[100]}`, paddingTop: "1rem" }}>
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
