import { useNewsItemDetail } from "../../hooks/useNewsItemDetail";

interface Props {
  selectedId: string | null;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <span style={{ fontWeight: 600, marginRight: "8px", color: "#64748b", fontSize: "0.8125rem" }}>{label}:</span>
      <span style={{ fontSize: "0.875rem" }}>{value ?? "—"}</span>
    </div>
  );
}

export function NewsItemDetailPanel({ selectedId }: Props) {
  const { data, isLoading, isError } = useNewsItemDetail(selectedId);

  if (!selectedId) {
    return <p style={{ color: "#94a3b8" }}>Bir news item seçin.</p>;
  }

  if (isLoading) {
    return <p>Yükleniyor...</p>;
  }

  if (isError || !data) {
    return <p style={{ color: "red" }}>Hata: detay yüklenemedi.</p>;
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>News Item Detayı</h3>
      <Field label="ID" value={<code style={{ fontSize: "0.75rem" }}>{data.id}</code>} />
      <Field label="Başlık" value={data.title} />
      <Field label="URL" value={<a href={data.url} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>{data.url}</a>} />
      <Field label="Status" value={data.status} />
      <Field label="Kaynak ID" value={data.source_id} />
      <Field label="Scan ID" value={data.source_scan_id} />
      <Field label="Dil" value={data.language} />
      <Field label="Kategori" value={data.category} />
      <Field label="Yayınlanma" value={data.published_at ? new Date(data.published_at).toLocaleString() : null} />
      {data.summary && <Field label="Özet" value={data.summary} />}
      <Field label="Dedupe Key" value={data.dedupe_key} />
      <Field label="Created" value={new Date(data.created_at).toLocaleString()} />
      <Field label="Updated" value={new Date(data.updated_at).toLocaleString()} />
    </div>
  );
}
