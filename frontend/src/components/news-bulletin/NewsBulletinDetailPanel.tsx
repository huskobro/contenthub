import { useNewsBulletinDetail } from "../../hooks/useNewsBulletinDetail";

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

export function NewsBulletinDetailPanel({ selectedId }: Props) {
  const { data, isLoading, isError } = useNewsBulletinDetail(selectedId);

  if (!selectedId) {
    return <p>Bir news bulletin seçin.</p>;
  }

  if (isLoading) {
    return <p>Yükleniyor...</p>;
  }

  if (isError || !data) {
    return <p style={{ color: "red" }}>Hata: detay yüklenemedi.</p>;
  }

  return (
    <div>
      <h3>News Bulletin Detayı</h3>
      <Field label="ID" value={data.id} />
      <Field label="Title" value={data.title} />
      <Field label="Topic" value={data.topic} />
      <Field label="Brief" value={data.brief} />
      <Field label="Target Duration (s)" value={data.target_duration_seconds} />
      <Field label="Language" value={data.language} />
      <Field label="Tone" value={data.tone} />
      <Field label="Bulletin Style" value={data.bulletin_style} />
      <Field label="Source Mode" value={data.source_mode} />
      <Field
        label="Selected News IDs"
        value={
          data.selected_news_ids_json ? (
            <code style={{ fontSize: "0.85em", wordBreak: "break-all" }}>
              {data.selected_news_ids_json}
            </code>
          ) : null
        }
      />
      <Field label="Status" value={data.status} />
      <Field label="Job ID" value={data.job_id} />
      <Field label="Created" value={new Date(data.created_at).toLocaleString()} />
      <Field label="Updated" value={new Date(data.updated_at).toLocaleString()} />
    </div>
  );
}
