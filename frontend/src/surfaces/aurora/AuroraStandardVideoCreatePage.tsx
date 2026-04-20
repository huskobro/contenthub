/**
 * AuroraStandardVideoCreatePage — Aurora Dusk Cockpit / Yeni Standart Video (admin).
 *
 * Tasarım hedefi:
 *   - Page-shell breadcrumb ("Standard Videos / Yeni") + page-head
 *   - Tek kart içinde form (max 720px), tüm legacy alanları korunur:
 *     topic (zorunlu), title, brief, target_duration_seconds, tone, language,
 *     visual_direction, subtitle_style, status
 *   - Sağ Inspector: "Plan özeti" başlığı altında topic + tone + visual_direction
 *     + duration özeti (canlı), durum chip'i ve operatör ipuçları
 *   - Submit success: /admin/standard-videos redirect
 *   - Live data kaynağı: useCreateStandardVideo (legacy hook ile aynı imza)
 *
 * Hiçbir legacy code değiştirilmez; trampoline (StandardVideoCreatePage)
 * `useSurfacePageOverride("admin.standard-video.create")` ile bu sayfaya devreder.
 * register.tsx — bu PR'da DOKUNULMAZ.
 */
import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateStandardVideo } from "../../hooks/useCreateStandardVideo";
import { useToast } from "../../hooks/useToast";
import type { StandardVideoCreatePayload } from "../../api/standardVideoApi";
import {
  AuroraButton,
  AuroraCard,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
  AuroraPageShell,
  AuroraStatusChip,
  type AuroraStatusTone,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Constants — legacy ile birebir aynı status taxonomy
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  "draft",
  "script_ready",
  "metadata_ready",
  "ready",
  "failed",
] as const;

type StatusOption = (typeof STATUS_OPTIONS)[number];

function statusTone(status: string): AuroraStatusTone {
  if (status === "ready") return "success";
  if (status === "failed") return "danger";
  if (status === "script_ready" || status === "metadata_ready") return "info";
  return "neutral";
}

// ---------------------------------------------------------------------------
// Field primitives — Aurora design tokens (form-input/form-label parity)
// ---------------------------------------------------------------------------

const LABEL_STYLE: CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 5,
};

const INPUT_STYLE: CSSProperties = {
  width: "100%",
  height: 34,
  padding: "0 12px",
  background: "var(--bg-surface)",
  border: "1px solid var(--border-default)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color .14s",
  boxSizing: "border-box",
};

const TEXTAREA_STYLE: CSSProperties = {
  ...INPUT_STYLE,
  height: "auto",
  padding: "8px 12px",
  resize: "vertical",
  minHeight: 80,
  lineHeight: 1.6,
};

const HINT_STYLE: CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  marginTop: 4,
  lineHeight: 1.5,
};

const ERROR_TEXT_STYLE: CSSProperties = {
  fontSize: 11,
  color: "var(--state-danger-fg)",
  marginTop: 4,
  fontFamily: "var(--font-mono)",
};

const ERROR_BORDER_STYLE: CSSProperties = {
  borderColor: "var(--state-danger-border)",
};

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}

function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={LABEL_STYLE}>
        {label}
        {required && (
          <span style={{ color: "var(--state-danger-fg)", marginLeft: 4 }}>*</span>
        )}
      </label>
      {children}
      {hint && <div style={HINT_STYLE}>{hint}</div>}
      {error && <div style={ERROR_TEXT_STYLE}>{error}</div>}
    </div>
  );
}

function focusOn(e: React.FocusEvent<HTMLElement>) {
  (e.target as HTMLElement).style.borderColor = "var(--accent-primary)";
}
function focusOff(e: React.FocusEvent<HTMLElement>) {
  (e.target as HTMLElement).style.borderColor = "var(--border-default)";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(rawSeconds: string): string {
  const trimmed = rawSeconds.trim();
  if (!trimmed) return "—";
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 60) return `${Math.round(n)} sn`;
  const min = Math.floor(n / 60);
  const sec = Math.round(n % 60);
  return sec === 0 ? `${min} dk` : `${min} dk ${sec} sn`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraStandardVideoCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { mutate, isPending, error } = useCreateStandardVideo();

  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [duration, setDuration] = useState("");
  const [tone, setTone] = useState("");
  const [language, setLanguage] = useState("");
  const [visualDirection, setVisualDirection] = useState("");
  const [subtitleStyle, setSubtitleStyle] = useState("");
  const [status, setStatus] = useState<StatusOption>("draft");

  const [topicError, setTopicError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);

  const submitErrorMessage =
    error instanceof Error ? error.message : null;

  function validate(): boolean {
    let valid = true;
    if (!topic.trim()) {
      setTopicError("Konu zorunludur.");
      valid = false;
    } else {
      setTopicError(null);
    }
    if (duration.trim() !== "") {
      const n = Number(duration);
      if (Number.isNaN(n) || !Number.isFinite(n) || n < 0) {
        setDurationError("Hedef süre negatif olamaz.");
        valid = false;
      } else {
        setDurationError(null);
      }
    } else {
      setDurationError(null);
    }
    return valid;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    // Legacy çağrı imzası — StandardVideoCreatePage.tsx ile birebir aynı
    const payload: StandardVideoCreatePayload = {
      topic: topic.trim(),
      title: title.trim() || null,
      brief: brief.trim() || null,
      target_duration_seconds:
        duration.trim() !== "" ? Number(duration) : null,
      tone: tone.trim() || null,
      language: language.trim() || null,
      visual_direction: visualDirection.trim() || null,
      subtitle_style: subtitleStyle.trim() || null,
    };

    mutate(payload, {
      onSuccess: () => {
        toast.success("Standard video başarıyla oluşturuldu");
        // Spec gereği: success sonrası registry'ye dön
        navigate("/admin/standard-videos");
      },
    });
  }

  function handleCancel() {
    navigate("/admin/standard-videos");
  }

  // ----- Inspector summary (canlı) -----
  const summary = useMemo(
    () => ({
      topic: topic.trim() || "—",
      tone: tone.trim() || "—",
      visualDirection: visualDirection.trim() || "—",
      duration: formatDuration(duration),
    }),
    [topic, tone, visualDirection, duration],
  );

  const inspector = (
    <AuroraInspector title="Yeni standart video">
      <AuroraInspectorSection title="Plan özeti">
        <AuroraInspectorRow label="konu" value={summary.topic} />
        <AuroraInspectorRow label="ton" value={summary.tone} />
        <AuroraInspectorRow
          label="görsel yön"
          value={summary.visualDirection}
        />
        <AuroraInspectorRow label="hedef süre" value={summary.duration} />
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            durum
          </span>
          <AuroraStatusChip tone={statusTone(status)}>{status}</AuroraStatusChip>
        </div>
      </AuroraInspectorSection>

      <AuroraInspectorSection title="İpucu">
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          Konu zorunludur. Diğer alanlar üretim adımlarına yön verir; daha sonra
          düzenlenebilir. Kayıttan sonra script, metadata ve render adımları
          otomatik ilerler.
        </div>
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Zorunlu alanlar">
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            lineHeight: 1.7,
          }}
        >
          • Konu
        </div>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard" data-testid="aurora-sv-create">
      <AuroraPageShell
        title="Yeni Standard Video"
        description="Konu ve temel bilgileri girin. Script, metadata ve üretim adımları otomatik ilerler."
        breadcrumbs={[
          { label: "Standard Videos", href: "/admin/standard-videos" },
          { label: "Yeni" },
        ]}
      >
        <AuroraCard pad="default" style={{ maxWidth: 720 }}>
          <form onSubmit={handleSubmit} noValidate>
            <Field label="Konu" required error={topicError}>
              <input
                style={topicError ? { ...INPUT_STYLE, ...ERROR_BORDER_STYLE } : INPUT_STYLE}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onFocus={focusOn}
                onBlur={focusOff}
                placeholder="Videonun ana konusu"
                autoFocus
                data-testid="aurora-sv-create-topic"
              />
            </Field>

            <Field label="Başlık" hint="Kullanıcı dostu etiket (opsiyonel)">
              <input
                style={INPUT_STYLE}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={focusOn}
                onBlur={focusOff}
                placeholder="Opsiyonel başlık"
              />
            </Field>

            <Field label="Brief">
              <textarea
                style={TEXTAREA_STYLE}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                onFocus={focusOn}
                onBlur={focusOff}
                placeholder="Kısa açıklama veya yönlendirme"
                rows={3}
              />
            </Field>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <Field
                label="Hedef Süre (saniye)"
                error={durationError}
                hint="ör. 120"
              >
                <input
                  type="number"
                  min={0}
                  style={
                    durationError
                      ? { ...INPUT_STYLE, ...ERROR_BORDER_STYLE }
                      : INPUT_STYLE
                  }
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                  placeholder="120"
                />
              </Field>
              <Field label="Dil" hint="ör. tr, en">
                <input
                  style={INPUT_STYLE}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                  placeholder="tr"
                />
              </Field>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <Field label="Ton" hint="ör. formal, casual, dramatic">
                <input
                  style={INPUT_STYLE}
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                  placeholder="formal"
                />
              </Field>
              <Field label="Görsel Yön" hint="ör. clean, cinematic, minimal">
                <input
                  style={INPUT_STYLE}
                  value={visualDirection}
                  onChange={(e) => setVisualDirection(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                  placeholder="clean"
                />
              </Field>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <Field
                label="Altyazı stili"
                hint="Preset id (opsiyonel)"
              >
                <input
                  style={INPUT_STYLE}
                  value={subtitleStyle}
                  onChange={(e) => setSubtitleStyle(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                  placeholder="default_white_bottom"
                />
              </Field>
              <Field label="Durum">
                <select
                  style={{ ...INPUT_STYLE, appearance: "none" }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusOption)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {submitErrorMessage && (
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--state-danger-bg)",
                  border: "1px solid var(--state-danger-border)",
                  color: "var(--state-danger-fg)",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  wordBreak: "break-word",
                }}
                role="alert"
              >
                {submitErrorMessage}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <AuroraButton
                variant="ghost"
                size="sm"
                type="button"
                onClick={handleCancel}
                disabled={isPending}
              >
                İptal
              </AuroraButton>
              <AuroraButton
                variant="primary"
                size="sm"
                type="submit"
                disabled={isPending}
                iconLeft={
                  isPending ? (
                    <Icon name="refresh" size={11} />
                  ) : (
                    <Icon name="plus" size={11} />
                  )
                }
              >
                {isPending ? "Kaydediliyor…" : "Oluştur"}
              </AuroraButton>
            </div>
          </form>
        </AuroraCard>
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
