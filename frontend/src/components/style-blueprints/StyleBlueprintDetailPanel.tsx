import { useState } from "react";
import { useStyleBlueprintDetail } from "../../hooks/useStyleBlueprintDetail";
import { useUpdateStyleBlueprint } from "../../hooks/useUpdateStyleBlueprint";
import { StyleBlueprintForm } from "./StyleBlueprintForm";
import type { StyleBlueprintFormValues } from "./StyleBlueprintForm";

interface StyleBlueprintDetailPanelProps {
  blueprintId: string | null;
}

function JsonField({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return (
      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }}>{label}</div>
        <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>—</span>
      </div>
    );
  }
  let formatted = value;
  try { formatted = JSON.stringify(JSON.parse(value), null, 2); } catch { /* show as-is */ }
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }}>{label}</div>
      <pre style={{
        margin: 0, padding: "0.5rem", background: "#f8fafc",
        border: "1px solid #e2e8f0", borderRadius: "4px",
        fontSize: "0.8rem", overflowX: "auto", maxHeight: "120px",
        whiteSpace: "pre-wrap", wordBreak: "break-all",
      }}>{formatted}</pre>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>{label}: </span>
      <span style={{ fontSize: "0.875rem", color: value !== null && value !== undefined ? "#1e293b" : "#94a3b8" }}>
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
        padding: "2rem", color: "#94a3b8", fontSize: "0.875rem",
        textAlign: "center", border: "1px dashed #e2e8f0", borderRadius: "6px",
      }}>
        Bir style blueprint seçin.
      </div>
    );
  }

  if (isLoading) return <p style={{ color: "#64748b", padding: "1rem" }}>Yükleniyor...</p>;

  if (isError) {
    return (
      <p style={{ color: "#dc2626", padding: "1rem" }}>
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
          version: values.version.trim() ? Number(values.version) : undefined,
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
      <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#fff" }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", color: "#1e293b" }}>Blueprint Düzenle</h3>
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
    <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", color: "#1e293b" }}>{blueprint.name}</h3>
        <button
          onClick={() => setEditing(true)}
          style={{
            padding: "0.25rem 0.75rem",
            fontSize: "0.8rem",
            background: "#f1f5f9",
            color: "#475569",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Düzenle
        </button>
      </div>

      <Field label="Module Scope" value={blueprint.module_scope} />
      <Field label="Status" value={blueprint.status} />
      <Field label="Version" value={blueprint.version} />
      <Field label="Notes" value={blueprint.notes} />

      <div style={{ marginTop: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
        <JsonField label="visual_rules_json" value={blueprint.visual_rules_json} />
        <JsonField label="motion_rules_json" value={blueprint.motion_rules_json} />
        <JsonField label="layout_rules_json" value={blueprint.layout_rules_json} />
        <JsonField label="subtitle_rules_json" value={blueprint.subtitle_rules_json} />
        <JsonField label="thumbnail_rules_json" value={blueprint.thumbnail_rules_json} />
        <JsonField label="preview_strategy_json" value={blueprint.preview_strategy_json} />
      </div>

      <div style={{ marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
        <Field label="Created" value={blueprint.created_at ? new Date(blueprint.created_at).toLocaleString() : null} />
        <Field label="Updated" value={blueprint.updated_at ? new Date(blueprint.updated_at).toLocaleString() : null} />
      </div>
    </div>
  );
}
