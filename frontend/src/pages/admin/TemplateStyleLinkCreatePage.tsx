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
    <div className="max-w-[600px]">
      <h2 className="m-0 mb-2 text-xl font-semibold" data-testid="tsl-create-heading">
        Yeni Sablon-Stil Baglantisi
      </h2>
      <p className="m-0 mb-3 text-xs text-neutral-400" data-testid="tsl-create-subtitle">
        Sablon-blueprint baglantisi olusturun. Birincil, yedek veya deneysel rol atayin.
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
