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
import { Link, useNavigate, useParams } from "react-router-dom";
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
} from "./primitives";
import type { AuroraStatusTone } from "./primitives";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useToast } from "../../hooks/useToast";

// ---------------------------------------------------------------------------
// Helpers — parsing free-form fields safely
// ---------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function jsonToText(value: Record<string, unknown> | null | undefined): string {
  if (!value || Object.keys(value).length === 0) return "{}";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function parseJsonText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return {};
  try {
    const parsed = JSON.parse(trimmed);
    if (!isObject(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function listToText(items: string[] | null | undefined): string {
  if (!items || items.length === 0) return "";
  return items.join(", ");
}

function parseListText(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AuroraBrandingCenterPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const baseRoute = isAdmin ? "/admin" : "/user";

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
        <label className="form-label">
          <span className="overline">Marka adı</span>
          <input
            className="form-input"
            type="text"
            value={draft.brand_name ?? ""}
            disabled={disabled}
            onChange={(e) =>
              setDraft((d) => ({ ...d, brand_name: e.target.value }))
            }
            data-testid="bc-identity-name"
          />
        </label>
        <label className="form-label">
          <span className="overline">Marka özeti</span>
          <textarea
            className="form-input"
            rows={3}
            value={draft.brand_summary ?? ""}
            disabled={disabled}
            onChange={(e) =>
              setDraft((d) => ({ ...d, brand_summary: e.target.value }))
            }
            data-testid="bc-identity-summary"
          />
        </label>
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
  const [profileText, setProfileText] = useState(() =>
    jsonToText(section.audience_profile ?? null),
  );
  const [positioning, setPositioning] = useState(
    section.positioning_statement ?? "",
  );
  const [parseErr, setParseErr] = useState<string | null>(null);

  useEffect(() => {
    setProfileText(jsonToText(section.audience_profile ?? null));
    setPositioning(section.positioning_statement ?? "");
    setParseErr(null);
  }, [section]);

  const dirty =
    profileText.trim() !== jsonToText(section.audience_profile ?? null).trim() ||
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
    const parsed = parseJsonText(profileText);
    if (parsed === null) {
      setParseErr("Hedef kitle profili geçerli bir JSON nesnesi olmalı.");
      return;
    }
    setParseErr(null);
    m.mutate({
      audience_profile: parsed,
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
        setProfileText(jsonToText(section.audience_profile ?? null));
        setPositioning(section.positioning_statement ?? "");
        setParseErr(null);
      }}
      testIdPrefix="bc-audience"
      hint="Yapılandırılmış kitle profili ve tek satırlık konumlandırma cümlesi."
    >
      <div style={{ display: "grid", gap: 12 }}>
        <label className="form-label">
          <span className="overline">Kitle profili (JSON)</span>
          <textarea
            className="form-input mono"
            rows={6}
            spellCheck={false}
            value={profileText}
            disabled={disabled}
            onChange={(e) => setProfileText(e.target.value)}
            data-testid="bc-audience-profile"
          />
          {parseErr && (
            <span
              className="caption"
              style={{ color: "var(--accent-tertiary)" }}
            >
              {parseErr}
            </span>
          )}
        </label>
        <label className="form-label">
          <span className="overline">Konumlandırma cümlesi</span>
          <textarea
            className="form-input"
            rows={2}
            value={positioning}
            disabled={disabled}
            onChange={(e) => setPositioning(e.target.value)}
            data-testid="bc-audience-positioning"
          />
        </label>
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <label className="form-label">
          <span className="overline">Palet</span>
          <input
            className="form-input"
            type="text"
            value={draft.palette ?? ""}
            disabled={disabled}
            onChange={(e) => setField("palette", e.target.value)}
            placeholder="örn. midnight-cobalt"
            data-testid="bc-visual-palette"
          />
        </label>
        <label className="form-label">
          <span className="overline">Tipografi</span>
          <input
            className="form-input"
            type="text"
            value={draft.typography ?? ""}
            disabled={disabled}
            onChange={(e) => setField("typography", e.target.value)}
            placeholder="örn. Inter / Display Sans"
          />
        </label>
        <label className="form-label">
          <span className="overline">Hareket dili</span>
          <input
            className="form-input"
            type="text"
            value={draft.motion_style ?? ""}
            disabled={disabled}
            onChange={(e) => setField("motion_style", e.target.value)}
            placeholder="örn. measured, low-motion"
          />
        </label>
        <label className="form-label">
          <span className="overline">Logo dosya yolu</span>
          <input
            className="form-input mono"
            type="text"
            value={draft.logo_path ?? ""}
            disabled={disabled}
            onChange={(e) => setField("logo_path", e.target.value)}
            placeholder="workspace/branding/logo.png"
          />
        </label>
        <label className="form-label">
          <span className="overline">Filigran dosya yolu</span>
          <input
            className="form-input mono"
            type="text"
            value={draft.watermark_path ?? ""}
            disabled={disabled}
            onChange={(e) => setField("watermark_path", e.target.value)}
          />
        </label>
        <label className="form-label">
          <span className="overline">Filigran konumu</span>
          <select
            className="form-input"
            value={draft.watermark_position ?? ""}
            disabled={disabled}
            onChange={(e) => setField("watermark_position", e.target.value)}
          >
            <option value="">—</option>
            <option value="top-left">Sol üst</option>
            <option value="top-right">Sağ üst</option>
            <option value="bottom-left">Sol alt</option>
            <option value="bottom-right">Sağ alt</option>
            <option value="center">Orta</option>
          </select>
        </label>
        <label className="form-label" style={{ gridColumn: "1 / -1" }}>
          <span className="overline">Lower-third varsayılanları</span>
          <textarea
            className="form-input"
            rows={2}
            value={draft.lower_third_defaults ?? ""}
            disabled={disabled}
            onChange={(e) => setField("lower_third_defaults", e.target.value)}
          />
        </label>
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

function MessagingCard({
  channelId,
  section,
  complete,
  disabled,
}: MessagingCardProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const [tone, setTone] = useState(section.tone_of_voice ?? "");
  const [pillarsText, setPillarsText] = useState(
    listToText(section.messaging_pillars),
  );

  useEffect(() => {
    setTone(section.tone_of_voice ?? "");
    setPillarsText(listToText(section.messaging_pillars));
  }, [section]);

  const dirty =
    tone !== (section.tone_of_voice ?? "") ||
    pillarsText !== listToText(section.messaging_pillars);

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

  return (
    <SectionShell
      title="Mesajlaşma"
      complete={complete}
      dirty={dirty}
      saving={m.isPending}
      disabled={disabled}
      onSave={() =>
        m.mutate({
          tone_of_voice: tone.trim() || null,
          messaging_pillars: parseListText(pillarsText),
        })
      }
      onReset={() => {
        setTone(section.tone_of_voice ?? "");
        setPillarsText(listToText(section.messaging_pillars));
      }}
      testIdPrefix="bc-messaging"
      hint="Tone-of-voice ve mesaj sütunları — Master Prompt'a snapshot olarak gider."
    >
      <div style={{ display: "grid", gap: 12 }}>
        <label className="form-label">
          <span className="overline">Tone of voice</span>
          <input
            className="form-input"
            type="text"
            value={tone}
            disabled={disabled}
            onChange={(e) => setTone(e.target.value)}
            placeholder="örn. authoritative, calm, evidence-driven"
            data-testid="bc-messaging-tone"
          />
        </label>
        <label className="form-label">
          <span className="overline">Mesaj sütunları (virgülle ayrılmış)</span>
          <textarea
            className="form-input"
            rows={2}
            value={pillarsText}
            disabled={disabled}
            onChange={(e) => setPillarsText(e.target.value)}
            placeholder="örn. data-first, low jargon, action-oriented"
            data-testid="bc-messaging-pillars"
          />
        </label>
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
  const [keywordsText, setKeywordsText] = useState(
    listToText(section.channel_keywords),
  );
  const [bannerPrompt, setBannerPrompt] = useState(section.banner_prompt ?? "");
  const [logoPrompt, setLogoPrompt] = useState(section.logo_prompt ?? "");

  useEffect(() => {
    setDescription(section.channel_description ?? "");
    setKeywordsText(listToText(section.channel_keywords));
    setBannerPrompt(section.banner_prompt ?? "");
    setLogoPrompt(section.logo_prompt ?? "");
  }, [section]);

  const dirty =
    description !== (section.channel_description ?? "") ||
    keywordsText !== listToText(section.channel_keywords) ||
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
          channel_keywords: parseListText(keywordsText),
          banner_prompt: bannerPrompt.trim() || null,
          logo_prompt: logoPrompt.trim() || null,
        })
      }
      onReset={() => {
        setDescription(section.channel_description ?? "");
        setKeywordsText(listToText(section.channel_keywords));
        setBannerPrompt(section.banner_prompt ?? "");
        setLogoPrompt(section.logo_prompt ?? "");
      }}
      testIdPrefix="bc-platform"
      hint="YouTube/Apply hedefine push edilecek metinler — Apply çağrısı bu alanları kullanır."
    >
      <div style={{ display: "grid", gap: 12 }}>
        <label className="form-label">
          <span className="overline">Kanal açıklaması</span>
          <textarea
            className="form-input"
            rows={4}
            value={description}
            disabled={disabled}
            onChange={(e) => setDescription(e.target.value)}
            data-testid="bc-platform-description"
          />
        </label>
        <label className="form-label">
          <span className="overline">Anahtar kelimeler (virgülle)</span>
          <textarea
            className="form-input"
            rows={2}
            value={keywordsText}
            disabled={disabled}
            onChange={(e) => setKeywordsText(e.target.value)}
            data-testid="bc-platform-keywords"
          />
        </label>
        <label className="form-label">
          <span className="overline">Banner üretim talimatı</span>
          <textarea
            className="form-input"
            rows={2}
            value={bannerPrompt}
            disabled={disabled}
            onChange={(e) => setBannerPrompt(e.target.value)}
          />
        </label>
        <label className="form-label">
          <span className="overline">Logo üretim talimatı</span>
          <textarea
            className="form-input"
            rows={2}
            value={logoPrompt}
            disabled={disabled}
            onChange={(e) => setLogoPrompt(e.target.value)}
          />
        </label>
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
