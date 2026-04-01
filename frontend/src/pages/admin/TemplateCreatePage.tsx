import { useNavigate } from "react-router-dom";
import { useCreateTemplate } from "../../hooks/useCreateTemplate";
import { TemplateForm } from "../../components/templates/TemplateForm";
import type { TemplateFormValues } from "../../components/templates/TemplateForm";

export function TemplateCreatePage() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useCreateTemplate();

  function handleSubmit(values: TemplateFormValues) {
    mutate(
      {
        name: values.name.trim(),
        template_type: values.template_type,
        owner_scope: values.owner_scope,
        module_scope: values.module_scope.trim() || null,
        description: values.description.trim() || null,
        status: values.status,
        version: values.version.trim() ? Number(values.version) : 1,
        style_profile_json: values.style_profile_json.trim() || null,
        content_rules_json: values.content_rules_json.trim() || null,
        publish_profile_json: values.publish_profile_json.trim() || null,
      },
      {
        onSuccess: (created) => {
          navigate("/admin/templates", { state: { selectedId: created.id } });
        },
      }
    );
  }

  return (
    <div style={{ maxWidth: "600px" }}>
      <h2 style={{ margin: "0 0 0.25rem" }}>Yeni Template</h2>
      <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.875rem" }}>
        Yeni bir template oluştur.
      </p>
      <TemplateForm
        mode="create"
        isSubmitting={isPending}
        submitError={error instanceof Error ? error.message : null}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/templates")}
        submitLabel="Oluştur"
      />
    </div>
  );
}
