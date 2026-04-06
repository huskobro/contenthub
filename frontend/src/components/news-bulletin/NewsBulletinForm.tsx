import { useState } from "react";
import type { NewsBulletinResponse } from "../../api/newsBulletinApi";

const DASH = "—";

const FIELD_CLASS = "block w-full mt-1";

export interface NewsBulletinFormValues {
  topic: string;
  title: string;
  brief: string;
  target_duration_seconds: string;
  language: string;
  tone: string;
  bulletin_style: string;
  source_mode: string;
  selected_news_ids_json: string;
  status: string;
}

interface Props {
  initial?: Partial<NewsBulletinResponse>;
  onSubmit: (values: NewsBulletinFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
}

function toFormValues(initial?: Partial<NewsBulletinResponse>): NewsBulletinFormValues {
  return {
    topic: initial?.topic ?? "",
    title: initial?.title ?? "",
    brief: initial?.brief ?? "",
    target_duration_seconds:
      initial?.target_duration_seconds != null
        ? String(initial.target_duration_seconds)
        : "",
    language: initial?.language ?? "",
    tone: initial?.tone ?? "",
    bulletin_style: initial?.bulletin_style ?? "",
    source_mode: initial?.source_mode ?? "",
    selected_news_ids_json: initial?.selected_news_ids_json ?? "",
    status: initial?.status ?? "draft",
  };
}

export function NewsBulletinForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = "Kaydet",
}: Props) {
  const [values, setValues] = useState<NewsBulletinFormValues>(() =>
    toFormValues(initial)
  );
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof NewsBulletinFormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.topic.trim()) {
      setError("Topic zorunludur.");
      return;
    }
    const dur = values.target_duration_seconds.trim();
    if (dur !== "" && (isNaN(Number(dur)) || !isFinite(Number(dur)) || Number(dur) < 0)) {
      setError("Hedef süre negatif olamaz.");
      return;
    }
    setError(null);
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <p className="text-red-600 break-words [overflow-wrap:anywhere]">{error}</p>}

      <label>
        Topic <span className="text-red-600">*</span>
        <input
          value={values.topic}
          onChange={(e) => set("topic", e.target.value)}
          className={FIELD_CLASS}
        />
      </label>

      <label>
        Title
        <input
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          className={FIELD_CLASS}
        />
      </label>

      <label>
        Brief
        <textarea
          value={values.brief}
          onChange={(e) => set("brief", e.target.value)}
          rows={3}
          className={FIELD_CLASS}
        />
      </label>

      <label>
        Hedef Süre (saniye)
        <input
          type="number"
          min={0}
          value={values.target_duration_seconds}
          onChange={(e) => set("target_duration_seconds", e.target.value)}
          className={FIELD_CLASS}
        />
      </label>

      <label>
        Dil
        <select
          value={values.language}
          onChange={(e) => set("language", e.target.value)}
          className={FIELD_CLASS}
        >
          <option value="">{DASH}</option>
          <option value="tr">tr</option>
          <option value="en">en</option>
        </select>
      </label>

      <label>
        Ton
        <select
          value={values.tone}
          onChange={(e) => set("tone", e.target.value)}
          className={FIELD_CLASS}
        >
          <option value="">{DASH}</option>
          <option value="formal">formal</option>
          <option value="casual">casual</option>
          <option value="urgent">urgent</option>
        </select>
      </label>

      <label>
        Bülten Stili
        <select
          value={values.bulletin_style}
          onChange={(e) => set("bulletin_style", e.target.value)}
          className={FIELD_CLASS}
        >
          <option value="">{DASH}</option>
          <option value="studio">studio</option>
          <option value="futuristic">futuristic</option>
          <option value="traditional">traditional</option>
        </select>
      </label>

      <label>
        Kaynak Modu
        <select
          value={values.source_mode}
          onChange={(e) => set("source_mode", e.target.value)}
          className={FIELD_CLASS}
        >
          <option value="">{DASH}</option>
          <option value="manual">manual</option>
          <option value="curated">curated</option>
          <option value="auto">auto</option>
        </select>
      </label>

      <label>
        Seçili Haber ID'leri (JSON)
        <textarea
          value={values.selected_news_ids_json}
          onChange={(e) => set("selected_news_ids_json", e.target.value)}
          rows={3}
          placeholder='["id-1","id-2"]'
          className="block w-full mt-1 font-mono"
        />
      </label>

      <label>
        Durum
        <select
          value={values.status}
          onChange={(e) => set("status", e.target.value)}
          className={FIELD_CLASS}
        >
          <option value="draft">draft</option>
          <option value="ready">ready</option>
          <option value="archived">archived</option>
        </select>
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel}>
          İptal
        </button>
      </div>
    </form>
  );
}
