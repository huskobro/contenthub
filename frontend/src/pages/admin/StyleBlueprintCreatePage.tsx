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
    <div className="max-w-[600px]">
      <h2 className="m-0 mb-2 text-xl font-semibold" data-testid="sb-create-heading">
        Yeni Style Blueprint
      </h2>
      <p className="m-0 mb-5 text-md text-neutral-600 leading-relaxed max-w-[640px]" data-testid="sb-create-subtitle">
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
