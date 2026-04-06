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
    <div className="max-w-[600px]">
      <h2 className="m-0 mb-2 text-xl font-semibold" data-testid="tpl-create-heading">
        Yeni Sablon
      </h2>
      <p className="m-0 mb-5 text-md text-neutral-600 leading-relaxed max-w-[640px]" data-testid="tpl-create-subtitle">
        Sablon yapilandirma akisinin baslangic noktasi. Icerik, stil veya yayin
        sablonu olusturarak uretim hattinda kullanilacak yapi taslarini tanimlayin.
        Sablonlar style blueprint'lerle iliskilendirilerek gorsel ve yapisal
        kurallar belirlenir.
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
