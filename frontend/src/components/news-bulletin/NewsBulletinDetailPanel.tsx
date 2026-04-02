import { useState, useEffect } from "react";
import { useNewsBulletinDetail } from "../../hooks/useNewsBulletinDetail";
import { useUpdateNewsBulletin } from "../../hooks/useUpdateNewsBulletin";
import { NewsBulletinForm } from "./NewsBulletinForm";
import type { NewsBulletinFormValues } from "./NewsBulletinForm";
import { NewsBulletinScriptPanel } from "./NewsBulletinScriptPanel";

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
  const updateMutation = useUpdateNewsBulletin(selectedId ?? "");
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    setEditMode(false);
  }, [selectedId]);

  if (!selectedId) {
    return <p>Bir news bulletin seçin.</p>;
  }

  if (isLoading) {
    return <p>Yükleniyor...</p>;
  }

  if (isError || !data) {
    return <p style={{ color: "red" }}>Hata: detay yüklenemedi.</p>;
  }

  if (editMode) {
    function handleSubmit(values: NewsBulletinFormValues) {
      const dur = values.target_duration_seconds.trim();
      updateMutation.mutate(
        {
          topic: values.topic.trim(),
          title: values.title.trim() || null,
          brief: values.brief.trim() || null,
          target_duration_seconds: dur !== "" ? Number(dur) : null,
          language: values.language || null,
          tone: values.tone || null,
          bulletin_style: values.bulletin_style || null,
          source_mode: values.source_mode || null,
          selected_news_ids_json: values.selected_news_ids_json.trim() || null,
          status: values.status,
        },
        { onSuccess: () => setEditMode(false) }
      );
    }

    return (
      <div>
        <h3>News Bulletin Düzenle</h3>
        {updateMutation.isError && (
          <p style={{ color: "red" }}>Hata: güncelleme başarısız.</p>
        )}
        <NewsBulletinForm
          initial={data}
          onSubmit={handleSubmit}
          onCancel={() => setEditMode(false)}
          isSubmitting={updateMutation.isPending}
          submitLabel="Güncelle"
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>News Bulletin Detayı</h3>
        <button onClick={() => setEditMode(true)}>Düzenle</button>
      </div>
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

      <NewsBulletinScriptPanel bulletinId={data.id} />
    </div>
  );
}
