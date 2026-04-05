import { useNavigate } from "react-router-dom";
import { useCreateStyleBlueprint } from "../../hooks/useCreateStyleBlueprint";
import { StyleBlueprintForm } from "../../components/style-blueprints/StyleBlueprintForm";
import type { StyleBlueprintFormValues } from "../../components/style-blueprints/StyleBlueprintForm";
import { colors, typography } from "../../components/design-system/tokens";

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
      <h2
        style={{ margin: "0 0 0.5rem", fontSize: typography.size.xl, fontWeight: 600 }}
        data-testid="sb-create-heading"
      >
        Yeni Style Blueprint
      </h2>
      <p
        style={{
          margin: "0 0 1.25rem",
          fontSize: typography.size.md,
          color: colors.neutral[600],
          lineHeight: 1.6,
          maxWidth: "640px",
        }}
        data-testid="sb-create-subtitle"
      >
        Style blueprint gorsel ve yapisal kurallari tanimlar. Gorsel kimlik,
        hareket stili, layout yonu, altyazi stili ve kucuk resim yonu gibi
        kurallari belirleyerek uretim ciktisinin gorsel yonunu kontrol edin.
        Blueprint'ler sablonlarla iliskilendirilerek kullanilir.
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
