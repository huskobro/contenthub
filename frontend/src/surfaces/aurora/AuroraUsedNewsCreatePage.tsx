/**
 * AuroraUsedNewsCreatePage — Aurora Dusk Cockpit / Yeni Kullanılmış Haber (admin).
 *
 * Direct port of `docs/aurora-design-source/project/contenthub/pages/admin/used-news-create.html`.
 *
 * Tasarım hedefi:
 *   - Page-shell breadcrumb ("İçerik / Kullanılan haberler / Yeni") + page-head
 *   - Tek kart içinde form (max 640px):
 *       • news_item_id  — arama destekli dropdown (canlı useNewsItemsList)
 *       • used_in       — target_module (chip seçici: news_bulletin / standard_video)
 *                       + target_entity_id (job_id veya bulletin_id)
 *       • reason        — usage_type chip seçici: published / planned / archived
 *       • notes         — opsiyonel textarea
 *   - Sağ Inspector: seçili haberin önizlemesi (title, source, published_at) +
 *     form özeti + zorunlu alan rehberi
 *   - Submit: useCreateUsedNews mutation (success → /admin/used-news)
 *   - Cancel: /admin/used-news
 *
 * Hiçbir legacy code değiştirilmez; trampoline (UsedNewsCreatePage)
 * `useSurfacePageOverride("admin.used-news.create")` ile bu sayfaya devreder.
 * `register.tsx` bu PR'da DOKUNULMAZ — override map güncellemesi ayrı bir
 * iş kaleminde yapılır; o ana kadar trampoline `Override` null gelirse
 * legacy sayfaya düşer.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateUsedNews } from "../../hooks/useCreateUsedNews";
import { useNewsItemsList } from "../../hooks/useNewsItemsList";
import { useEffectiveSetting } from "../../hooks/useEffectiveSettings";
import { useEnabledModules } from "../../hooks/useEnabledModules";
import type { UsedNewsCreatePayload } from "../../api/usedNewsApi";
import type { NewsItemResponse } from "../../api/newsItemsApi";
import { useToast } from "../../hooks/useToast";
import {
  AuroraButton,
  AuroraInspector,
  AuroraInspectorRow,
  AuroraInspectorSection,
  AuroraPageShell,
} from "./primitives";
import { Icon } from "./icons";

// ---------------------------------------------------------------------------
// Field primitives — Aurora design tokens, mockup parity
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
// Chip selector primitive
// ---------------------------------------------------------------------------

interface ChipChoice {
  value: string;
  label: string;
}

function ChipSelector({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: ChipChoice[];
  onChange: (next: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className="chip"
            style={{
              cursor: "pointer",
              fontSize: 11,
              padding: "5px 10px",
              borderRadius: 999,
              border: active
                ? "1px solid var(--accent-primary)"
                : "1px solid var(--border-default)",
              background: active
                ? "var(--accent-primary-muted)"
                : "var(--bg-surface)",
              color: active
                ? "var(--accent-primary-hover)"
                : "var(--text-secondary)",
              transition: "background .14s, border-color .14s, color .14s",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// usage_type → Settings Registry'deki `used_news.usage_type_options` key'inden
// canlı gelir. Backend free-text kabul etse de UI, admin tarafından yönetilen
// taksonomi dışına çıkmayı desteklemez (bilinçli güvenlik).
const REASON_FALLBACK: ChipChoice[] = [
  { value: "published", label: "yayınlandı" },
  { value: "planned", label: "planlandı" },
  { value: "archived", label: "arşivlendi" },
];

// target_module — yalnızca `useEnabledModules` (GET /api/v1/modules) üzerinden
// türetilir; Settings Registry `module.{id}.enabled` değerleri burayı sürür.
// Kapatılan modül seçilemez, KNOWN_SETTINGS değişikliğine ihtiyaç duymaz.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.slice(0, 8).toUpperCase();
}

function pickLabel(
  options: ChipChoice[],
  value: string,
  fallback: string = "—",
): string {
  return options.find((o) => o.value === value)?.label ?? (value || fallback);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraUsedNewsCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { mutate, isPending, error } = useCreateUsedNews();
  const newsQuery = useNewsItemsList();

  // Settings Registry — taksonomi kaynağı
  const reasonSetting = useEffectiveSetting("used_news.usage_type_options");
  const modulesQuery = useEnabledModules();

  const reasonOptions: ChipChoice[] = useMemo(() => {
    const raw = reasonSetting.data?.effective_value;
    if (!Array.isArray(raw)) return REASON_FALLBACK;
    const list = raw
      .filter(
        (o): o is { value: string; label: string } =>
          !!o &&
          typeof (o as Record<string, unknown>).value === "string" &&
          typeof (o as Record<string, unknown>).label === "string",
      )
      .map((o) => ({ value: o.value, label: o.label }));
    return list.length > 0 ? list : REASON_FALLBACK;
  }, [reasonSetting.data]);

  const moduleOptions: ChipChoice[] = useMemo(() => {
    const mods = modulesQuery.data ?? [];
    // sadece açık modüller; kapalı modüller tüketim hedefi olamaz
    return mods
      .filter((m) => m.enabled)
      .map((m) => ({ value: m.module_id, label: m.display_name }));
  }, [modulesQuery.data]);

  const newsItems: NewsItemResponse[] = newsQuery.data ?? [];

  const [newsItemId, setNewsItemId] = useState<string>("");
  const [newsSearch, setNewsSearch] = useState<string>("");
  const [reason, setReason] = useState<string>("published");
  const [targetModule, setTargetModule] = useState<string>("news_bulletin");
  const [targetEntityId, setTargetEntityId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Taksonomi yüklenince seçili değer listede yoksa ilk geçerli değere çek.
  useEffect(() => {
    if (reasonOptions.length > 0 && !reasonOptions.some((o) => o.value === reason)) {
      setReason(reasonOptions[0].value);
    }
  }, [reasonOptions, reason]);

  useEffect(() => {
    if (moduleOptions.length > 0 && !moduleOptions.some((o) => o.value === targetModule)) {
      setTargetModule(moduleOptions[0].value);
    }
  }, [moduleOptions, targetModule]);

  const submitError = error instanceof Error ? error.message : null;

  // Filtered news items for the search-aware dropdown. Case-insensitive
  // contains match across title and id; capped to 50 to keep the listbox
  // responsive on large datasets.
  const filteredNewsItems = useMemo(() => {
    const q = newsSearch.trim().toLowerCase();
    const base = newsItems;
    if (!q) return base.slice(0, 50);
    return base
      .filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          (n.source_name ?? "").toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [newsSearch, newsItems]);

  const selectedNews = useMemo<NewsItemResponse | null>(() => {
    if (!newsItemId) return null;
    return newsItems.find((n) => n.id === newsItemId) ?? null;
  }, [newsItemId, newsItems]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidationError(null);

    if (!newsItemId.trim()) {
      setValidationError("Haber kaydı seçiniz.");
      return;
    }
    if (!reason.trim()) {
      setValidationError("Reason seçiniz.");
      return;
    }
    if (!targetModule.trim()) {
      setValidationError("Hedef modül seçiniz.");
      return;
    }
    if (!targetEntityId.trim()) {
      setValidationError(
        targetModule === "news_bulletin"
          ? "Bülten ID zorunludur."
          : "İş (job) ID zorunludur.",
      );
      return;
    }

    const payload: UsedNewsCreatePayload = {
      news_item_id: newsItemId.trim(),
      usage_type: reason.trim(),
      target_module: targetModule.trim(),
      target_entity_id: targetEntityId.trim(),
    };
    if (notes.trim()) payload.notes = notes.trim();

    mutate(payload, {
      onSuccess: (created) => {
        toast.success("Kullanılmış haber kaydı oluşturuldu");
        navigate("/admin/used-news", { state: { selectedId: created.id } });
      },
    });
  }

  function handleCancel() {
    navigate("/admin/used-news");
  }

  // ----- Inspector -----
  const inspector = (
    <AuroraInspector title="Yeni kayıt">
      <AuroraInspectorSection title="Seçili haber">
        {selectedNews ? (
          <>
            <AuroraInspectorRow label="başlık" value={selectedNews.title} />
            <AuroraInspectorRow
              label="kaynak"
              value={
                selectedNews.source_name ??
                (selectedNews.source_id ? shortId(selectedNews.source_id) : "—")
              }
            />
            <AuroraInspectorRow
              label="yayın tarihi"
              value={formatDate(selectedNews.published_at)}
            />
            <AuroraInspectorRow
              label="dil"
              value={selectedNews.language ?? "—"}
            />
            <AuroraInspectorRow
              label="kategori"
              value={selectedNews.category ?? "—"}
            />
            {selectedNews.summary && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
                title={selectedNews.summary}
              >
                {selectedNews.summary}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Henüz haber seçilmedi. Listeden bir kayıt seçin; özet burada
            görünecek.
          </div>
        )}
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Form özeti">
        <AuroraInspectorRow
          label="haber"
          value={selectedNews ? shortId(selectedNews.id) : "—"}
        />
        <AuroraInspectorRow
          label="reason"
          value={pickLabel(reasonOptions, reason)}
        />
        <AuroraInspectorRow
          label="modül"
          value={pickLabel(moduleOptions, targetModule)}
        />
        <AuroraInspectorRow
          label="hedef id"
          value={targetEntityId.trim() || "—"}
        />
      </AuroraInspectorSection>

      <AuroraInspectorSection title="Zorunlu alanlar">
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.7 }}>
          • Haber kaydı
          <br />
          • Reason
          <br />
          • Hedef modül + ID
        </div>
      </AuroraInspectorSection>
    </AuroraInspector>
  );

  return (
    <div className="aurora-dashboard" data-testid="aurora-used-news-create">
      <AuroraPageShell
        title="Kullanılan haber ekle"
        description="Dedupe kaydı oluştur — bir haberi belirli bir bültene veya videoya bağla"
        breadcrumbs={[
          { label: "İçerik" },
          { label: "Kullanılan haberler", href: "/admin/used-news" },
          { label: "Yeni" },
        ]}
      >
        <div className="card card-pad" style={{ maxWidth: 640 }}>
          <form onSubmit={handleSubmit} noValidate>
            <FormField
              label="Haber"
              required
              hint="Listeden seçim yapın; arama başlık, kaynak veya ID üzerinden çalışır"
            >
              <input
                className="form-input"
                style={{ ...INPUT_STYLE, marginBottom: 8 }}
                value={newsSearch}
                onChange={(e) => setNewsSearch(e.target.value)}
                onFocus={focusOn}
                onBlur={focusOff}
                placeholder="Haber ara…"
                autoFocus
              />
              {newsQuery.isLoading ? (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    padding: "8px 4px",
                  }}
                >
                  Haberler yükleniyor…
                </div>
              ) : newsQuery.isError ? (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--state-danger-fg)",
                    padding: "8px 4px",
                  }}
                >
                  Haber listesi yüklenemedi.
                </div>
              ) : (
                <select
                  className="form-input"
                  style={{ ...INPUT_STYLE, height: 38 }}
                  value={newsItemId}
                  onChange={(e) => setNewsItemId(e.target.value)}
                  onFocus={focusOn}
                  onBlur={focusOff}
                  size={1}
                >
                  <option value="">— Haber seçin —</option>
                  {filteredNewsItems.map((n) => {
                    const src = n.source_name ?? "";
                    const suffix = src ? ` · ${src}` : "";
                    return (
                      <option key={n.id} value={n.id}>
                        {shortId(n.id)} · {n.title}
                        {suffix}
                      </option>
                    );
                  })}
                </select>
              )}
            </FormField>

            <FormField
              label="Reason"
              required
              hint={
                reasonSetting.isLoading
                  ? "Taksonomi yükleniyor…"
                  : reasonSetting.isError
                    ? "Registry okunamadı; varsayılan taksonomi gösteriliyor."
                    : "Admin Settings → Kullanılmış Haberler altında yönetilir."
              }
            >
              <ChipSelector
                value={reason}
                options={reasonOptions}
                onChange={setReason}
                ariaLabel="Reason"
              />
            </FormField>

            <FormField
              label="Used in — modül"
              required
              hint={
                modulesQuery.isLoading
                  ? "Modül listesi yükleniyor…"
                  : moduleOptions.length === 0
                    ? "Hiç aktif modül yok. Admin → Moduller üzerinden etkinleştirin."
                    : "Yalnız etkin modüller seçilebilir."
              }
            >
              <ChipSelector
                value={targetModule}
                options={moduleOptions}
                onChange={setTargetModule}
                ariaLabel="Hedef modül"
              />
            </FormField>

            <FormField
              label={targetModule === "news_bulletin" ? "Bülten ID" : "İş (job) ID"}
              required
              hint={
                targetModule === "news_bulletin"
                  ? "Bu haberin kullanıldığı bülten kaydı"
                  : "Bu haberin kullanıldığı standart video iş kaydı"
              }
            >
              <input
                className="form-input"
                style={{ ...INPUT_STYLE, fontFamily: "var(--font-mono)" }}
                value={targetEntityId}
                onChange={(e) => setTargetEntityId(e.target.value)}
                onFocus={focusOn}
                onBlur={focusOff}
                placeholder={
                  targetModule === "news_bulletin"
                    ? "BLT-2026-…"
                    : "JOB-2026-…"
                }
              />
            </FormField>

            <FormField label="Notlar" hint="İsteğe bağlı operatör notu">
              <textarea
                className="form-input"
                style={TEXTAREA_STYLE}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onFocus={focusOn}
                onBlur={focusOff}
                placeholder="İç not, dedupe gerekçesi …"
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
