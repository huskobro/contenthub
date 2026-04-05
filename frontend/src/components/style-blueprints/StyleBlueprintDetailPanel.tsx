import { useState } from "react";
import { useStyleBlueprintDetail } from "../../hooks/useStyleBlueprintDetail";
import { useUpdateStyleBlueprint } from "../../hooks/useUpdateStyleBlueprint";
import { StyleBlueprintForm } from "./StyleBlueprintForm";
import { formatDateTime } from "../../lib/formatDate";
import { JsonPreviewField } from "../shared/JsonPreviewField";
import type { StyleBlueprintFormValues } from "./StyleBlueprintForm";
import { colors, radius, typography } from "../design-system/tokens";

const COLOR_DARK = colors.neutral[900];
const PANEL_BOX: React.CSSProperties = { padding: "1.25rem", border: `1px solid ${colors.border.subtle}`, borderRadius: radius.md, background: colors.neutral[0] };
const SECTION_DIVIDER: React.CSSProperties = { marginTop: "0.75rem", borderTop: `1px solid ${colors.neutral[100]}`, paddingTop: "0.75rem" };

interface StyleBlueprintDetailPanelProps {
  blueprintId: string | null;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={{ fontSize: typography.size.sm, fontWeight: 600, color: colors.neutral[600] }}>{label}: </span>
      <span style={{ fontSize: typography.size.md, color: value !== null && value !== undefined ? COLOR_DARK : colors.neutral[500], wordBreak: "break-word", overflowWrap: "anywhere" }}>
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
      <div style={{
        padding: "2rem", color: colors.neutral[500], fontSize: typography.size.md,
        textAlign: "center", border: `1px dashed ${colors.border.subtle}`, borderRadius: radius.md,
      }}>
        Bir style blueprint seçin.
      </div>
    );
  }

  if (isLoading) return <p style={{ color: colors.neutral[600], padding: "1rem" }}>Yükleniyor...</p>;

  if (isError) {
    return (
      <p style={{ color: colors.error.base, padding: "1rem" }}>
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
      <div style={PANEL_BOX}>
        <h3 style={{ margin: "0 0 1rem", fontSize: typography.size.lg, color: COLOR_DARK }}>Blueprint Düzenle</h3>
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
    <div style={PANEL_BOX}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h3 style={{ margin: 0, fontSize: typography.size.lg, color: COLOR_DARK }} data-testid="sb-detail-heading">{blueprint.name}</h3>
        <button
          onClick={() => setEditing(true)}
          style={{
            padding: "0.25rem 0.75rem",
            fontSize: typography.size.base,
            background: colors.neutral[100],
            color: colors.neutral[700],
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: radius.sm,
            cursor: "pointer",
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
        data-testid="sb-detail-workflow-note"
      >
        Bu blueprint gorsel ve yapisal kurallari tanimlar. Sablonlarla
        iliskilendirilerek uretim ciktisinin gorsel yonunu belirler.
      </p>

      <Field label="Module Scope" value={blueprint.module_scope} />
      <Field label="Status" value={blueprint.status} />
      <Field label="Version" value={blueprint.version} />
      <Field label="Notes" value={blueprint.notes} />

      <div style={{ marginTop: "1rem", borderTop: `1px solid ${colors.neutral[100]}`, paddingTop: "1rem" }}>
        <JsonPreviewField label="visual_rules_json" value={blueprint.visual_rules_json} />
        <JsonPreviewField label="motion_rules_json" value={blueprint.motion_rules_json} />
        <JsonPreviewField label="layout_rules_json" value={blueprint.layout_rules_json} />
        <JsonPreviewField label="subtitle_rules_json" value={blueprint.subtitle_rules_json} />
        <JsonPreviewField label="thumbnail_rules_json" value={blueprint.thumbnail_rules_json} />
        <JsonPreviewField label="preview_strategy_json" value={blueprint.preview_strategy_json} />
      </div>

      <div style={SECTION_DIVIDER}>
        <Field label="Created" value={formatDateTime(blueprint.created_at)} />
        <Field label="Updated" value={formatDateTime(blueprint.updated_at)} />
      </div>
    </div>
  );
}
