/**
 * Aurora Channel URL Onboarding — URL-only create flow.
 *
 * Routes:
 *   /user/channels/new
 *   /admin/channels/new
 *
 * Flow (3 steps, Aurora-scoped):
 *   1. URL               — user pastes platform URL
 *   2. Preview confirm   — fetched metadata shown; user reviews + optionally
 *                          edits profile_name + default_language
 *   3. Done              — created; CTA takes user to Branding Center
 *
 * Backend contract:
 *   POST /api/v1/channel-profiles/import-preview  → signed preview_token
 *   POST /api/v1/channel-profiles/import-confirm  → creates row
 *
 * Why not WizardShell? The shared WizardShell uses Tailwind tokens — this
 * page needs to live inside the Aurora `[data-surface="aurora"]` tree so
 * the shell, tokens, and spacing stay consistent. We ship a local,
 * deterministic 3-step flow here rather than fighting two DS systems.
 */
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  confirmChannelImport,
  previewChannelImport,
  type ChannelImportPreview,
  type ChannelProfileResponse,
} from "../../api/channelProfilesApi";
import { AuroraButton, AuroraCard, AuroraStatusChip } from "./primitives";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useToast } from "../../hooks/useToast";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Step = "url" | "confirm" | "done";

export function AuroraChannelOnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user } = useCurrentUser();
  // Shell Branching Rule (CLAUDE.md): derive from URL, not role.
  const baseRoute = location.pathname.startsWith("/admin") ? "/admin" : "/user";

  const [step, setStep] = useState<Step>("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [preview, setPreview] = useState<ChannelImportPreview | null>(null);
  const [profileName, setProfileName] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("tr");
  const [notes, setNotes] = useState("");
  const [created, setCreated] = useState<ChannelProfileResponse | null>(null);

  // ------------------------------------------------------------------- mutations

  const previewM = useMutation({
    mutationFn: (url: string) => previewChannelImport({ source_url: url }),
    onSuccess: (resp) => {
      setPreview(resp);
      // Pre-fill profile name from fetched metadata if user hasn't typed one.
      if (!profileName.trim()) {
        setProfileName(resp.title ?? resp.handle ?? "");
      }
      setStep("confirm");
      if (resp.is_partial) {
        toast.warning(
          "Metadata kısmen çekildi. Yine de devam edebilirsiniz; kanal ‘partial’ durumuyla oluşur.",
        );
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Önizleme alınamadı.";
      toast.error(msg);
    },
  });

  const confirmM = useMutation({
    mutationFn: () =>
      confirmChannelImport({
        preview_token: preview!.preview_token,
        source_url: preview!.source_url,
        default_language: defaultLanguage,
        notes: notes.trim() || undefined,
        profile_name: profileName.trim() || undefined,
      }),
    onSuccess: (resp) => {
      setCreated(resp);
      setStep("done");
      toast.success("Kanal oluşturuldu.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Kanal oluşturulamadı.";
      toast.error(msg);
    },
  });

  // ------------------------------------------------------------------- render

  return (
    <div className="aurora-dashboard">
      <div className="page" data-testid="aurora-channel-onboarding">
        <header className="page-head">
          <div>
            <nav className="breadcrumbs caption" aria-label="Konum">
              <Link to={`${baseRoute}/channels`}>Kanallar</Link>
              <span className="sep"> / </span>
              <span>Yeni kanal</span>
            </nav>
            <h1>Yeni kanal ekle</h1>
            <div className="sub">
              Platform URL'si yapıştır → metadata önizlemesi → onayla.
            </div>
          </div>
          <AuroraButton
            variant="ghost"
            onClick={() => navigate(`${baseRoute}/channels`)}
          >
            Vazgeç
          </AuroraButton>
        </header>

        <StepIndicator current={step} />

        <div style={{ marginTop: 16 }}>
          {step === "url" && (
            <UrlStep
              url={sourceUrl}
              onUrlChange={setSourceUrl}
              onSubmit={() => previewM.mutate(sourceUrl.trim())}
              submitting={previewM.isPending}
            />
          )}
          {step === "confirm" && preview && (
            <ConfirmStep
              preview={preview}
              profileName={profileName}
              onProfileNameChange={setProfileName}
              defaultLanguage={defaultLanguage}
              onDefaultLanguageChange={setDefaultLanguage}
              notes={notes}
              onNotesChange={setNotes}
              onBack={() => setStep("url")}
              onConfirm={() => confirmM.mutate()}
              submitting={confirmM.isPending}
            />
          )}
          {step === "done" && created && (
            <DoneStep
              created={created}
              onGoToBranding={() =>
                navigate(`${baseRoute}/channels/${created.id}/branding-center`)
              }
              onGoToChannels={() => navigate(`${baseRoute}/channels`)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: Step }) {
  const steps: Array<{ id: Step; label: string }> = [
    { id: "url", label: "URL" },
    { id: "confirm", label: "Önizleme" },
    { id: "done", label: "Tamam" },
  ];
  const currentIdx = steps.findIndex((s) => s.id === current);
  return (
    <ol
      className="hstack"
      style={{
        listStyle: "none",
        padding: 0,
        margin: "8px 0 0",
        gap: 8,
        flexWrap: "wrap",
      }}
      aria-label="Akış adımları"
    >
      {steps.map((s, i) => {
        const state: "done" | "active" | "pending" =
          i < currentIdx ? "done" : i === currentIdx ? "active" : "pending";
        const tone =
          state === "done" ? "success" : state === "active" ? "info" : "neutral";
        return (
          <li key={s.id} className="hstack" style={{ gap: 6 }}>
            <AuroraStatusChip tone={tone}>
              {i + 1}. {s.label}
            </AuroraStatusChip>
            {i < steps.length - 1 && (
              <span className="caption" aria-hidden="true">
                →
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — URL
// ---------------------------------------------------------------------------

interface UrlStepProps {
  url: string;
  onUrlChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

function UrlStep({ url, onUrlChange, onSubmit, submitting }: UrlStepProps) {
  const canSubmit = url.trim().length >= 4 && !submitting;
  return (
    <AuroraCard pad="default">
      <h3 style={{ marginTop: 0 }}>Kanal URL'si</h3>
      <p className="caption" style={{ marginTop: 4 }}>
        YouTube, TikTok veya web kanalınızın genel URL'sini yapıştırın. Giriş
        yapmanıza gerek yok — sadece kamuya açık meta bilgileri çekeriz.
      </p>
      <label className="form-label" style={{ marginTop: 12 }}>
        <span className="overline">Platform URL</span>
        <input
          className="form-input mono"
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://www.youtube.com/@example"
          disabled={submitting}
          data-testid="onb-url-input"
        />
      </label>
      <div className="hstack" style={{ marginTop: 12, gap: 8 }}>
        <AuroraButton
          variant="primary"
          onClick={onSubmit}
          disabled={!canSubmit}
          data-testid="onb-url-submit"
        >
          {submitting ? "Önizleme alınıyor…" : "Önizleme oluştur"}
        </AuroraButton>
      </div>
    </AuroraCard>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Confirm
// ---------------------------------------------------------------------------

interface ConfirmStepProps {
  preview: ChannelImportPreview;
  profileName: string;
  onProfileNameChange: (value: string) => void;
  defaultLanguage: string;
  onDefaultLanguageChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

function ConfirmStep({
  preview,
  profileName,
  onProfileNameChange,
  defaultLanguage,
  onDefaultLanguageChange,
  notes,
  onNotesChange,
  onBack,
  onConfirm,
  submitting,
}: ConfirmStepProps) {
  const canSubmit = profileName.trim().length > 0 && !submitting;

  return (
    <AuroraCard pad="default">
      <div
        className="hstack"
        style={{ justifyContent: "space-between", alignItems: "baseline" }}
      >
        <h3 style={{ margin: 0 }}>Önizleme</h3>
        <AuroraStatusChip tone={preview.is_partial ? "warning" : "success"}>
          {preview.is_partial ? "Kısmi metadata" : "Tam metadata"}
        </AuroraStatusChip>
      </div>
      {preview.fetch_error && (
        <p
          className="caption"
          style={{ color: "var(--accent-tertiary)", marginTop: 8 }}
        >
          {preview.fetch_error}
        </p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "8px 16px",
          marginTop: 12,
          fontSize: "var(--type-body-sm-size)",
        }}
      >
        <span className="caption">Platform</span>
        <span>{preview.platform ?? "—"}</span>
        <span className="caption">URL</span>
        <span className="mono" style={{ wordBreak: "break-all" }}>
          {preview.normalized_url}
        </span>
        <span className="caption">Handle</span>
        <span>{preview.handle ?? "—"}</span>
        <span className="caption">Harici ID</span>
        <span className="mono">{preview.external_channel_id ?? "—"}</span>
        <span className="caption">Başlık</span>
        <span>{preview.title ?? "—"}</span>
        {preview.description && (
          <>
            <span className="caption">Açıklama</span>
            <span>{preview.description}</span>
          </>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginTop: 16,
        }}
      >
        <label className="form-label">
          <span className="overline">Profil adı</span>
          <input
            className="form-input"
            type="text"
            value={profileName}
            onChange={(e) => onProfileNameChange(e.target.value)}
            disabled={submitting}
            data-testid="onb-profile-name"
          />
        </label>
        <label className="form-label">
          <span className="overline">Varsayılan dil</span>
          <select
            className="form-input"
            value={defaultLanguage}
            onChange={(e) => onDefaultLanguageChange(e.target.value)}
            disabled={submitting}
          >
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
          </select>
        </label>
        <label className="form-label" style={{ gridColumn: "1 / -1" }}>
          <span className="overline">Notlar (opsiyonel)</span>
          <textarea
            className="form-input"
            rows={2}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            disabled={submitting}
          />
        </label>
      </div>

      <p className="caption" style={{ marginTop: 12 }}>
        Önizleme belirteci ≈{preview.expires_in_seconds}s sonra geçersizleşir.
        Onaylamadan önce geçerli.
      </p>

      <div className="hstack" style={{ marginTop: 12, gap: 8 }}>
        <AuroraButton
          variant="ghost"
          onClick={onBack}
          disabled={submitting}
          data-testid="onb-confirm-back"
        >
          Geri
        </AuroraButton>
        <AuroraButton
          variant="primary"
          onClick={onConfirm}
          disabled={!canSubmit}
          data-testid="onb-confirm-submit"
        >
          {submitting ? "Oluşturuluyor…" : "Kanalı oluştur"}
        </AuroraButton>
      </div>
    </AuroraCard>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Done
// ---------------------------------------------------------------------------

interface DoneStepProps {
  created: ChannelProfileResponse;
  onGoToBranding: () => void;
  onGoToChannels: () => void;
}

function DoneStep({
  created,
  onGoToBranding,
  onGoToChannels,
}: DoneStepProps) {
  const importStatus = created.import_status ?? "pending";
  const tone =
    importStatus === "success"
      ? "success"
      : importStatus === "partial"
        ? "warning"
        : importStatus === "failed"
          ? "danger"
          : "info";
  return (
    <AuroraCard pad="default">
      <div
        className="hstack"
        style={{ justifyContent: "space-between", alignItems: "baseline" }}
      >
        <h3 style={{ margin: 0 }}>Kanal hazır</h3>
        <AuroraStatusChip tone={tone}>
          import: {importStatus}
        </AuroraStatusChip>
      </div>
      <p className="caption" style={{ marginTop: 8 }}>
        Kimliği: <span className="mono">{created.id}</span>
      </p>
      <ul
        style={{
          listStyle: "none",
          margin: "12px 0 0",
          padding: 0,
          display: "grid",
          gap: 4,
        }}
      >
        <li>
          <strong>{created.profile_name}</strong>{" "}
          <span className="caption">({created.channel_slug})</span>
        </li>
        {created.title && (
          <li className="caption">Başlık: {created.title}</li>
        )}
        {created.handle && (
          <li className="caption">Handle: {created.handle}</li>
        )}
        {created.import_error && (
          <li className="caption" style={{ color: "var(--accent-tertiary)" }}>
            Hata: {created.import_error}
          </li>
        )}
      </ul>
      <div className="hstack" style={{ marginTop: 16, gap: 8 }}>
        <AuroraButton
          variant="primary"
          onClick={onGoToBranding}
          data-testid="onb-go-branding"
        >
          Branding Center'a geç
        </AuroraButton>
        <AuroraButton variant="secondary" onClick={onGoToChannels}>
          Kanallara dön
        </AuroraButton>
      </div>
    </AuroraCard>
  );
}
