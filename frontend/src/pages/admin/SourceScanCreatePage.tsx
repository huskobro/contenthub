import { useNavigate } from "react-router-dom";
import { useCreateSourceScan } from "../../hooks/useCreateSourceScan";
import { SourceScanForm } from "../../components/source-scans/SourceScanForm";
import type { SourceScanFormValues } from "../../components/source-scans/SourceScanForm";

export function SourceScanCreatePage() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useCreateSourceScan();

  function handleSubmit(values: SourceScanFormValues) {
    const payload = {
      source_id: values.source_id.trim(),
      scan_mode: values.scan_mode.trim(),
      status: values.status || undefined,
      requested_by: values.requested_by.trim() || null,
      result_count: values.result_count.trim() !== "" ? Number(values.result_count) : null,
      error_summary: values.error_summary.trim() || null,
      notes: values.notes.trim() || null,
    };
    mutate(payload, {
      onSuccess: (created) => {
        navigate("/admin/source-scans", { state: { selectedId: created.id } });
      },
    });
  }

  return (
    <div style={{ maxWidth: "520px" }}>
      <h2 style={{ margin: "0 0 1.25rem" }}>Yeni Source Scan</h2>
      <SourceScanForm
        mode="create"
        isSubmitting={isPending}
        submitError={error instanceof Error ? error.message : error ? String(error) : null}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/source-scans")}
      />
    </div>
  );
}
