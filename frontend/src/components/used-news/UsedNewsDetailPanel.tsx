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
    <div style={{ marginBottom: "8px" }}>
      <span style={{ fontWeight: 600, marginRight: "8px" }}>{label}:</span>
      <span style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{value ?? "—"}</span>
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
    return <p style={{ color: "red" }}>Hata: detay yüklenemedi.</p>;
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Used News Detayı</h3>
        <button
          onClick={() => setEditing(true)}
          style={{
            padding: "0.25rem 0.75rem",
            fontSize: "0.8rem",
            background: "#f1f5f9",
            color: "#475569",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Düzenle
        </button>
      </div>
      <Field label="ID" value={data.id} />
      <Field label="News Item ID" value={<code style={{ fontSize: "0.85em" }}>{data.news_item_id}</code>} />
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
