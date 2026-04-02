import { useNavigate } from "react-router-dom";
import { useCreateStyleBlueprint } from "../../hooks/useCreateStyleBlueprint";
import { StyleBlueprintForm } from "../../components/style-blueprints/StyleBlueprintForm";
import type { StyleBlueprintFormValues } from "../../components/style-blueprints/StyleBlueprintForm";

export function StyleBlueprintCreatePage() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useCreateStyleBlueprint();

  function handleSubmit(values: StyleBlueprintFormValues) {
    mutate(
      {
        name: values.name.trim(),
        module_scope: values.module_scope.trim() || null,
        status: values.status,
        version: values.version.trim() ? Number(values.version) : 1,
        visual_rules_json: values.visual_rules_json.trim() || null,
        motion_rules_json: values.motion_rules_json.trim() || null,
        layout_rules_json: values.layout_rules_json.trim() || null,
        subtitle_rules_json: values.subtitle_rules_json.trim() || null,
        thumbnail_rules_json: values.thumbnail_rules_json.trim() || null,
        preview_strategy_json: values.preview_strategy_json.trim() || null,
        notes: values.notes.trim() || null,
      },
      {
        onSuccess: (created) => {
          navigate("/admin/style-blueprints", { state: { selectedId: created.id } });
        },
      }
    );
  }

  return (
    <div style={{ maxWidth: "600px" }}>
      <h2 style={{ margin: "0 0 0.25rem" }}>Yeni Style Blueprint</h2>
      <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.875rem" }}>
        Yeni bir style blueprint oluştur.
      </p>
      <StyleBlueprintForm
        mode="create"
        isSubmitting={isPending}
        submitError={error instanceof Error ? error.message : null}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/style-blueprints")}
        submitLabel="Oluştur"
      />
    </div>
  );
}
