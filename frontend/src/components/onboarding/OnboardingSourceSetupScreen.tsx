import { SourceForm } from "../sources/SourceForm";
import { useCreateSource } from "../../hooks/useCreateSource";
import { useQueryClient } from "@tanstack/react-query";
import type { SourceCreatePayload } from "../../api/sourcesApi";

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

export function OnboardingSourceSetupScreen({ onBack, onComplete }: Props) {
  const createMutation = useCreateSource();
  const queryClient = useQueryClient();

  function handleSubmit(payload: SourceCreatePayload) {
    createMutation.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["setup-requirements"] });
        onComplete();
      },
    });
  }

  const submitError = createMutation.isError
    ? (createMutation.error as Error).message
    : null;

  return (
    <div style={CONTAINER}>
      <div style={CARD}>
        <h2 style={TITLE}>Haber Kaynagi Ekle</h2>
        <p style={SUBTITLE}>
          Sisteminize en az bir haber kaynagi ekleyin. RSS, manuel URL veya API
          kaynaklarini kullanabilirsiniz.
        </p>
        <SourceForm
          onSubmit={handleSubmit}
          onCancel={onBack}
          isPending={createMutation.isPending}
          submitError={submitError}
          submitLabel="Kaynagi Ekle"
        />
      </div>
    </div>
  );
}
