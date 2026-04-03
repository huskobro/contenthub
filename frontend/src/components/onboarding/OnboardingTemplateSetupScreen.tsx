import { TemplateForm } from "../templates/TemplateForm";
import { useCreateTemplate } from "../../hooks/useCreateTemplate";
import { useQueryClient } from "@tanstack/react-query";
import type { TemplateFormValues } from "../templates/TemplateForm";

const CONTAINER: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
  padding: "2rem",
};

const CARD: React.CSSProperties = {
  maxWidth: "560px",
  width: "100%",
  background: "#fff",
  borderRadius: "12px",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
  padding: "2.5rem",
};

const TITLE: React.CSSProperties = {
  margin: "0 0 0.375rem",
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#0f172a",
  textAlign: "center",
};

const SUBTITLE: React.CSSProperties = {
  margin: "0 0 1.75rem",
  fontSize: "0.9375rem",
  color: "#475569",
  lineHeight: 1.6,
  textAlign: "center",
};

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
    <div style={CONTAINER}>
      <div style={CARD}>
        <h2 style={TITLE}>Sablon Olustur</h2>
        <p style={SUBTITLE}>
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
