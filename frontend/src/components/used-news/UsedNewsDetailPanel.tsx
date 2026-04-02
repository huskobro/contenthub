import { useUsedNewsDetail } from "../../hooks/useUsedNewsDetail";

interface Props {
  selectedId: string | null;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <span style={{ fontWeight: 600, marginRight: "8px" }}>{label}:</span>
      <span>{value ?? "—"}</span>
    </div>
  );
}

export function UsedNewsDetailPanel({ selectedId }: Props) {
  const { data, isLoading, isError } = useUsedNewsDetail(selectedId);

  if (!selectedId) {
    return <p>Bir used news kaydı seçin.</p>;
  }

  if (isLoading) {
    return <p>Yükleniyor...</p>;
  }

  if (isError || !data) {
    return <p style={{ color: "red" }}>Hata: detay yüklenemedi.</p>;
  }

  return (
    <div>
      <h3>Used News Detayı</h3>
      <Field label="ID" value={data.id} />
      <Field label="News Item ID" value={<code style={{ fontSize: "0.85em" }}>{data.news_item_id}</code>} />
      <Field label="Usage Type" value={data.usage_type} />
      <Field label="Usage Context" value={data.usage_context} />
      <Field label="Target Module" value={data.target_module} />
      <Field label="Target Entity ID" value={data.target_entity_id} />
      <Field label="Notes" value={data.notes} />
      <Field label="Created" value={new Date(data.created_at).toLocaleString()} />
      <Field label="Updated" value={new Date(data.updated_at).toLocaleString()} />
    </div>
  );
}
