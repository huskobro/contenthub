/**
 * AuroraSourceCreatePage — Aurora Dusk Cockpit / Yeni Kaynak (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/source-create.html`.
 * Tasarim hedefi:
 *   - Page-shell breadcrumb ("Operasyon / Kaynaklar / Yeni") + page-head
 *   - Tek kart icinde form (max 640px), tipe gore kosullu URL alanlari
 *   - Form alanlari: name, source_type (rss/manual_url/api), base_url, feed_url,
 *     api_endpoint, language, category, trust_level, scan_mode, notes
 *   - Sag Inspector: form ozeti + ipuclari + zorunlu alan rehberi
 *   - Submit: useCreateSource mutation (success → /admin/sources/:id)
 *   - Cancel: /admin/sources
 *
 * Hicbir legacy code degistirilmez; trampoline (SourceCreatePage)
 * `useSurfacePageOverride("admin.sources.create")` ile bu sayfaya devreder.
 * register.tsx — bu PR'da DOKUNULMAZ.
 */
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateSource } from "../../hooks/useCreateSource";
import { createSourceScan, executeSourceScan } from "../../api/sourceScansApi";
import type { SourceCreatePayload } from "../../api/sourcesApi";
import { useToast } from "../../hooks/useToast";
import {
  SOURCE_TYPES,
  SOURCE_STATUSES,
  TRUST_LEVELS,
  SCAN_MODES,
  SOURCE_CATEGORIES,
  SOURCE_CATEGORY_LABELS,
} from "../../constants/statusOptions";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
  AuroraPageShell,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Field primitives — Aurora design tokens, mockup parity (form-input/form-label)
// ---------------------------------------------------------------------------

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
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
  height: "auto",
  padding: "8px 12px",
  resize: "vertical",
  minHeight: 80,
  lineHeight: 1.6,
};

const HINT_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  marginTop: 4,
  lineHeight: 1.5,
};

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="form-label" style={LABEL_STYLE}>
        {label}
        {required && (
          <span style={{ color: "var(--state-danger-fg)", marginLeft: 4 }}>*</span>
        )}
      </label>
      {children}
      {hint && <div style={HINT_STYLE}>{hint}</div>}
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

function typeLabel(t: string): string {
  const lower = t.toLowerCase();
  if (lower === "rss") return "RSS";
  if (lower === "api") return "API";
  if (lower === "manual_url") return "Manuel URL";
  return t;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraSourceCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { mutate, isPending, error } = useCreateSource();

  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<string>("rss");
  const [status, setStatus] = useState<string>("active");
  const [baseUrl, setBaseUrl] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [trustLevel, setTrustLevel] = useState<string>("");
  const [scanMode, setScanMode] = useState<string>("");
  const [language, setLanguage] = useState("");
  const [category, setCategory] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const submitError = error instanceof Error ? error.message : null;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError("Kaynak adı zorunludur.");
      return;
    }
    if (!sourceType.trim()) {
      setValidationError("Kaynak tipi zorunludur.");
      return;
    }
    if (sourceType === "rss" && !feedUrl.trim()) {
      setValidationError("RSS kaynak için feed URL zorunludur.");
      return;
    }
    if (sourceType === "manual_url" && !baseUrl.trim()) {
      setValidationError("Manuel URL kaynak için base URL zorunludur.");
      return;
    }
    if (sourceType === "api" && !apiEndpoint.trim()) {
      setValidationError("API kaynak için endpoint zorunludur.");
      return;
    }

    const payload: SourceCreatePayload = {
      name: name.trim(),
      source_type: sourceType,
      status,
    };
    if (baseUrl.trim()) payload.base_url = baseUrl.trim();
    if (feedUrl.trim()) payload.feed_url = feedUrl.trim();
    if (apiEndpoint.trim()) payload.api_endpoint = apiEndpoint.trim();
    if (trustLevel) payload.trust_level = trustLevel;
    if (scanMode) payload.scan_mode = scanMode;
    if (language.trim()) payload.language = language.trim();
    if (category.trim()) payload.category = category.trim();
    if (notes.trim()) payload.notes = notes.trim();

    mutate(payload, {
      onSuccess: async (created) => {
        toast.success("Kaynak başarıyla oluşturuldu");
        if (created.source_type === "rss") {
          try {
            const scan = await createSourceScan({
              source_id: created.id,
              scan_mode: "manual",
            });
            const result = await executeSourceScan(scan.id, false);
            toast.success(
              `İlk tarama tamamlandı: ${result.new_count} haber kaydedildi`,
            );
          } catch {
            toast.error("Kaynak oluşturuldu ancak ilk tarama başarısız oldu");
          }
        }
        navigate(`/admin/sources/${created.id}`);
      },
    });
  }

  function handleCancel() {
    navigate("/admin/sources");
  }

  // ----- Inspector summary -----
  const summary = useMemo(() => {
    const url =
      sourceType === "rss"
        ? feedUrl
        : sourceType === "manual_url"
          ? baseUrl
          : sourceType === "api"
            ? apiEndpoint
            : "";
    return {
      name: name.trim() || "—",
      type: typeLabel(sourceType),
      url: url.trim() || "—",
      status: status || "—",
      trust: trustLevel || "—",
      scan: scanMode || "—",
      lang: language.trim() || "—",
      category: category ? SOURCE_CATEGORY_LABELS[category] ?? category : "—",
    };
  }, [
    name,
    sourceType,
    feedUrl,
    baseUrl,
    apiEndpoint,
    status,
    trustLevel,
    scanMode,
    language,
    category,
  ]);

  const inspector = (
    <AuroraInspector title="Yeni kayıt">
      <AuroraInspectorSection title="Form özeti">
        <AuroraInspectorRow label="ad" value={summary.name} />
        <AuroraInspectorRow label="tip" value={summary.type} />
        <AuroraInspectorRow label="url" value={summary.url} />
        <AuroraInspectorRow label="durum" value={summary.status} />
        <AuroraInspectorRow label="güven" value={summary.trust} />
        <AuroraInspectorRow label="tarama" value={summary.scan} />
        <AuroraInspectorRow label="dil" value={summary.lang} />
        <AuroraInspectorRow label="kategori" value={summary.category} />
      </AuroraInspectorSection>
      <AuroraInspectorSection title="İpucu">
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Tüm zorunlu alanları doldurun. Kayıt tamamlandıktan sonra tüm alanlar
          düzenlenebilir. RSS kaynağı oluşturulduğunda ilk tarama otomatik
          tetiklenir.
        </div>
      </AuroraInspectorSection>
      <AuroraInspectorSection title="Zorunlu alanlar">
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.7 }}>
          • Kaynak adı
          <br />
          • Kaynak tipi
          <br />
          • Tipe göre URL (feed / base / endpoint)
        </div>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard" data-testid="aurora-source-create">
      <AuroraPageShell
        title="Kaynak ekle"
        description="Yeni haber kaynağı kaydı oluşturun"
        breadcrumbs={[
          { label: "Operasyon" },
          { label: "Kaynaklar", href: "/admin/sources" },
          { label: "Yeni" },
        ]}
      >
        <div className="card card-pad" style={{ maxWidth: 640 }}>
          <form onSubmit={handleSubmit} noValidate>
            <FormField label="Kaynak adı" required>
              <input
                className="form-input"
                style={INPUT_STYLE}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={focusOn}
                onBlur={focusOff}
                placeholder="Bloomberg"
                autoFocus
              />
            </FormField>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <FormField label="Tip" required>
                <select
                  className="form-input"
                  style={INPUT_STYLE}
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                >
                  {SOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {typeLabel(t)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Durum" required>
                <select
                  className="form-input"
                  style={INPUT_STYLE}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                >
                  {SOURCE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {sourceType === "rss" && (
              <FormField
                label="Feed URL"
                required
                hint="Tam RSS/Atom feed adresi"
              >
                <input
                  className="form-input"
                  style={INPUT_STYLE}
                  type="url"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                  placeholder="https://example.com/feed.xml"
                />
              </FormField>
            )}

            {sourceType === "manual_url" && (
              <FormField label="Base URL" required hint="Manuel kaynak ana adresi">
                <input
                  className="form-input"
                  style={INPUT_STYLE}
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                  placeholder="https://example.com"
                />
              </FormField>
            )}

            {sourceType === "api" && (
              <FormField
                label="API Endpoint"
                required
                hint="JSON döndüren endpoint adresi"
              >
                <input
                  className="form-input"
                  style={INPUT_STYLE}
                  type="url"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                  placeholder="https://api.example.com/news"
                />
              </FormField>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <FormField label="Güven seviyesi">
                <select
                  className="form-input"
                  style={INPUT_STYLE}
                  value={trustLevel}
                  onChange={(e) => setTrustLevel(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                >
                  {TRUST_LEVELS.map((t) => (
                    <option key={t || "_"} value={t}>
                      {t || "—"}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Tarama modu">
                <select
                  className="form-input"
                  style={INPUT_STYLE}
                  value={scanMode}
                  onChange={(e) => setScanMode(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                >
                  {SCAN_MODES.map((m) => (
                    <option key={m || "_"} value={m}>
                      {m || "—"}
                    </option>
                  ))}
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
              <FormField label="Dil" hint="ISO kod (tr, en …)">
                <input
                  className="form-input"
                  style={INPUT_STYLE}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                  placeholder="tr"
                />
              </FormField>
              <FormField label="Kategori">
                <select
                  className="form-input"
                  style={INPUT_STYLE}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                >
                  {SOURCE_CATEGORIES.map((c) => (
                    <option key={c || "_"} value={c}>
                      {SOURCE_CATEGORY_LABELS[c] ?? c}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Notlar" hint="İsteğe bağlı operatör notu">
              <textarea
                className="form-input"
                style={TEXTAREA_STYLE}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onFocus={focusOn}
                onBlur={focusOff}
                placeholder="İç notlar, kaynak hakkında açıklama …"
                rows={3}
              />
            </FormField>

            {validationError && (
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--state-danger-bg)",
                  border: "1px solid var(--state-danger-border)",
                  color: "var(--state-danger-fg)",
                  fontSize: 12,
                }}
                role="alert"
              >
                {validationError}
              </div>
            )}
            {submitError && !validationError && (
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
                }}
                role="alert"
              >
                {submitError}
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
                iconLeft={<Icon name="plus" size={11} />}
              >
                {isPending ? "Kaydediliyor…" : "Kaydet"}
              </AuroraButton>
            </div>
          </form>
        </div>
      </AuroraPageShell>
      <aside className="aurora-inspector-slot">{inspector}</aside>
    </div>
  );
}
