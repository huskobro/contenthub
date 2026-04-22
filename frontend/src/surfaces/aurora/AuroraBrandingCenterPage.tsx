/**
 * Aurora Branding Center — single page, both /user and /admin routes.
 *
 * Routes:
 *   /user/channels/:channelId/branding-center
 *   /admin/channels/:channelId/branding-center
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ page-head (channel breadcrumb + global Apply button)                │
 *   ├────────────────────────────────────────────────────────────────────┤
 *   │ section: Identity        — brand_name, brand_summary                │
 *   │ section: Audience        — audience_profile (json), positioning     │
 *   │ section: Visual          — palette, typography, motion, watermark…  │
 *   │ section: Messaging       — tone_of_voice, messaging_pillars         │
 *   │ section: Platform Output — channel_description, keywords, prompts   │
 *   │ section: Review & Apply  — completeness + apply (dry_run toggle)    │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * Contracts honored:
 *   - Each section has its own Save button → matches backend's 5 PATCH
 *     surfaces. We never bundle saves; explicit per-section commit.
 *   - `audience_profile` and `messaging_pillars` / `channel_keywords` are
 *     edited as JSON / comma list and parsed on save with validation.
 *   - Apply button calls POST /apply with optional `dry_run`. Result is
 *     surfaced inline as a per-surface status list — no fake success.
 *   - Ownership is enforced server-side (404 if not owner and not admin).
 *     We surface the error in a prominent banner.
 *   - Transition to Automation Center is offered only after Apply succeeds
 *     non-dry-run (gives the user the canonical next step).
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchBrandingCenter,
  saveAudience,
  saveIdentity,
  saveMessaging,
  savePlatformOutput,
  saveVisual,
  applyBranding,
  type AudienceSection,
  type ApplyRequest,
  type ApplyResponse,
  type BrandingCenterResponse,
  type IdentitySection,
  type MessagingSection,
  type PlatformOutputSection,
  type VisualSection,
} from "../../api/brandingCenterApi";
import {
  AuroraButton,
  AuroraCard,
  AuroraStatusChip,
  AuroraField,
  AuroraTagsInput,
  AuroraChipSelect,
  AuroraSegmented,
  AuroraAssetPathInput,
  AuroraStructuredJsonEditor,
} from "./primitives";
import type { AuroraStatusTone } from "./primitives";
import { useToast } from "../../hooks/useToast";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ---------------------------------------------------------------------------
// Preset kataloglar — serbest string yerine guided chip/segmented seçim
// ---------------------------------------------------------------------------
// Bu kataloglar "seçilebilir ama manuel de kabul et" modunda çalışır. Presetten
// seçim kullanıcıya bilinen tahmini güvenli değer verir; mevcut kayıtta preset
// dışı bir string varsa chip listesi onu "Özel" olarak ek gösterir, böylece
// geçmişte yazılmış değerler kaybolmaz.

interface PalettePreset {
  id: string;
  label: string;
  swatches: [string, string, string];
}

const PALETTE_PRESETS: PalettePreset[] = [
  { id: "midnight-cobalt", label: "Midnight Cobalt", swatches: ["#0a1128", "#1a4dd8", "#5db4ff"] },
  { id: "solar-citrus", label: "Solar Citrus", swatches: ["#141214", "#f59e0b", "#fde68a"] },
  { id: "rainforest-mist", label: "Rainforest Mist", swatches: ["#0e1f18", "#2f9e6b", "#9ff0c5"] },
  { id: "sunset-coral", label: "Sunset Coral", swatches: ["#2a0f10", "#f97373", "#fed2a0"] },
  { id: "obsidian-teal", label: "Obsidian Teal", swatches: ["#070b10", "#1fb2a5", "#a8e6da"] },
  { id: "lavender-storm", label: "Lavender Storm", swatches: ["#161422", "#8b5cf6", "#d1c4ff"] },
];

const TYPOGRAPHY_PRESETS: string[] = [
  "Inter / Display Sans",
  "Satoshi / General Sans",
  "IBM Plex Sans",
  "Söhne / Suisse",
  "Söhne + Newsreader Serif",
  "Manrope Variable",
];

const MOTION_PRESETS: Array<{ id: string; label: string; hint: string }> = [
  { id: "still", label: "Durağan", hint: "Kamera hareketi yok, düz kesimler" },
  { id: "measured", label: "Ölçülü", hint: "Hafif pan/zoom, nadir geçiş" },
  { id: "dynamic", label: "Dinamik", hint: "Kesif geçiş, hafif shake" },
  { id: "kinetic", label: "Kinetik", hint: "Yoğun kart hareketi, parallax" },
];

const WATERMARK_POSITIONS: Array<{ value: string; label: string }> = [
  { value: "top-left", label: "Sol üst" },
  { value: "top-right", label: "Sağ üst" },
  { value: "bottom-left", label: "Sol alt" },
  { value: "bottom-right", label: "Sağ alt" },
  { value: "center", label: "Orta" },
];

const AUDIENCE_PRESET_KEYS = [
  "age_range",
  "locations",
  "interests",
  "pain_points",
  "language",
  "expertise_level",
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraBrandingCenterPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const toast = useToast();
  // Shell Branching Rule (CLAUDE.md): derive from URL, not role.
  const baseRoute = location.pathname.startsWith("/admin") ? "/admin" : "/user";

  const dataQ = useQuery({
    queryKey: ["branding-center", channelId],
    queryFn: () => fetchBrandingCenter(channelId!),
    enabled: !!channelId,
  });

  const data = dataQ.data;

  const [applyDryRun, setApplyDryRun] = useState(true);
  const [applyResult, setApplyResult] = useState<ApplyResponse | null>(null);

  // ------------------------------------------------------------------- mutations

  const applyM = useMutation({
    mutationFn: (payload: ApplyRequest) => applyBranding(channelId!, payload),
    onSuccess: (resp) => {
      setApplyResult(resp);
      // Refresh aggregate (apply_status / completeness updated server-side).
      qc.invalidateQueries({ queryKey: ["branding-center", channelId] });
      if (resp.ok) {
        toast.success(
          applyDryRun ? "Önizleme tamamlandı." : "Marka kanala uygulandı.",
        );
      } else {
        toast.warning("Uygulama kısmen başarısız.");
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Uygula çağrısı başarısız.";
      toast.error(msg);
    },
  });

  // ----------------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------------

  if (!channelId) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div style={{ padding: 32, color: "var(--text-muted)" }}>
            Kanal kimliği eksik.
          </div>
        </div>
      </div>
    );
  }

  if (dataQ.isLoading) {
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div style={{ padding: 32, color: "var(--text-muted)" }}>
            Branding Center yükleniyor…
          </div>
        </div>
      </div>
    );
  }

  if (dataQ.isError || !data) {
    const detail =
      dataQ.error instanceof Error
        ? dataQ.error.message
        : "Branding Center açılamadı (yetki veya bağlantı sorunu).";
    return (
      <div className="aurora-dashboard">
        <div className="page">
          <div
            style={{
              padding: 32,
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <span>{detail}</span>
            <AuroraButton onClick={() => dataQ.refetch()}>Tekrar dene</AuroraButton>
          </div>
        </div>
      </div>
    );
  }

  const completeCount = Object.values(data.completeness ?? {}).filter(Boolean)
    .length;
  const totalSections = Object.keys(data.completeness ?? {}).length || 5;

  return (
    <div className="aurora-dashboard">
      <div className="page" data-testid="aurora-branding-center">
        <header className="page-head">
          <div>
            <nav className="breadcrumbs caption" aria-label="Konum">
              <Link to={`${baseRoute}/channels`}>Kanallar</Link>
              <span className="sep"> / </span>
              <Link to={`${baseRoute}/channels/${data.channel.id}`}>
                {data.channel.title ?? data.channel.profile_name}
              </Link>
              <span className="sep"> / </span>
              <span>Branding Center</span>
            </nav>
            <h1>Branding Center</h1>
            <div className="sub">
              {data.channel.title ?? data.channel.profile_name} ·{" "}
              {data.channel.platform ?? "—"} · {completeCount}/{totalSections}{" "}
              bölüm tamamlandı
            </div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <label className="caption" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={applyDryRun}
                onChange={(e) => setApplyDryRun(e.target.checked)}
                data-testid="bc-apply-dryrun"
              />
              Önizleme (dry-run)
            </label>
            <AuroraButton
              variant="primary"
              onClick={() =>
                applyM.mutate({ dry_run: applyDryRun })
              }
              disabled={applyM.isPending}
              data-testid="bc-apply"
            >
              {applyM.isPending
                ? "Uygulanıyor…"
                : applyDryRun
                  ? "Önizlemeyi çalıştır"
                  : "Markayı uygula"}
            </AuroraButton>
          </div>
        </header>

        {applyResult && (
          <AuroraCard pad="tight" style={{ marginTop: 12 }}>
            <div className="hstack" style={{ gap: 8, flexWrap: "wrap" }}>
              <AuroraStatusChip tone={applyResult.ok ? "success" : "warning"}>
                {applyResult.ok ? "Tamam" : "Kısmen başarılı"}
              </AuroraStatusChip>
              <span className="caption">
                {new Date(applyResult.applied_at).toLocaleString("tr-TR")}
              </span>
              {applyResult.items.map((item, i) => (
                <span key={`${item.surface}-${i}`} className="caption">
                  {item.surface}: {item.status}
                  {item.detail ? ` (${item.detail})` : ""}
                </span>
              ))}
            </div>
          </AuroraCard>
        )}

        <div
          className="bc-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 16,
            marginTop: 16,
          }}
        >
          <IdentityCard
            channelId={channelId}
            section={data.identity}
            complete={!!data.completeness?.identity}
            disabled={false}
          />
          <AudienceCard
            channelId={channelId}
            section={data.audience}
            complete={!!data.completeness?.audience}
            disabled={false}
          />
          <VisualCard
            channelId={channelId}
            section={data.visual}
            complete={!!data.completeness?.visual}
            disabled={false}
          />
          <MessagingCard
            channelId={channelId}
            section={data.messaging}
            complete={!!data.completeness?.messaging}
            disabled={false}
          />
          <PlatformOutputCard
            channelId={channelId}
            section={data.platform_output}
            complete={!!data.completeness?.platform_output}
            disabled={false}
          />
          <ReviewApplyCard
            response={data}
            onGoToAutomation={() =>
              navigate(`${baseRoute}/projects?channelId=${data.channel.id}`)
            }
          />
        </div>

        <footer
          className="caption"
          style={{
            marginTop: 16,
            color: "var(--text-muted)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>
            Son güncelleme: {new Date(data.updated_at).toLocaleString("tr-TR")}
          </span>
          <span>
            Marka profili kimliği: <span className="mono">{data.brand_profile_id}</span>
          </span>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section card scaffold — header (title + completeness chip) + body + actions
// ---------------------------------------------------------------------------

interface SectionShellProps {
  title: string;
  complete: boolean;
  dirty: boolean;
  saving: boolean;
  disabled: boolean;
  onSave: () => void;
  onReset?: () => void;
  testIdPrefix: string;
  children: React.ReactNode;
  hint?: string;
}

function SectionShell({
  title,
  complete,
  dirty,
  saving,
  disabled,
  onSave,
  onReset,
  testIdPrefix,
  children,
  hint,
}: SectionShellProps) {
  const tone: AuroraStatusTone = complete ? "success" : "neutral";
  return (
    <AuroraCard pad="default" data-testid={`${testIdPrefix}-card`}>
      <div
        className="hstack"
        style={{ justifyContent: "space-between", alignItems: "baseline" }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div className="hstack" style={{ gap: 8 }}>
          <AuroraStatusChip tone={tone}>
            {complete ? "Hazır" : "Eksik"}
          </AuroraStatusChip>
          <span className="caption">{dirty ? "Kaydedilmedi" : "Senkron"}</span>
        </div>
      </div>
      {hint && (
        <p className="caption" style={{ margin: "4px 0 12px" }}>
          {hint}
        </p>
      )}
      <div style={{ marginTop: 12 }}>{children}</div>
      <div className="hstack" style={{ marginTop: 12, gap: 8 }}>
        <AuroraButton
          variant="primary"
          onClick={onSave}
          disabled={disabled || !dirty || saving}
          data-testid={`${testIdPrefix}-save`}
        >
          {saving ? "Kaydediliyor…" : "Bölümü kaydet"}
        </AuroraButton>
        {dirty && onReset && (
          <AuroraButton variant="ghost" onClick={onReset} disabled={saving}>
            Sıfırla
          </AuroraButton>
        )}
      </div>
    </AuroraCard>
  );
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

interface IdentityCardProps {
  channelId: string;
  section: IdentitySection;
  complete: boolean;
  disabled: boolean;
}

function IdentityCard({
  channelId,
  section,
  complete,
  disabled,
}: IdentityCardProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<IdentitySection>(section);

  useEffect(() => {
    setDraft(section);
  }, [section]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(section),
    [draft, section],
  );

  const m = useMutation({
    mutationFn: (payload: IdentitySection) => saveIdentity(channelId, payload),
    onSuccess: (resp) => {
      qc.setQueryData(["branding-center", channelId], resp);
      toast.success("Kimlik bölümü kaydedildi.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Kaydedilemedi.";
      toast.error(msg);
    },
  });

  return (
    <SectionShell
      title="Kimlik"
      complete={complete}
      dirty={dirty}
      saving={m.isPending}
      disabled={disabled}
      onSave={() =>
        m.mutate({
          brand_name: draft.brand_name?.trim() || null,
          brand_summary: draft.brand_summary?.trim() || null,
        })
      }
      onReset={() => setDraft(section)}
      testIdPrefix="bc-identity"
      hint="Markanın adı ve tek satırlık özeti — analitik raporlar ve yayın açıklamalarında geçer."
    >
      <div style={{ display: "grid", gap: 12 }}>
        <AuroraField
          label="Marka adı"
          help="Yayında ve raporlarda görünen marka adı."
        >
          <input
            className="input"
            type="text"
            value={draft.brand_name ?? ""}
            disabled={disabled}
            onChange={(e) =>
              setDraft((d) => ({ ...d, brand_name: e.target.value }))
            }
            data-testid="bc-identity-name"
          />
        </AuroraField>
        <AuroraField
          label="Marka özeti"
          help="Tek paragraf — neyi, kime, nasıl anlattığınızı özetleyin."
        >
          <textarea
            className="input"
            rows={3}
            value={draft.brand_summary ?? ""}
            disabled={disabled}
            onChange={(e) =>
              setDraft((d) => ({ ...d, brand_summary: e.target.value }))
            }
            data-testid="bc-identity-summary"
          />
        </AuroraField>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Audience
// ---------------------------------------------------------------------------

interface AudienceCardProps {
  channelId: string;
  section: AudienceSection;
  complete: boolean;
  disabled: boolean;
}

function AudienceCard({
  channelId,
  section,
  complete,
  disabled,
}: AudienceCardProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const [profile, setProfile] = useState<Record<string, unknown>>(
    () => (isObject(section.audience_profile) ? section.audience_profile : {}),
  );
  const [positioning, setPositioning] = useState(
    section.positioning_statement ?? "",
  );

  useEffect(() => {
    setProfile(isObject(section.audience_profile) ? section.audience_profile : {});
    setPositioning(section.positioning_statement ?? "");
  }, [section]);

  const dirty =
    JSON.stringify(profile) !==
      JSON.stringify(isObject(section.audience_profile) ? section.audience_profile : {}) ||
    positioning !== (section.positioning_statement ?? "");

  const m = useMutation({
    mutationFn: (payload: AudienceSection) => saveAudience(channelId, payload),
    onSuccess: (resp) => {
      qc.setQueryData(["branding-center", channelId], resp);
      toast.success("Hedef kitle kaydedildi.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Kaydedilemedi.";
      toast.error(msg);
    },
  });

  const handleSave = () => {
    m.mutate({
      audience_profile: profile,
      positioning_statement: positioning.trim() || null,
    });
  };

  return (
    <SectionShell
      title="Hedef Kitle"
      complete={complete}
      dirty={dirty}
      saving={m.isPending}
      disabled={disabled}
      onSave={handleSave}
      onReset={() => {
        setProfile(isObject(section.audience_profile) ? section.audience_profile : {});
        setPositioning(section.positioning_statement ?? "");
      }}
      testIdPrefix="bc-audience"
      hint="Yapılandırılmış kitle profili ve tek satırlık konumlandırma cümlesi."
    >
      <div style={{ display: "grid", gap: 12 }}>
        <AuroraField
          label="Kitle profili"
          help="Form modu ile alan ekleyin veya Raw JSON sekmesinden elle düzenleyin. Sık kullanılanlar için kısayol butonları hazır."
        >
          <AuroraStructuredJsonEditor
            value={profile}
            onChange={(next) =>
              setProfile(isObject(next) ? (next as Record<string, unknown>) : {})
            }
            presetKeys={AUDIENCE_PRESET_KEYS}
            kind="object"
            disabled={disabled}
            data-testid="bc-audience-profile"
          />
        </AuroraField>
        <AuroraField
          label="Konumlandırma cümlesi"
          help="Markayı tek cümlede konumlandırın. Master Prompt'a doğrudan iletilir."
        >
          <textarea
            className="input"
            rows={2}
            value={positioning}
            disabled={disabled}
            onChange={(e) => setPositioning(e.target.value)}
            data-testid="bc-audience-positioning"
          />
        </AuroraField>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Visual
// ---------------------------------------------------------------------------

interface VisualCardProps {
  channelId: string;
  section: VisualSection;
  complete: boolean;
  disabled: boolean;
}

function VisualCard({
  channelId,
  section,
  complete,
  disabled,
}: VisualCardProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<VisualSection>(section);

  useEffect(() => {
    setDraft(section);
  }, [section]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(section),
    [draft, section],
  );

  const m = useMutation({
    mutationFn: (payload: VisualSection) => saveVisual(channelId, payload),
    onSuccess: (resp) => {
      qc.setQueryData(["branding-center", channelId], resp);
      toast.success("Görsel kimlik kaydedildi.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Kaydedilemedi.";
      toast.error(msg);
    },
  });

  const setField = <K extends keyof VisualSection>(
    key: K,
    value: VisualSection[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  // Preset options sanitised — include current value as "custom" if missing.
  const paletteOptions = useMemo(() => {
    const base = PALETTE_PRESETS.map((p) => ({
      value: p.id,
      label: p.label,
      swatch: p.swatches[1],
    }));
    const current = (draft.palette ?? "").trim();
    if (current && !PALETTE_PRESETS.some((p) => p.id === current)) {
      base.push({ value: current, label: `${current} (özel)`, swatch: "#64748b" });
    }
    return base;
  }, [draft.palette]);

  const typographyOptions = useMemo(() => {
    const base = TYPOGRAPHY_PRESETS.map((t) => ({ value: t, label: t }));
    const current = (draft.typography ?? "").trim();
    if (current && !TYPOGRAPHY_PRESETS.includes(current)) {
      base.push({ value: current, label: `${current} (özel)` });
    }
    return base;
  }, [draft.typography]);

  const motionOptions = useMemo(
    () =>
      MOTION_PRESETS.map((m) => ({
        value: m.id,
        label: m.label,
        hint: m.hint,
      })),
    [],
  );

  const positionOptions = WATERMARK_POSITIONS;

  const activePaletteMeta = PALETTE_PRESETS.find((p) => p.id === draft.palette);

  return (
    <SectionShell
      title="Görsel Kimlik"
      complete={complete}
      dirty={dirty}
      saving={m.isPending}
      disabled={disabled}
      onSave={() =>
        m.mutate({
          palette: draft.palette?.trim() || null,
          typography: draft.typography?.trim() || null,
          motion_style: draft.motion_style?.trim() || null,
          logo_path: draft.logo_path?.trim() || null,
          watermark_path: draft.watermark_path?.trim() || null,
          watermark_position: draft.watermark_position?.trim() || null,
          lower_third_defaults: draft.lower_third_defaults?.trim() || null,
        })
      }
      onReset={() => setDraft(section)}
      testIdPrefix="bc-visual"
      hint="Palet, tipografi, hareket dili — Style Blueprint ve Remotion kompozisyonu için sabit referans."
    >
      <div style={{ display: "grid", gap: 16 }}>
        <AuroraField
          label="Palet"
          help="Öntanımlı paletlerden birini seçin; önizleme için üç anahtar renk gösterilir."
        >
          <AuroraChipSelect
            options={paletteOptions}
            value={draft.palette ?? null}
            onChange={(next) =>
              setField("palette", (Array.isArray(next) ? next[0] : next) ?? null)
            }
            data-testid="bc-visual-palette"
          />
          {activePaletteMeta && (
            <div className="preview-swatch-row" aria-hidden="true">
              {activePaletteMeta.swatches.map((sw) => (
                <span
                  key={sw}
                  className="preview-swatch"
                  style={{ background: sw }}
                  title={sw}
                />
              ))}
            </div>
          )}
        </AuroraField>

        <AuroraField
          label="Tipografi"
          help="Marka tipografisi — gövde ve başlık ikilisi olarak düşünülür."
        >
          <AuroraChipSelect
            options={typographyOptions}
            value={draft.typography ?? null}
            onChange={(next) =>
              setField("typography", (Array.isArray(next) ? next[0] : next) ?? null)
            }
          />
        </AuroraField>

        <AuroraField
          label="Hareket dili"
          help="Videoların genel hareket yoğunluğu — kesim/ geçiş kararlarını etkiler."
        >
          <AuroraSegmented
            options={motionOptions}
            value={draft.motion_style ?? "measured"}
            onChange={(next) => setField("motion_style", next)}
            showDot
          />
        </AuroraField>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          <AuroraField
            label="Logo dosya yolu"
            help="Yerel workspace yolu veya HTTPS URL."
          >
            <AuroraAssetPathInput
              value={draft.logo_path ?? ""}
              onChange={(v) => setField("logo_path", v)}
              placeholder="workspace/branding/logo.png"
              mode="any"
              disabled={disabled}
            />
          </AuroraField>

          <AuroraField
            label="Filigran dosya yolu"
            help="Opsiyonel — PNG veya SVG önerilir."
          >
            <AuroraAssetPathInput
              value={draft.watermark_path ?? ""}
              onChange={(v) => setField("watermark_path", v)}
              placeholder="workspace/branding/watermark.png"
              mode="any"
              disabled={disabled}
            />
          </AuroraField>

          <AuroraField label="Filigran konumu" help="Videonun hangi köşesine yerleşsin?">
            <AuroraSegmented
              options={positionOptions.map((p) => ({ value: p.value, label: p.label }))}
              value={draft.watermark_position ?? "bottom-right"}
              onChange={(next) => setField("watermark_position", next)}
            />
          </AuroraField>
        </div>

        <AuroraField
          label="Lower-third varsayılanları"
          help="Alt-üçlü şablonu için metin/stil varsayılanları — Master Prompt'a snapshot geçer."
        >
          <textarea
            className="input"
            rows={2}
            value={draft.lower_third_defaults ?? ""}
            disabled={disabled}
            onChange={(e) => setField("lower_third_defaults", e.target.value)}
          />
        </AuroraField>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

interface MessagingCardProps {
  channelId: string;
  section: MessagingSection;
  complete: boolean;
  disabled: boolean;
}

const TONE_PRESETS: string[] = [
  "authoritative",
  "calm",
  "evidence-driven",
  "friendly",
  "playful",
  "educational",
  "urgent",
  "inspirational",
];

function MessagingCard({
  channelId,
  section,
  complete,
  disabled,
}: MessagingCardProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const [tones, setTones] = useState<string[]>(() =>
    (section.tone_of_voice ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
  const [pillars, setPillars] = useState<string[]>(section.messaging_pillars ?? []);

  useEffect(() => {
    setTones(
      (section.tone_of_voice ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    );
    setPillars(section.messaging_pillars ?? []);
  }, [section]);

  const sectionTones = (section.tone_of_voice ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const dirty =
    tones.join("|") !== sectionTones.join("|") ||
    pillars.join("|") !== (section.messaging_pillars ?? []).join("|");

  const m = useMutation({
    mutationFn: (payload: MessagingSection) => saveMessaging(channelId, payload),
    onSuccess: (resp) => {
      qc.setQueryData(["branding-center", channelId], resp);
      toast.success("Mesajlaşma kaydedildi.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Kaydedilemedi.";
      toast.error(msg);
    },
  });

  const toneOptions = useMemo(() => {
    const presetSet = new Set(TONE_PRESETS);
    const extras = tones.filter((t) => !presetSet.has(t));
    return [
      ...TONE_PRESETS.map((t) => ({ value: t, label: t })),
      ...extras.map((t) => ({ value: t, label: `${t} (özel)` })),
    ];
  }, [tones]);

  return (
    <SectionShell
      title="Mesajlaşma"
      complete={complete}
      dirty={dirty}
      saving={m.isPending}
      disabled={disabled}
      onSave={() =>
        m.mutate({
          tone_of_voice: tones.join(", ") || null,
          messaging_pillars: pillars,
        })
      }
      onReset={() => {
        setTones(sectionTones);
        setPillars(section.messaging_pillars ?? []);
      }}
      testIdPrefix="bc-messaging"
      hint="Tone-of-voice ve mesaj sütunları — Master Prompt'a snapshot olarak gider."
    >
      <div style={{ display: "grid", gap: 12 }}>
        <AuroraField
          label="Tone of voice"
          help="Bir veya birden fazla ton seçin; ihtiyaç halinde aşağıdaki satırdan özel değer ekleyin."
        >
          <AuroraChipSelect
            options={toneOptions}
            value={tones}
            multi
            onChange={(next) => setTones(Array.isArray(next) ? next : [next])}
            data-testid="bc-messaging-tone"
          />
        </AuroraField>
        <AuroraField
          label="Özel ton (opsiyonel)"
          help="Listede yoksa yazın, Enter ile ekleyin."
        >
          <AuroraTagsInput
            value={tones.filter((t) => !TONE_PRESETS.includes(t))}
            onChange={(custom) => {
              const presetOnly = tones.filter((t) => TONE_PRESETS.includes(t));
              setTones([...presetOnly, ...custom]);
            }}
            placeholder="örn. data-first, evidence-driven"
            disabled={disabled}
          />
        </AuroraField>
        <AuroraField
          label="Mesaj sütunları"
          help="Enter veya virgül ile yeni sütun ekleyin. Master Prompt'a bu sırayla gider."
        >
          <AuroraTagsInput
            value={pillars}
            onChange={setPillars}
            placeholder="örn. data-first, low jargon, action-oriented"
            disabled={disabled}
            data-testid="bc-messaging-pillars"
          />
        </AuroraField>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Platform Output
// ---------------------------------------------------------------------------

interface PlatformOutputCardProps {
  channelId: string;
  section: PlatformOutputSection;
  complete: boolean;
  disabled: boolean;
}

function PlatformOutputCard({
  channelId,
  section,
  complete,
  disabled,
}: PlatformOutputCardProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const [description, setDescription] = useState(
    section.channel_description ?? "",
  );
  const [keywords, setKeywords] = useState<string[]>(section.channel_keywords ?? []);
  const [bannerPrompt, setBannerPrompt] = useState(section.banner_prompt ?? "");
  const [logoPrompt, setLogoPrompt] = useState(section.logo_prompt ?? "");

  useEffect(() => {
    setDescription(section.channel_description ?? "");
    setKeywords(section.channel_keywords ?? []);
    setBannerPrompt(section.banner_prompt ?? "");
    setLogoPrompt(section.logo_prompt ?? "");
  }, [section]);

  const dirty =
    description !== (section.channel_description ?? "") ||
    keywords.join("|") !== (section.channel_keywords ?? []).join("|") ||
    bannerPrompt !== (section.banner_prompt ?? "") ||
    logoPrompt !== (section.logo_prompt ?? "");

  const m = useMutation({
    mutationFn: (payload: PlatformOutputSection) =>
      savePlatformOutput(channelId, payload),
    onSuccess: (resp) => {
      qc.setQueryData(["branding-center", channelId], resp);
      toast.success("Platform çıktıları kaydedildi.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Kaydedilemedi.";
      toast.error(msg);
    },
  });

  const descMax = 1000;
  const descCount = description.length;

  return (
    <SectionShell
      title="Platform Çıktıları"
      complete={complete}
      dirty={dirty}
      saving={m.isPending}
      disabled={disabled}
      onSave={() =>
        m.mutate({
          channel_description: description.trim() || null,
          channel_keywords: keywords,
          banner_prompt: bannerPrompt.trim() || null,
          logo_prompt: logoPrompt.trim() || null,
        })
      }
      onReset={() => {
        setDescription(section.channel_description ?? "");
        setKeywords(section.channel_keywords ?? []);
        setBannerPrompt(section.banner_prompt ?? "");
        setLogoPrompt(section.logo_prompt ?? "");
      }}
      testIdPrefix="bc-platform"
      hint="YouTube/Apply hedefine push edilecek metinler — Apply çağrısı bu alanları kullanır."
    >
      <div style={{ display: "grid", gap: 12 }}>
        <AuroraField
          label="Kanal açıklaması"
          help={`YouTube kanal açıklaması — ${descCount}/${descMax} karakter`}
          error={descCount > descMax ? `Karakter sınırı ${descMax}` : null}
        >
          <textarea
            className="input"
            rows={4}
            value={description}
            disabled={disabled}
            onChange={(e) => setDescription(e.target.value)}
            data-testid="bc-platform-description"
          />
        </AuroraField>
        <AuroraField
          label="Anahtar kelimeler"
          help="Enter veya virgül ile ekleyin. YouTube tags alanına gider."
        >
          <AuroraTagsInput
            value={keywords}
            onChange={setKeywords}
            placeholder="örn. ai, finans, ürün incelemesi"
            maxTags={30}
            disabled={disabled}
            data-testid="bc-platform-keywords"
          />
        </AuroraField>
        <AuroraField
          label="Banner üretim talimatı"
          help="AI banner üretiminde üst seviye yönerge — sabit, deterministik."
        >
          <textarea
            className="input"
            rows={2}
            value={bannerPrompt}
            disabled={disabled}
            onChange={(e) => setBannerPrompt(e.target.value)}
          />
        </AuroraField>
        <AuroraField
          label="Logo üretim talimatı"
          help="AI logo üretiminde kısa yönerge."
        >
          <textarea
            className="input"
            rows={2}
            value={logoPrompt}
            disabled={disabled}
            onChange={(e) => setLogoPrompt(e.target.value)}
          />
        </AuroraField>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Review & Apply summary card
// ---------------------------------------------------------------------------

interface ReviewApplyCardProps {
  response: BrandingCenterResponse;
  onGoToAutomation: () => void;
}

function ReviewApplyCard({ response, onGoToAutomation }: ReviewApplyCardProps) {
  const items: Array<{ key: string; label: string }> = [
    { key: "identity", label: "Kimlik" },
    { key: "audience", label: "Hedef Kitle" },
    { key: "visual", label: "Görsel Kimlik" },
    { key: "messaging", label: "Mesajlaşma" },
    { key: "platform_output", label: "Platform Çıktıları" },
  ];
  const completeness = response.completeness ?? {};
  const allComplete = items.every((it) => completeness[it.key]);

  // apply_status backend tarafından serbest formdadır; en azından sayım yapalım.
  const applyStatusEntries = Object.entries(response.apply_status ?? {});

  return (
    <AuroraCard pad="default" data-testid="bc-review-card">
      <div
        className="hstack"
        style={{ justifyContent: "space-between", alignItems: "baseline" }}
      >
        <h3 style={{ margin: 0 }}>Gözden Geçir & Uygula</h3>
        <AuroraStatusChip tone={allComplete ? "success" : "warning"}>
          {allComplete ? "Tüm bölümler hazır" : "Eksik bölüm var"}
        </AuroraStatusChip>
      </div>
      <ul
        style={{
          listStyle: "none",
          margin: "12px 0 0",
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 8,
        }}
      >
        {items.map((it) => {
          const ok = !!completeness[it.key];
          return (
            <li
              key={it.key}
              className="hstack"
              style={{ justifyContent: "space-between", gap: 8 }}
            >
              <span>{it.label}</span>
              <AuroraStatusChip tone={ok ? "success" : "neutral"}>
                {ok ? "Hazır" : "Eksik"}
              </AuroraStatusChip>
            </li>
          );
        })}
      </ul>
      {applyStatusEntries.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <span className="overline">Son uygula sonuçları</span>
          <ul
            style={{
              listStyle: "none",
              margin: "6px 0 0",
              padding: 0,
              display: "grid",
              gap: 4,
            }}
          >
            {applyStatusEntries.map(([surface, value]) => (
              <li key={surface} className="caption">
                <strong>{surface}</strong>: {String((value as { status?: string })?.status ?? "—")}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="hstack" style={{ marginTop: 12, gap: 8 }}>
        <AuroraButton
          variant="secondary"
          onClick={onGoToAutomation}
          disabled={!allComplete}
          data-testid="bc-go-automation"
        >
          Bu kanalın projelerine geç
        </AuroraButton>
        {!allComplete && (
          <span className="caption">
            Eksik bölümleri tamamlayın; kanal projeleri listesine buradan geçebilirsiniz.
          </span>
        )}
        {allComplete && (
          <span className="caption" style={{ color: "var(--text-muted)" }}>
            Automation Center bir projeye bağlıdır; proje seçildiğinde açılır.
          </span>
        )}
      </div>
    </AuroraCard>
  );
}
