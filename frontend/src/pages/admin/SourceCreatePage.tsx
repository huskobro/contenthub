import { useNavigate } from "react-router-dom";
import { useCreateSource } from "../../hooks/useCreateSource";
import { SourceForm } from "../../components/sources/SourceForm";
import type { SourceCreatePayload } from "../../api/sourcesApi";
import { createSourceScan, executeSourceScan } from "../../api/sourceScansApi";
import { useToast } from "../../hooks/useToast";

export function SourceCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { mutate, isPending, error } = useCreateSource();

  function handleSubmit(payload: SourceCreatePayload) {
    mutate(payload, {
      onSuccess: async (created) => {
        toast.success("Kaynak basariyla olusturuldu");
        if (created.source_type === "rss") {
          try {
            const scan = await createSourceScan({ source_id: created.id, scan_mode: "manual" });
            const result = await executeSourceScan(scan.id, false);
            toast.success(`Ilk tarama tamamlandi: ${result.items_saved} haber kaydedildi`);
          } catch {
            toast.error("Kaynak olusturuldu ancak ilk tarama basarisiz oldu");
          }
        }
        navigate("/admin/sources", { state: { selectedId: created.id } });
      },
    });
  }

  return (
    <div className="max-w-[600px]">
      <h2 className="m-0 mb-1">Yeni Source</h2>
      <p className="m-0 mb-3 text-xs text-neutral-400">
        Yeni bir haber kaynagi olusturun.
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
