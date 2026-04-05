import { useNavigate } from "react-router-dom";
import { useCreateSource } from "../../hooks/useCreateSource";
import { SourceForm } from "../../components/sources/SourceForm";
import type { SourceCreatePayload } from "../../api/sourcesApi";
import { colors, typography } from "../../components/design-system/tokens";

export function SourceCreatePage() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useCreateSource();

  function handleSubmit(payload: SourceCreatePayload) {
    mutate(payload, {
      onSuccess: (created) => {
        navigate("/admin/sources", { state: { selectedId: created.id } });
      },
    });
  }

  return (
    <div style={{ maxWidth: "600px" }}>
      <h2 style={{ margin: "0 0 0.25rem" }}>Yeni Source</h2>
      <p style={{ margin: "0 0 1.25rem", color: colors.neutral[600], fontSize: typography.size.md }}>
        Yeni bir haber kaynağı oluşturun.
      </p>
      <SourceForm
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/sources")}
        isPending={isPending}
        submitError={error instanceof Error ? error.message : null}
        submitLabel="Oluştur"
      />
    </div>
  );
}
