import { useState } from "react";
import type { StandardVideoResponse } from "../../api/standardVideoApi";

export interface StandardVideoFormValues {
  topic: string;
  title: string;
  brief: string;
  target_duration_seconds: string;
  tone: string;
  language: string;
  visual_direction: string;
  subtitle_style: string;
  status: string;
}

interface Props {
  initial?: Partial<StandardVideoResponse>;
  onSubmit: (values: StandardVideoFormValues) => void;
  isSubmitting: boolean;
  submitError: string | null;
  onCancel?: () => void;
  submitLabel?: string;
}

const STATUS_OPTIONS = ["draft", "script_ready", "metadata_ready", "ready", "failed"];

const FIELD_STYLE: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.375rem 0.5rem",
  fontSize: "0.875rem",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "#475569",
  marginBottom: "0.25rem",
};

const ROW_STYLE: React.CSSProperties = {
  marginBottom: "0.875rem",
};

const BTN_PRIMARY: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  fontSize: "0.875rem",
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
};

const BTN_CANCEL: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  fontSize: "0.875rem",
  background: "transparent",
  color: "#64748b",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  cursor: "pointer",
};

function toStr(v: string | null | undefined): string {
  return v ?? "";
}

export function StandardVideoForm({
  initial,
  onSubmit,
  isSubmitting,
  submitError,
  onCancel,
  submitLabel = "Kaydet",
}: Props) {
  const [values, setValues] = useState<StandardVideoFormValues>({
    topic: toStr(initial?.topic),
    title: toStr(initial?.title),
    brief: toStr(initial?.brief),
    target_duration_seconds: initial?.target_duration_seconds != null
      ? String(initial.target_duration_seconds)
      : "",
    tone: toStr(initial?.tone),
    language: toStr(initial?.language),
    visual_direction: toStr(initial?.visual_direction),
    subtitle_style: toStr(initial?.subtitle_style),
    status: toStr(initial?.status) || "draft",
  });
  const [topicError, setTopicError] = useState("");
  const [durationError, setDurationError] = useState("");

  function set(field: keyof StandardVideoFormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let valid = true;
    if (!values.topic.trim()) {
      setTopicError("Konu zorunludur.");
      valid = false;
    } else {
      setTopicError("");
    }
    if (values.target_duration_seconds !== "") {
      const n = Number(values.target_duration_seconds);
      if (isNaN(n) || !isFinite(n) || n < 0) {
        setDurationError("Hedef süre negatif olamaz.");
        valid = false;
      } else {
        setDurationError("");
      }
    } else {
      setDurationError("");
    }
    if (!valid) return;
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "560px" }}>
      <div style={ROW_STYLE}>
        <label style={LABEL_STYLE}>
          Konu <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          style={FIELD_STYLE}
          value={values.topic}
          onChange={(e) => set("topic", e.target.value)}
          placeholder="Videonun ana konusu"
        />
        {topicError && (
          <p style={{ color: "#dc2626", fontSize: "0.8rem", margin: "0.25rem 0 0" }}>
            {topicError}
          </p>
        )}
      </div>

      <div style={ROW_STYLE}>
        <label style={LABEL_STYLE}>Başlık</label>
        <input
          style={FIELD_STYLE}
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Kullanıcı dostu etiket (opsiyonel)"
        />
      </div>

      <div style={ROW_STYLE}>
        <label style={LABEL_STYLE}>Brief</label>
        <textarea
          style={{ ...FIELD_STYLE, minHeight: "80px", resize: "vertical" }}
          value={values.brief}
          onChange={(e) => set("brief", e.target.value)}
          placeholder="Kısa açıklama veya yönlendirme"
        />
      </div>

      <div style={ROW_STYLE}>
        <label style={LABEL_STYLE}>Hedef Süre (saniye)</label>
        <input
          style={FIELD_STYLE}
          type="number"
          min={0}
          value={values.target_duration_seconds}
          onChange={(e) => set("target_duration_seconds", e.target.value)}
          placeholder="örn. 120"
        />
        {durationError && (
          <p style={{ color: "#dc2626", fontSize: "0.8rem", margin: "0.25rem 0 0" }}>
            {durationError}
          </p>
        )}
      </div>

      <div style={ROW_STYLE}>
        <label style={LABEL_STYLE}>Ton</label>
        <input
          style={FIELD_STYLE}
          value={values.tone}
          onChange={(e) => set("tone", e.target.value)}
          placeholder="örn. formal, casual, dramatic"
        />
      </div>

      <div style={ROW_STYLE}>
        <label style={LABEL_STYLE}>Dil</label>
        <input
          style={FIELD_STYLE}
          value={values.language}
          onChange={(e) => set("language", e.target.value)}
          placeholder="örn. tr, en"
        />
      </div>

      <div style={ROW_STYLE}>
        <label style={LABEL_STYLE}>Görsel Yön</label>
        <input
          style={FIELD_STYLE}
          value={values.visual_direction}
          onChange={(e) => set("visual_direction", e.target.value)}
          placeholder="örn. clean, cinematic, minimal"
        />
      </div>

      <div style={ROW_STYLE}>
        <label style={LABEL_STYLE}>Altyazı Stili</label>
        <input
          style={FIELD_STYLE}
          value={values.subtitle_style}
          onChange={(e) => set("subtitle_style", e.target.value)}
          placeholder="örn. standard, bold, news"
        />
      </div>

      <div style={ROW_STYLE}>
        <label style={LABEL_STYLE}>Durum</label>
        <select
          style={FIELD_STYLE}
          value={values.status}
          onChange={(e) => set("status", e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {submitError && (
        <p style={{ color: "#dc2626", fontSize: "0.875rem", marginBottom: "0.75rem", wordBreak: "break-word", overflowWrap: "anywhere" }}>
          {submitError}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ ...BTN_PRIMARY, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? "Kaydediliyor..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={BTN_CANCEL}
          >
            İptal
          </button>
        )}
      </div>
    </form>
  );
}
