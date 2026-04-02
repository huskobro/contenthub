import { useNavigate } from "react-router-dom";
import { useCreateTemplateStyleLink } from "../../hooks/useCreateTemplateStyleLink";
import { TemplateStyleLinkForm } from "../../components/template-style-links/TemplateStyleLinkForm";
import type { TemplateStyleLinkFormValues } from "../../components/template-style-links/TemplateStyleLinkForm";

export function TemplateStyleLinkCreatePage() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useCreateTemplateStyleLink();

  function handleSubmit(values: TemplateStyleLinkFormValues) {
    mutate(
      {
        template_id: values.template_id.trim(),
        style_blueprint_id: values.style_blueprint_id.trim(),
        link_role: values.link_role.trim() || null,
        status: values.status,
        notes: values.notes.trim() || null,
      },
      {
        onSuccess: (created) => {
          navigate("/admin/template-style-links", { state: { selectedId: created.id } });
        },
      }
    );
  }

  return (
    <div style={{ maxWidth: "600px" }}>
      <h2 style={{ margin: "0 0 0.25rem" }}>Yeni Template Style Link</h2>
      <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.875rem" }}>
        Template ile Style Blueprint arasında yeni bir bağlantı oluştur.
      </p>
      <TemplateStyleLinkForm
        mode="create"
        isSubmitting={isPending}
        submitError={error instanceof Error ? error.message : null}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/template-style-links")}
        submitLabel="Oluştur"
      />
    </div>
  );
}
