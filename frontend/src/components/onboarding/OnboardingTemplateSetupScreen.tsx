import { TemplateForm } from "../templates/TemplateForm";
import { useCreateTemplate } from "../../hooks/useCreateTemplate";
import { useQueryClient } from "@tanstack/react-query";
import type { TemplateFormValues } from "../templates/TemplateForm";

interface Props {
  onBack: () => void;
  onComplete: () => void;
}

export function OnboardingTemplateSetupScreen({ onBack, onComplete }: Props) {
  const createMutation = useCreateTemplate();
  const queryClient = useQueryClient();

  function handleSubmit(values: TemplateFormValues) {
    createMutation.mutate(
      {
        name: values.name.trim(),
        template_type: values.template_type,
        owner_scope: values.owner_scope,
        module_scope: values.module_scope.trim() || null,
        description: values.description.trim() || null,
        status: values.status === "draft" ? "active" : values.status,
        version: values.version.trim() ? Number(values.version) : 1,
        style_profile_json: values.style_profile_json.trim() || null,
        content_rules_json: values.content_rules_json.trim() || null,
        publish_profile_json: values.publish_profile_json.trim() || null,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["setup-requirements"] });
          onComplete();
        },
      }
    );
  }

  const submitError = createMutation.isError
    ? (createMutation.error as Error).message
    : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-border-subtle p-8">
      <div className="max-w-[560px] w-full bg-neutral-0 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-10">
        <h2 className="mb-1.5 text-2xl font-bold text-neutral-900 text-center">Sablon Olustur</h2>
        <p className="mb-7 text-lg text-neutral-700 leading-relaxed text-center">
          Sisteminize en az bir sablon ekleyin. Icerik uretimi icin style,
          content veya publish sablonu olusturabilirsiniz.
        </p>
        <TemplateForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={onBack}
          isSubmitting={createMutation.isPending}
          submitError={submitError}
          submitLabel="Sablonu Olustur"
          cancelLabel="Geri Don"
        />
      </div>
    </div>
  );
}
