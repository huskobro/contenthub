/**
 * AuroraNewsItemCreatePage — Aurora Dusk Cockpit / Haber öğesi oluştur (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/news-item-create.html`.
 *
 * Tasarım hedefi:
 *   - Page-head: başlık + alt başlık + breadcrumb caption
 *   - Form: title (req), summary (textarea), body (büyük textarea), source_id
 *     (dropdown — useSourcesList), source_url (req), language, published_at,
 *     trust_level (kaynaktan türetilen okuma-amaçlı bilgi chip — payload'a
 *     gönderilmez; trust_level Source Registry'de yönetilir, NewsItem yalnızca
 *     source_id üzerinden aktarır)
 *   - Inspector: form özeti (kaynak adı, dil, durum), karakter sayaçları
 *     (başlık/özet/gövde), yazma ipuçları
 *   - Submit: useCreateNewsItem mutation, başarıdan sonra
 *     /admin/news-items'e selectedId ile geri dön
 *
 * Veri kaynakları:
 *   - useSourcesList()      — dropdown seçenekleri ve trust_level eşlemesi
 *   - useCreateNewsItem()   — POST /api/v1/news-items
 *
 * Notlar:
 *   - body alanı NewsItem create payload'unda doğrudan bir alan değildir;
 *     `raw_payload_json` içinde JSON string olarak saklanır (operatörün uzun
 *     içerik yapıştırabilmesi için). Backend bu alanı string olarak kabul
 *     eder; metadata snapshot'ı bozulmaz.
 *   - Hiçbir legacy code değiştirilmez; surface override sistemi tarafından
 *     `admin.news-items.create` slot'una kayıtlıdır (register.tsx).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSourcesList } from "../../hooks/useSourcesList";
import { useCreateNewsItem } from "../../hooks/useCreateNewsItem";
import { useToast } from "../../hooks/useToast";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
} from "./primitives";
import { Icon } from "./icons";

type TrustLevel = "low" | "medium" | "high" | "unknown";

const TRUST_TONE: Record<TrustLevel, { color: string; label: string }> = {
  high: { color: "var(--state-success-fg)", label: "high" },
  medium: { color: "var(--state-warning-fg)", label: "medium" },
  low: { color: "var(--state-danger-fg)", label: "low" },
  unknown: { color: "var(--text-muted)", label: "—" },
};

function normalizeTrust(raw: string | null | undefined): TrustLevel {
  const v = (raw ?? "").toLowerCase();
  if (v === "high" || v === "medium" || v === "low") return v;
  return "unknown";
}

interface FormState {
  title: string;
  summary: string;
  body: string;
  source_id: string;
  source_url: string;
  language: string;
  published_at: string;
}

const INITIAL: FormState = {
  title: "",
  summary: "",
  body: "",
  source_id: "",
  source_url: "",
  language: "tr",
  published_at: "",
};

const FIELD_LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 5,
};

const INPUT_STYLE: React.CSSProperties = {
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

const TEXTAREA_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  height: undefined,
  padding: "8px 12px",
  resize: "vertical",
  minHeight: 80,
  lineHeight: 1.6,
};

function FormField({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={FIELD_LABEL}>
        {label}
        {required && (
          <span style={{ color: "var(--state-danger-fg)", marginLeft: 4 }}>*</span>
        )}
      </label>
      {children}
      {error && (
        <div
          style={{
            fontSize: 11,
            color: "var(--state-danger-fg)",
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}
      {!error && hint && (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

export function AuroraNewsItemCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const { data: sources } = useSourcesList();
  const sourceList = sources ?? [];

  const { mutate, isPending, error: submitError } = useCreateNewsItem();

  const [values, setValues] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  const selectedSource = useMemo(
    () => sourceList.find((s) => s.id === values.source_id) ?? null,
    [sourceList, values.source_id],
  );

  const trust = normalizeTrust(selectedSource?.trust_level);
  const trustTone = TRUST_TONE[trust];

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!values.title.trim()) next.title = "Başlık zorunlu";
    if (!values.source_url.trim()) next.source_url = "Kaynak URL zorunlu";
    if (values.source_url.trim()) {
      try {
        // eslint-disable-next-line no-new
        new URL(values.source_url.trim());
      } catch {
        next.source_url = "Geçerli bir URL girin (https://...)";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const body = values.body.trim();
    mutate(
      {
        title: values.title.trim(),
        url: values.source_url.trim(),
        source_id: values.source_id.trim() || null,
        summary: values.summary.trim() || null,
        language: values.language.trim() || null,
        published_at: values.published_at
          ? new Date(values.published_at).toISOString()
          : null,
        // body alanı backend payload'unda doğrudan yer almadığı için
        // raw_payload_json içinde JSON string olarak gönderilir.
        raw_payload_json: body
          ? JSON.stringify({ body })
          : null,
      },
      {
        onSuccess: (created) => {
          toast.success("Haber öğesi oluşturuldu");
          navigate("/admin/news-items", { state: { selectedId: created.id } });
        },
      },
    );
  }

  const inspector = (
    <AuroraInspector title="Yeni kayıt">
      <AuroraInspectorSection title="Form özeti">
        <AuroraInspectorRow
          label="kaynak"
          value={selectedSource?.name ?? "—"}
        />
        <AuroraInspectorRow
          label="trust"
          value={
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: trustTone.color,
                  boxShadow: `0 0 6px ${trustTone.color}`,
                }}
              />
              {trustTone.label}
            </span>
          }
        />
        <AuroraInspectorRow label="dil" value={values.language || "—"} />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Karakter">
        <AuroraInspectorRow label="başlık" value={String(values.title.length)} />
        <AuroraInspectorRow label="özet" value={String(values.summary.length)} />
        <AuroraInspectorRow label="gövde" value={String(values.body.length)} />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="İpucu">
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          Tüm zorunlu alanları doldurun. Trust seviyesi seçilen kaynaktan otomatik
          gelir; haber öğesi oluşturulduktan sonra ayrıntılar düzenlenebilir.
        </div>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard">
      <div className="page" style={{ maxWidth: 720 }}>
        <div className="page-head">
          <div>
            <h1>Haber öğesi oluştur</h1>
            <div className="sub">Yeni kayıt oluştur</div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <AuroraButton
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/news-items")}
              disabled={isPending}
            >
              İptal
            </AuroraButton>
          </div>
        </div>

        <div className="card card-pad">
          <form onSubmit={handleSubmit} noValidate>
            <FormField label="Başlık" required error={errors.title ?? null}>
              <input
                style={INPUT_STYLE}
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Haber başlığı"
              />
            </FormField>

            <FormField
              label="Kaynak URL"
              required
              hint="Haberin orijinal URL'i"
              error={errors.source_url ?? null}
            >
              <input
                style={INPUT_STYLE}
                type="url"
                value={values.source_url}
                onChange={(e) => set("source_url", e.target.value)}
                placeholder="https://..."
              />
            </FormField>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <FormField label="Kaynak">
                <select
                  style={INPUT_STYLE}
                  value={values.source_id}
                  onChange={(e) => set("source_id", e.target.value)}
                >
                  <option value="">— seçilmedi —</option>
                  {sourceList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Dil">
                <select
                  style={INPUT_STYLE}
                  value={values.language}
                  onChange={(e) => set("language", e.target.value)}
                >
                  <option value="tr">Türkçe (tr)</option>
                  <option value="en">English (en)</option>
                  <option value="">— belirtilmedi —</option>
                </select>
              </FormField>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <FormField
                label="Yayın tarihi"
                hint="Opsiyonel — kaynaktaki yayın zamanı"
              >
                <input
                  style={INPUT_STYLE}
                  type="datetime-local"
                  value={values.published_at}
                  onChange={(e) => set("published_at", e.target.value)}
                />
              </FormField>

              <FormField
                label="Trust (kaynaktan)"
                hint="Trust seviyesi Source Registry'de yönetilir"
              >
                <div
                  style={{
                    ...INPUT_STYLE,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--text-secondary)",
                    background: "var(--bg-inset)",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: trustTone.color,
                      boxShadow: `0 0 6px ${trustTone.color}`,
                    }}
                  />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {trustTone.label}
                  </span>
                </div>
              </FormField>
            </div>

            <FormField label="İçerik özeti" hint="Kısa, 1-2 cümlelik özet">
              <textarea
                style={{ ...TEXTAREA_STYLE, minHeight: 70 }}
                value={values.summary}
                onChange={(e) => set("summary", e.target.value)}
                placeholder="Haberin kısa özeti..."
                rows={3}
              />
            </FormField>

            <FormField
              label="Gövde"
              hint="Tam metin (opsiyonel) — operatör not/ek bilgi alanı"
            >
              <textarea
                style={{ ...TEXTAREA_STYLE, minHeight: 180 }}
                value={values.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder="Haber gövdesi, alıntılar veya ek notlar..."
                rows={8}
              />
            </FormField>

            {submitError ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--state-danger-fg)",
                  marginBottom: 12,
                  fontFamily: "var(--font-mono)",
                  wordBreak: "break-word",
                }}
              >
                {submitError instanceof Error
                  ? submitError.message
                  : "Bilinmeyen hata"}
              </div>
            ) : null}

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
                onClick={() => navigate("/admin/news-items")}
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
              >
                {isPending ? "Kaydediliyor…" : "Kaydet"}
              </AuroraButton>
            </div>
          </form>
        </div>
      </div>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
