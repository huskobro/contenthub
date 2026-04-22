/**
 * AuroraNewsBulletinCreatePage — Aurora Dusk Cockpit / Yeni Haber Bülteni (admin).
 *
 * Surface override hedefi: `admin.news-bulletins.create`
 * Rota: `/admin/news-bulletins/new`
 *
 * Tasarım hedefi:
 *   - Page-shell breadcrumb ("News Bulletins → Yeni") + page-head
 *   - Tek kart içinde form (max 720px); legacy NewsBulletinForm ile birebir
 *     payload paritesi (topic, title, brief, target_duration_seconds, language,
 *     tone, bulletin_style, source_mode, selected_news_ids_json, status)
 *   - Sağ Inspector: form özeti + iş akışı zinciri açıklaması + ipuçları
 *     (template / style blueprint seçimi bülten oluşturulduktan sonra detayda
 *     yapılır — bu sayfada placeholder bilgi notu gösterilir)
 *   - Submit success → /admin/news-bulletins (selectedId state ile)
 *   - Cancel → /admin/news-bulletins
 *
 * Veri kaynağı: useCreateNewsBulletin (legacy ile aynı hook).
 *
 * Hiçbir legacy code değiştirilmez; trampoline (NewsBulletinCreatePage)
 * `useSurfacePageOverride("admin.news-bulletins.create")` ile bu sayfaya
 * devreder. register.tsx — bu PR'da DOKUNULMAZ.
 */
import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateNewsBulletin } from "../../hooks/useCreateNewsBulletin";
import { useToast } from "../../hooks/useToast";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
  AuroraPageShell,
  AuroraSegmented,
  AuroraStatusChip,
  AuroraTagsInput,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Form values — legacy NewsBulletinFormValues ile aynı şekil
// ---------------------------------------------------------------------------

interface FormValues {
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

const INITIAL: FormValues = {
  topic: "",
  title: "",
  brief: "",
  target_duration_seconds: "",
  language: "",
  tone: "",
  bulletin_style: "",
  source_mode: "",
  selected_news_ids_json: "",
  status: "draft",
};

const DASH = "—";

// ---------------------------------------------------------------------------
// Field primitives — Aurora design tokens (mockup parite)
// ---------------------------------------------------------------------------

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 5,
};

const inputStyle: CSSProperties = {
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

const textareaStyle: CSSProperties = {
  ...inputStyle,
  height: "auto",
  padding: "8px 12px",
  resize: "vertical",
  minHeight: 80,
  lineHeight: 1.6,
};

const hintStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  marginTop: 4,
  lineHeight: 1.5,
};

const errorBorderStyle: CSSProperties = {
  borderColor: "var(--state-danger-border)",
};

const errorTextStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--state-danger-fg)",
  marginTop: 4,
  fontFamily: "var(--font-mono)",
};

function focusOn(e: React.FocusEvent<HTMLElement>) {
  (e.target as HTMLElement).style.borderColor = "var(--accent-primary)";
}
function focusOff(e: React.FocusEvent<HTMLElement>) {
  (e.target as HTMLElement).style.borderColor = "var(--border-default)";
}

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
      <label style={labelStyle}>
        {label}
        {required && (
          <span style={{ color: "var(--state-danger-fg)", marginLeft: 4 }}>*</span>
        )}
      </label>
      {children}
      {error && <div style={errorTextStyle}>{error}</div>}
      {!error && hint && <div style={hintStyle}>{hint}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status tone — Aurora chip eşlemesi
// ---------------------------------------------------------------------------

function statusTone(s: string): "success" | "info" | "warning" | "neutral" {
  if (s === "ready") return "success";
  if (s === "draft") return "info";
  if (s === "archived") return "warning";
  return "neutral";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraNewsBulletinCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { mutate, isPending, error: submitError } = useCreateNewsBulletin();

  const [values, setValues] = useState<FormValues>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormValues, string>> = {};
    if (!values.topic.trim()) next.topic = "Topic zorunlu";
    const dur = values.target_duration_seconds.trim();
    if (
      dur !== "" &&
      (Number.isNaN(Number(dur)) || !Number.isFinite(Number(dur)) || Number(dur) < 0)
    ) {
      next.target_duration_seconds = "Hedef süre negatif olamaz";
    }
    // selected_news_ids_json — eğer doluysa parse edilebilirliğini kontrol et
    const idsRaw = values.selected_news_ids_json.trim();
    if (idsRaw !== "") {
      try {
        const parsed = JSON.parse(idsRaw);
        if (!Array.isArray(parsed)) {
          next.selected_news_ids_json = "JSON dizi formatı bekleniyor (örn. [\"id-1\"])";
        }
      } catch {
        next.selected_news_ids_json = "Geçerli JSON girin";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    const dur = values.target_duration_seconds.trim();
    mutate(
      {
        topic: values.topic.trim(),
        title: values.title.trim() || undefined,
        brief: values.brief.trim() || undefined,
        target_duration_seconds: dur !== "" ? Number(dur) : null,
        language: values.language || undefined,
        tone: values.tone || undefined,
        bulletin_style: values.bulletin_style || undefined,
        source_mode: values.source_mode || undefined,
        selected_news_ids_json: values.selected_news_ids_json.trim() || null,
        status: values.status,
      },
      {
        onSuccess: (created) => {
          toast.success("Haber bülteni başarıyla oluşturuldu");
          navigate("/admin/news-bulletins", { state: { selectedId: created.id } });
        },
      },
    );
  }

  function handleCancel() {
    navigate("/admin/news-bulletins");
  }

  // -------------------------------------------------------------------------
  // Inspector summary
  // -------------------------------------------------------------------------

  const summary = useMemo(() => {
    const dur = values.target_duration_seconds.trim();
    const idsRaw = values.selected_news_ids_json.trim();
    let selectedCount: number | null = null;
    if (idsRaw) {
      try {
        const parsed = JSON.parse(idsRaw);
        if (Array.isArray(parsed)) selectedCount = parsed.length;
      } catch {
        selectedCount = null;
      }
    }
    return {
      topic: values.topic.trim() || DASH,
      title: values.title.trim() || DASH,
      duration: dur !== "" ? `${dur} sn` : DASH,
      language: values.language || DASH,
      tone: values.tone || DASH,
      bulletin_style: values.bulletin_style || DASH,
      source_mode: values.source_mode || DASH,
      selectedCount,
      status: values.status,
    };
  }, [values]);

  const submitErrorMessage =
    submitError instanceof Error ? submitError.message : null;

  const inspector = (
    <AuroraInspector title="Yeni bülten">
      <AuroraInspectorSection title="Sayfa amacı">
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Konu ve temel bilgileri girerek yeni bir haber bülteni kaydı oluşturun.
          Kaydın ardından kaynak seçimi, script ve metadata adımları detay
          sayfasından yönetilir.
        </div>
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Form özeti">
        <AuroraInspectorRow label="topic" value={summary.topic} />
        <AuroraInspectorRow label="başlık" value={summary.title} />
        <AuroraInspectorRow label="süre" value={summary.duration} />
        <AuroraInspectorRow label="dil" value={summary.language} />
        <AuroraInspectorRow label="ton" value={summary.tone} />
        <AuroraInspectorRow label="stil" value={summary.bulletin_style} />
        <AuroraInspectorRow label="kaynak modu" value={summary.source_mode} />
        <AuroraInspectorRow
          label="seçili haber"
          value={summary.selectedCount === null ? DASH : String(summary.selectedCount)}
        />
        <AuroraInspectorRow
          label="durum"
          value={
            <AuroraStatusChip tone={statusTone(summary.status)}>
              {summary.status}
            </AuroraStatusChip>
          }
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Şablon & Stil">
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Bülten oluşturulduktan sonra detay sayfasından şablon (template) ve
          stil blueprint'i seçilebilir; önizleme orada güncellenir. Bu adımda
          görsel kararlar henüz alınmaz.
        </div>
      </AuroraInspectorSection>

      <AuroraInspectorSection title="İş akışı">
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.7 }}>
          Kaynak Tarama &rarr; Haber Seçimi &rarr; Bülten &rarr; Script &rarr;
          Metadata &rarr; Üretim
        </div>
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Zorunlu alan">
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.7 }}>
          • Topic
        </div>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard" data-testid="aurora-news-bulletin-create">
      <AuroraPageShell
        title="Yeni Haber Bülteni"
        description="Konu ve temel bilgileri girerek yeni bülten kaydı oluşturun"
        breadcrumbs={[
          { label: "Modüller" },
          { label: "News Bulletins", href: "/admin/news-bulletins" },
          { label: "Yeni" },
        ]}
        actions={
          <AuroraButton
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isPending}
          >
            İptal
          </AuroraButton>
        }
      >
        <div className="card card-pad" style={{ maxWidth: 720 }}>
          <form onSubmit={handleSubmit} noValidate>
            <Field
              label="Topic"
              required
              error={errors.topic}
              hint="Bültenin ana konusu — kısa, içerik özlü"
            >
              <input
                style={errors.topic ? { ...inputStyle, ...errorBorderStyle } : inputStyle}
                value={values.topic}
                onChange={(e) => set("topic", e.target.value)}
                onFocus={focusOn}
                onBlur={focusOff}
                placeholder="Haftanın teknoloji haberleri"
                data-testid="aurora-nb-topic"
                autoFocus
              />
            </Field>

            <Field label="Başlık" hint="Opsiyonel — yayın başlığı">
              <input
                style={inputStyle}
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                onFocus={focusOn}
                onBlur={focusOff}
                placeholder="Bülten başlığı (opsiyonel)"
              />
            </Field>

            <Field label="Brief" hint="Editör notu, içerik yön bilgisi">
              <textarea
                style={textareaStyle}
                value={values.brief}
                onChange={(e) => set("brief", e.target.value)}
                onFocus={focusOn}
                onBlur={focusOff}
                placeholder="Kısa içerik özeti, vurgulanacak başlıklar..."
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
                label="Hedef süre (sn)"
                error={errors.target_duration_seconds}
                hint="Toplam yayın süresi (saniye)"
              >
                <input
                  type="number"
                  min={0}
                  style={
                    errors.target_duration_seconds
                      ? { ...inputStyle, ...errorBorderStyle }
                      : inputStyle
                  }
                  value={values.target_duration_seconds}
                  onChange={(e) => set("target_duration_seconds", e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                  placeholder="180"
                />
              </Field>

              <Field label="Dil" hint="Seslendirme ve script dili">
                <AuroraSegmented
                  options={[
                    { value: "", label: DASH, hint: "Varsayılan kullanılsın" },
                    { value: "tr", label: "TR", hint: "Türkçe" },
                    { value: "en", label: "EN", hint: "English" },
                  ]}
                  value={values.language}
                  onChange={(v) => set("language", v)}
                  data-testid="aurora-nb-language"
                />
              </Field>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 14,
              }}
            >
              <Field label="Ton" hint="Sunum tonu">
                <AuroraSegmented
                  options={[
                    { value: "", label: DASH },
                    { value: "formal", label: "Formal", hint: "Resmi, kurumsal" },
                    { value: "casual", label: "Casual", hint: "Günlük, rahat" },
                    { value: "urgent", label: "Urgent", hint: "Son dakika, aciliyet" },
                  ]}
                  value={values.tone}
                  onChange={(v) => set("tone", v)}
                  data-testid="aurora-nb-tone"
                />
              </Field>

              <Field label="Bülten stili" hint="Ana stüdyo yönü">
                <AuroraSegmented
                  options={[
                    { value: "", label: DASH },
                    { value: "studio", label: "Studio" },
                    { value: "futuristic", label: "Futuristic" },
                    { value: "traditional", label: "Traditional" },
                  ]}
                  value={values.bulletin_style}
                  onChange={(v) => set("bulletin_style", v)}
                  data-testid="aurora-nb-style"
                />
              </Field>

              <Field
                label="Kaynak modu"
                hint="Haberler nasıl toplanacak"
              >
                <AuroraSegmented
                  options={[
                    { value: "", label: DASH },
                    { value: "manual", label: "Manuel", hint: "Operatör tek tek seçer" },
                    { value: "curated", label: "Curated", hint: "Sistem aday sunar, operatör onaylar" },
                    { value: "auto", label: "Auto", hint: "Otomatik seçim (dedupe uygulanır)" },
                  ]}
                  value={values.source_mode}
                  onChange={(v) => set("source_mode", v)}
                  data-testid="aurora-nb-source-mode"
                />
              </Field>
            </div>

            <Field
              label="Seçili haber ID'leri"
              error={errors.selected_news_ids_json}
              hint={
                values.source_mode === "manual"
                  ? "Bu bültende kullanılacak haber ID'lerini Enter veya virgülle ekleyin. Haber Seçim aracından kopyalanabilir."
                  : "Manuel seçim yalnızca kaynak modu Manuel veya Curated iken anlamlı. Auto modda kullanılmaz."
              }
            >
              <AuroraTagsInput
                value={(() => {
                  const raw = values.selected_news_ids_json.trim();
                  if (!raw) return [];
                  try {
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed)
                      ? parsed.map((x) => String(x))
                      : [];
                  } catch {
                    // Raw free-form fallback: comma-split
                    return raw
                      .split(/[,\n]/)
                      .map((s) => s.trim())
                      .filter(Boolean);
                  }
                })()}
                onChange={(tags) =>
                  set(
                    "selected_news_ids_json",
                    tags.length ? JSON.stringify(tags) : "",
                  )
                }
                dedupe
                placeholder="örn. news-42  (Enter / virgül)"
                data-testid="aurora-nb-selected-ids"
              />
            </Field>

            <Field label="Durum">
              <AuroraSegmented
                options={[
                  { value: "draft", label: "Taslak", hint: "Henüz yayına hazır değil" },
                  { value: "ready", label: "Hazır", hint: "Üretime alınabilir" },
                  { value: "archived", label: "Arşiv", hint: "Kullanılmıyor" },
                ]}
                value={values.status}
                onChange={(v) => set("status", v)}
                data-testid="aurora-nb-status"
              />
            </Field>

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
                Hata: {submitErrorMessage}
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
                iconLeft={<Icon name={isPending ? "refresh" : "plus"} size={11} />}
                data-testid="aurora-nb-submit"
              >
                {isPending ? "Kaydediliyor…" : "Oluştur"}
              </AuroraButton>
            </div>
          </form>
        </div>
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
