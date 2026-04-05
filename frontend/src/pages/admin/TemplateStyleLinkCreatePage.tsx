import { useNavigate } from "react-router-dom";
import { useCreateTemplateStyleLink } from "../../hooks/useCreateTemplateStyleLink";
import { TemplateStyleLinkForm } from "../../components/template-style-links/TemplateStyleLinkForm";
import type { TemplateStyleLinkFormValues } from "../../components/template-style-links/TemplateStyleLinkForm";
import { colors, typography } from "../../components/design-system/tokens";

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
      <h2
        style={{ margin: "0 0 0.5rem", fontSize: typography.size.xl, fontWeight: typography.weight.semibold }}
        data-testid="tsl-create-heading"
      >
        Yeni Sablon-Stil Baglantisi
      </h2>
      <p
        style={{
          margin: "0 0 1.25rem",
          fontSize: typography.size.md,
          color: colors.neutral[600],
          lineHeight: 1.6,
          maxWidth: "640px",
        }}
        data-testid="tsl-create-subtitle"
      >
        Bir sablon ile style blueprint arasinda baglanti olusturun. Bu baglanti
        sablonun hangi gorsel kurallarla calisacagini belirler. Birincil, yedek
        veya deneysel rol atayabilirsiniz.
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
