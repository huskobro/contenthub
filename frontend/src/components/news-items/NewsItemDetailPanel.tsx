import { useState } from "react";
import { useNewsItemDetail } from "../../hooks/useNewsItemDetail";
import { useUpdateNewsItem } from "../../hooks/useUpdateNewsItem";
import { NewsItemForm } from "./NewsItemForm";
import type { NewsItemFormValues } from "./NewsItemForm";
import { formatDateTime } from "../../lib/formatDate";
import { isBlank } from "../../lib/isBlank";

interface Props {
  selectedId: string | null;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  const display = typeof value === "string" && isBlank(value) ? "—" : (value ?? "—");
  return (
    <div className="mb-2">
      <span className="font-semibold mr-2 text-neutral-600 text-base">{label}:</span>
      <span className="text-md break-words [overflow-wrap:anywhere]">{display}</span>
    </div>
  );
}

export function NewsItemDetailPanel({ selectedId }: Props) {
  const [editing, setEditing] = useState(false);
  const { data, isLoading, isError } = useNewsItemDetail(selectedId);
  const { mutate, isPending, error: updateError } = useUpdateNewsItem(selectedId ?? "");

  if (!selectedId) {
    return <p className="text-neutral-500">Bir news item seçin.</p>;
  }

  if (isLoading) {
    return <p>Yükleniyor...</p>;
  }

  if (isError || !data) {
    return <p className="text-error-dark">Hata: detay yüklenemedi.</p>;
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
        <h3 className="mt-0">News Item Düzenle</h3>
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
      <div className="flex justify-between items-center mb-3">
        <h3 className="m-0">News Item Detayı</h3>
        <button
          onClick={() => setEditing(true)}
          className="px-3 py-1 text-base bg-neutral-100 text-neutral-700 border border-border-subtle rounded-sm cursor-pointer hover:bg-neutral-200 transition-colors duration-fast"
        >
          Düzenle
        </button>
      </div>
      <Field label="ID" value={<code className="text-sm">{data.id}</code>} />
      <Field label="Başlık" value={data.title} />
      <Field label="URL" value={data.url ? <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-base break-all">{data.url}</a> : null} />
      <Field label="Status" value={data.status} />
      <Field label="Kaynak ID" value={data.source_id} />
      <Field label="Scan ID" value={data.source_scan_id} />
      <Field label="Dil" value={data.language} />
      <Field label="Kategori" value={data.category} />
      <Field label="Yayınlanma" value={formatDateTime(data.published_at)} />
      {!isBlank(data.summary) && <Field label="Özet" value={data.summary} />}
      <Field label="Dedupe Key" value={data.dedupe_key} />
      <Field label="Created" value={formatDateTime(data.created_at)} />
      <Field label="Updated" value={formatDateTime(data.updated_at)} />
    </div>
  );
}
