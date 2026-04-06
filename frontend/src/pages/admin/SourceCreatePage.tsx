import { useNavigate } from "react-router-dom";
import { useCreateSource } from "../../hooks/useCreateSource";
import { SourceForm } from "../../components/sources/SourceForm";
import type { SourceCreatePayload } from "../../api/sourcesApi";

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
    <div className="max-w-[600px]">
      <h2 className="m-0 mb-1">Yeni Source</h2>
      <p className="m-0 mb-5 text-neutral-600 text-md">
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
