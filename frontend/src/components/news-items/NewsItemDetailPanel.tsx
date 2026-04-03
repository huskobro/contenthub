import { useState } from "react";
import { useNewsItemDetail } from "../../hooks/useNewsItemDetail";
import { useUpdateNewsItem } from "../../hooks/useUpdateNewsItem";
import { NewsItemForm } from "./NewsItemForm";
import type { NewsItemFormValues } from "./NewsItemForm";
import { formatDateTime } from "../../lib/formatDate";

interface Props {
  selectedId: string | null;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <span style={{ fontWeight: 600, marginRight: "8px", color: "#64748b", fontSize: "0.8125rem" }}>{label}:</span>
      <span style={{ fontSize: "0.875rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>{value ?? "—"}</span>
    </div>
  );
}

export function NewsItemDetailPanel({ selectedId }: Props) {
  const [editing, setEditing] = useState(false);
  const { data, isLoading, isError } = useNewsItemDetail(selectedId);
  const { mutate, isPending, error: updateError } = useUpdateNewsItem(selectedId ?? "");

  if (!selectedId) {
    return <p style={{ color: "#94a3b8" }}>Bir news item seçin.</p>;
  }

  if (isLoading) {
    return <p>Yükleniyor...</p>;
  }

  if (isError || !data) {
    return <p style={{ color: "red" }}>Hata: detay yüklenemedi.</p>;
  }

  if (editing) {
    function handleSubmit(values: NewsItemFormValues) {
      mutate(
        {
          title: (values.title ?? "").trim(),
          url: (values.url ?? "").trim(),
          status: values.status,
          source_id: (values.source_id ?? "").trim() || null,
          summary: (values.summary ?? "").trim() || null,
          language: (values.language ?? "").trim() || null,
          category: (values.category ?? "").trim() || null,
          published_at: values.published_at ? new Date(values.published_at).toISOString() : null,
          dedupe_key: (values.dedupe_key ?? "").trim() || null,
        },
        { onSuccess: () => setEditing(false) }
      );
    }

    return (
      <div>
        <h3 style={{ marginTop: 0 }}>News Item Düzenle</h3>
        <NewsItemForm
          mode="edit"
          initial={data}
          isSubmitting={isPending}
          submitError={updateError instanceof Error ? updateError.message : null}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(false)}
          submitLabel="Kaydet"
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>News Item Detayı</h3>
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
      <Field label="ID" value={<code style={{ fontSize: "0.75rem" }}>{data.id}</code>} />
      <Field label="Başlık" value={data.title} />
      <Field label="URL" value={<a href={data.url} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>{data.url}</a>} />
      <Field label="Status" value={data.status} />
      <Field label="Kaynak ID" value={data.source_id} />
      <Field label="Scan ID" value={data.source_scan_id} />
      <Field label="Dil" value={data.language} />
      <Field label="Kategori" value={data.category} />
      <Field label="Yayınlanma" value={formatDateTime(data.published_at)} />
      {data.summary && <Field label="Özet" value={data.summary} />}
      <Field label="Dedupe Key" value={data.dedupe_key} />
      <Field label="Created" value={formatDateTime(data.created_at)} />
      <Field label="Updated" value={formatDateTime(data.updated_at)} />
    </div>
  );
}
