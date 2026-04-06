import { useState, useEffect } from "react";
import { useNewsBulletinDetail } from "../../hooks/useNewsBulletinDetail";
import { useUpdateNewsBulletin } from "../../hooks/useUpdateNewsBulletin";
import { NewsBulletinForm } from "./NewsBulletinForm";
import type { NewsBulletinFormValues } from "./NewsBulletinForm";
import { NewsBulletinScriptPanel } from "./NewsBulletinScriptPanel";
import { NewsBulletinMetadataPanel } from "./NewsBulletinMetadataPanel";
import { NewsBulletinSelectedItemsPanel } from "./NewsBulletinSelectedItemsPanel";
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
    return <p className="text-error">Hata: detay yüklenemedi.</p>;
  }

  if (editMode) {
    function handleSubmit(values: NewsBulletinFormValues) {
      const dur = (values.target_duration_seconds ?? "").trim();
      updateMutation.mutate(
        {
          topic: (values.topic ?? "").trim(),
          title: (values.title ?? "").trim() || null,
          brief: (values.brief ?? "").trim() || null,
          target_duration_seconds: (() => { if (dur === "") return null; const n = Number(dur); return isNaN(n) || !isFinite(n) ? null : n; })(),
          language: values.language || null,
          tone: values.tone || null,
          bulletin_style: values.bulletin_style || null,
          source_mode: values.source_mode || null,
          selected_news_ids_json: (values.selected_news_ids_json ?? "").trim() || null,
          status: values.status,
        },
        { onSuccess: () => setEditMode(false) }
      );
    }

    return (
      <div>
        <h3>News Bulletin Düzenle</h3>
        {updateMutation.isError && (
          <p className="text-error">Hata: güncelleme başarısız.</p>
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
      <div className="flex justify-between items-center">
        <h3 data-testid="nb-detail-heading">Haber Bulteni Detayı</h3>
        <button onClick={() => setEditMode(true)}>Düzenle</button>
      </div>
      <p
        className="m-0 mb-4 text-base text-neutral-500 leading-normal"
        data-testid="nb-detail-workflow-chain"
      >
        Uretim zinciri: Kaynak Tarama → Haber Secimi → Bulten Kaydi → Script → Metadata → Uretim.
        Asagidaki panellerden secili haberleri, script ve metadata adimlarini yonetebilirsiniz.
      </p>
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
            <code className="text-[0.85em] break-all [overflow-wrap:anywhere]">
              {data.selected_news_ids_json}
            </code>
          ) : null
        }
      />
      <Field label="Status" value={data.status} />
      <Field label="Job ID" value={data.job_id} />
      <Field label="Created" value={formatDateTime(data.created_at)} />
      <Field label="Updated" value={formatDateTime(data.updated_at)} />

      <NewsBulletinSelectedItemsPanel bulletinId={data.id} />
      <NewsBulletinScriptPanel bulletinId={data.id} />
      <NewsBulletinMetadataPanel bulletinId={data.id} />
    </div>
  );
}
