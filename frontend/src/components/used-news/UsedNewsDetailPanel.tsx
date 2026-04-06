import { useState } from "react";
import { useUsedNewsDetail } from "../../hooks/useUsedNewsDetail";
import { useUpdateUsedNews } from "../../hooks/useUpdateUsedNews";
import { UsedNewsForm } from "./UsedNewsForm";
import type { UsedNewsFormValues } from "./UsedNewsForm";
import { formatDateTime } from "../../lib/formatDate";

interface Props {
  selectedId: string | null;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mb-2">
      <span className="font-semibold mr-2 text-neutral-600 text-base">{label}:</span>
      <span className="break-words [overflow-wrap:anywhere]">{value ?? "—"}</span>
    </div>
  );
}

export function UsedNewsDetailPanel({ selectedId }: Props) {
  const { data, isLoading, isError } = useUsedNewsDetail(selectedId);
  const updateMutation = useUpdateUsedNews(selectedId ?? "");
  const [editing, setEditing] = useState(false);

  if (!selectedId) {
    return <p>Bir used news kaydı seçin.</p>;
  }

  if (isLoading) {
    return <p>Yükleniyor...</p>;
  }

  if (isError || !data) {
    return <p className="text-error">Hata: detay yüklenemedi.</p>;
  }

  if (editing) {
    function handleUpdate(values: UsedNewsFormValues) {
      const payload = {
        usage_type: (values.usage_type ?? "").trim() || undefined,
        target_module: (values.target_module ?? "").trim() || undefined,
        usage_context: (values.usage_context ?? "").trim() || null,
        target_entity_id: (values.target_entity_id ?? "").trim() || null,
        notes: (values.notes ?? "").trim() || null,
      };
      updateMutation.mutate(payload, {
        onSuccess: () => setEditing(false),
      });
    }

    return (
      <div>
        <h3>Used News Düzenle</h3>
        <UsedNewsForm
          mode="edit"
          initial={data}
          isSubmitting={updateMutation.isPending}
          submitError={updateMutation.error instanceof Error ? updateMutation.error.message : updateMutation.error ? String(updateMutation.error) : null}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          submitLabel="Kaydet"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="m-0">Used News Detayı</h3>
        <button
          onClick={() => setEditing(true)}
          className="py-1 px-3 text-base bg-neutral-100 text-neutral-700 border border-border-subtle rounded-sm cursor-pointer"
        >
          Düzenle
        </button>
      </div>
      <Field label="ID" value={data.id} />
      <Field label="News Item ID" value={<code className="text-[0.85em]">{data.news_item_id}</code>} />
      <Field label="Usage Type" value={data.usage_type} />
      <Field label="Usage Context" value={data.usage_context} />
      <Field label="Target Module" value={data.target_module} />
      <Field label="Target Entity ID" value={data.target_entity_id} />
      <Field label="Notes" value={data.notes} />
      <Field label="Created" value={formatDateTime(data.created_at)} />
      <Field label="Updated" value={formatDateTime(data.updated_at)} />
    </div>
  );
}
