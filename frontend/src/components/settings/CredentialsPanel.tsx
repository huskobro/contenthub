import { useState } from "react";
import {
  useCredentialsList,
  useSaveCredential,
  useValidateCredential,
  useYouTubeStatus,
  useYouTubeChannelInfo,
  useRevokeYouTube,
} from "../../hooks/useCredentials";
import { useReadOnly } from "../visibility/ReadOnlyGuard";
import { getYouTubeAuthUrl, type CredentialStatus } from "../../api/credentialsApi";
import { colors, radius, typography, spacing, shadow, transition } from "../design-system/tokens";

// ---------------------------------------------------------------------------
// Styles — fully tokenized
// ---------------------------------------------------------------------------

const SECTION: React.CSSProperties = {
  marginBottom: spacing[6],
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: typography.size.base,
  fontWeight: typography.weight.semibold,
  color: colors.neutral[800],
  marginBottom: spacing[3],
  paddingBottom: spacing[2],
  borderBottom: `1px solid ${colors.border.subtle}`,
};

const CARD: React.CSSProperties = {
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: radius.lg,
  padding: spacing[4],
  marginBottom: spacing[3],
  background: colors.surface.card,
  boxShadow: shadow.xs,
};

const ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing[3],
  flexWrap: "wrap",
};

const LABEL: React.CSSProperties = {
  fontSize: typography.size.base,
  fontWeight: typography.weight.semibold,
  color: colors.neutral[900],
  minWidth: "160px",
};

const HELP: React.CSSProperties = {
  fontSize: typography.size.xs,
  color: colors.neutral[500],
  marginTop: spacing[1],
  lineHeight: typography.lineHeight.normal,
};

const MASKED: React.CSSProperties = {
  fontSize: typography.size.base,
  color: colors.neutral[600],
  fontFamily: typography.monoFamily,
  letterSpacing: "0.5px",
};

const INPUT: React.CSSProperties = {
  flex: 1,
  minWidth: "200px",
  padding: `${spacing[1]} ${spacing[2]}`,
  border: `1px solid ${colors.border.default}`,
  borderRadius: radius.sm,
  fontSize: typography.size.base,
  fontFamily: typography.fontFamily,
  boxSizing: "border-box",
  outline: "none",
  transition: `border-color ${transition.fast}`,
};

const BTN_PRIMARY: React.CSSProperties = {
  padding: `${spacing[1]} ${spacing[3]}`,
  background: colors.brand[600],
  color: colors.neutral[0],
  border: "none",
  borderRadius: radius.md,
  cursor: "pointer",
  fontSize: typography.size.sm,
  fontWeight: typography.weight.medium,
  transition: `opacity ${transition.fast}`,
};

const BTN_SECONDARY: React.CSSProperties = {
  padding: `${spacing[1]} ${spacing[3]}`,
  background: "transparent",
  color: colors.neutral[600],
  border: `1px solid ${colors.border.default}`,
  borderRadius: radius.md,
  cursor: "pointer",
  fontSize: typography.size.sm,
  fontWeight: typography.weight.medium,
  transition: `background ${transition.fast}`,
};

const BTN_DANGER: React.CSSProperties = {
  padding: `${spacing[1]} ${spacing[3]}`,
  background: colors.error.base,
  color: colors.neutral[0],
  border: "none",
  borderRadius: radius.md,
  cursor: "pointer",
  fontSize: typography.size.sm,
  fontWeight: typography.weight.medium,
  transition: `opacity ${transition.fast}`,
};

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    configured: { bg: colors.success.light, fg: colors.success.text, label: "Yapilandirildi" },
    env_only: { bg: colors.warning.light, fg: colors.warning.text, label: ".env" },
    missing: { bg: colors.error.light, fg: colors.error.text, label: "Eksik" },
    invalid: { bg: colors.error.light, fg: colors.error.text, label: "Gecersiz" },
    connected: { bg: colors.info.light, fg: colors.brand[700], label: "Bagli" },
  };
  const s = map[status] ?? { bg: colors.neutral[100], fg: colors.neutral[700], label: status };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: radius.full,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        background: s.bg,
        color: s.fg,
      }}
    >
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Source Badge
// ---------------------------------------------------------------------------

function SourceBadge({ source }: { source: string }) {
  if (source === "none") return null;
  const label = source === "db" ? "DB" : source === "env" ? "ENV" : source;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.375rem",
        borderRadius: radius.sm,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        background: colors.neutral[100],
        color: colors.neutral[600],
      }}
    >
      kaynak: {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single Credential Row
// ---------------------------------------------------------------------------

function CredentialRow({ cred }: { cred: CredentialStatus }) {
  const readOnly = useReadOnly();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const saveMutation = useSaveCredential();
  const validateMutation = useValidateCredential();

  function handleSave() {
    if (!inputValue.trim()) return;
    setFeedback(null);
    saveMutation.mutate(
      { key: cred.key, value: inputValue.trim() },
      {
        onSuccess: (data) => {
          setEditing(false);
          setInputValue("");
          const action = data.wiring?.action;
          if (action === "replaced" || action === "registered") {
            setFeedback({ type: "success", msg: "Kaydedildi ve provider guncellendi." });
          } else {
            setFeedback({ type: "success", msg: "Kaydedildi." });
          }
        },
        onError: (err) => {
          setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Kayit hatasi." });
        },
      },
    );
  }

  function handleValidate() {
    setFeedback(null);
    validateMutation.mutate(cred.key, {
      onSuccess: (data) => {
        setFeedback({
          type: data.valid ? "success" : "error",
          msg: data.message,
        });
      },
      onError: (err) => {
        setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Dogrulama hatasi." });
      },
    });
  }

  function handleCancel() {
    setEditing(false);
    setInputValue("");
    setFeedback(null);
  }

  return (
    <div style={CARD}>
      <div style={ROW}>
        <span style={LABEL}>{cred.label}</span>
        <StatusBadge status={cred.status} />
        <SourceBadge source={cred.source} />
        {cred.updated_at && (
          <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>
            {new Date(cred.updated_at).toLocaleString("tr-TR")}
          </span>
        )}
      </div>

      {cred.help_text && <div style={HELP}>{cred.help_text}</div>}

      {/* Current masked value */}
      {cred.masked_value && !editing && (
        <div style={{ marginTop: spacing[2] }}>
          <span style={MASKED}>{cred.masked_value}</span>
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: "flex", gap: spacing[2], marginTop: spacing[2], alignItems: "center" }}>
        {editing ? (
          <>
            <input
              style={INPUT}
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Yeni deger girin..."
              autoComplete="off"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
            <button
              style={{ ...BTN_PRIMARY, opacity: saveMutation.isPending ? 0.6 : 1 }}
              onClick={handleSave}
              disabled={saveMutation.isPending || !inputValue.trim()}
            >
              {saveMutation.isPending ? "..." : "Kaydet"}
            </button>
            <button style={BTN_SECONDARY} onClick={handleCancel}>
              Iptal
            </button>
          </>
        ) : (
          <>
            <button style={{ ...BTN_SECONDARY, opacity: readOnly ? 0.5 : 1, cursor: readOnly ? "not-allowed" : "pointer" }} disabled={readOnly} onClick={() => setEditing(true)}>
              {cred.status === "missing" ? "Ekle" : "Degistir"}
            </button>
            {cred.status !== "missing" && (
              <button
                style={{ ...BTN_SECONDARY, opacity: validateMutation.isPending ? 0.6 : 1 }}
                onClick={handleValidate}
                disabled={validateMutation.isPending}
              >
                {validateMutation.isPending ? "..." : "Dogrula"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          style={{
            marginTop: spacing[1],
            fontSize: typography.size.sm,
            color: feedback.type === "success" ? colors.success.text : colors.error.base,
          }}
        >
          {feedback.msg}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// YouTube Connection Section
// ---------------------------------------------------------------------------

function YouTubeConnectionSection() {
  const readOnly = useReadOnly();
  const { data: ytStatus, isLoading, isError } = useYouTubeStatus();
  const { data: channelInfo } = useYouTubeChannelInfo();
  const revokeMutation = useRevokeYouTube();
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      const redirectUri = `${window.location.origin}/admin/settings/youtube-callback`;
      const authUrl = await getYouTubeAuthUrl(redirectUri);
      window.open(authUrl, "_blank", "width=600,height=700");
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Baglanti hatasi.");
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    if (!window.confirm("YouTube baglantisinizi kesmek istediginizden emin misiniz?")) return;
    revokeMutation.mutate();
  }

  return (
    <div style={CARD}>
      <div style={ROW}>
        <span style={LABEL}>YouTube Baglantisi</span>
        {isLoading && (
          <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>Kontrol ediliyor...</span>
        )}
        {!isLoading && !isError && ytStatus && (
          <StatusBadge status={ytStatus.has_credentials ? "connected" : "missing"} />
        )}
        {isError && <StatusBadge status="invalid" />}
      </div>

      <div style={HELP}>
        YouTube'a video yayinlamak icin OAuth2 yetkilendirmesi gereklidir.
        Once yukaridaki YouTube Client ID ve Client Secret alanlarini doldurun,
        sonra baglantiyi baslatin.
      </div>

      {/* Connected channel info */}
      {channelInfo?.connected && channelInfo.channel_title && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing[3],
            marginTop: spacing[3],
            padding: spacing[3],
            background: colors.success.light,
            borderRadius: radius.md,
            border: `1px solid ${colors.success.light}`,
          }}
        >
          {channelInfo.thumbnail_url && (
            <img
              src={channelInfo.thumbnail_url}
              alt={channelInfo.channel_title}
              style={{ width: 40, height: 40, borderRadius: "50%" }}
            />
          )}
          <div>
            <div style={{ fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.success.text }}>
              {channelInfo.channel_title}
            </div>
            <div style={{ fontSize: typography.size.xs, color: colors.neutral[600] }}>
              {channelInfo.subscriber_count && `${Number(channelInfo.subscriber_count).toLocaleString("tr-TR")} abone`}
              {channelInfo.subscriber_count && channelInfo.video_count && " · "}
              {channelInfo.video_count && `${Number(channelInfo.video_count).toLocaleString("tr-TR")} video`}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: spacing[2], marginTop: spacing[2], alignItems: "center" }}>
        {ytStatus?.has_credentials ? (
          <>
            <span style={{ fontSize: typography.size.sm, color: colors.success.text }}>
              OAuth token mevcut — yayinlama yapilabilir.
            </span>
            <button style={{ ...BTN_DANGER, opacity: readOnly ? 0.5 : 1, cursor: readOnly ? "not-allowed" : "pointer" }} onClick={handleDisconnect} disabled={readOnly || revokeMutation.isPending}>
              {revokeMutation.isPending ? "..." : "Baglantiyi Kes"}
            </button>
          </>
        ) : (
          <button
            style={{ ...BTN_PRIMARY, opacity: (readOnly || connecting) ? 0.6 : 1, cursor: readOnly ? "not-allowed" : "pointer" }}
            onClick={handleConnect}
            disabled={readOnly || connecting}
          >
            {connecting ? "Yonlendiriliyor..." : "YouTube Baglantisi Baslat"}
          </button>
        )}
      </div>

      {connectError && (
        <div style={{ marginTop: spacing[1], fontSize: typography.size.sm, color: colors.error.base }}>
          {connectError}
        </div>
      )}

      {revokeMutation.isSuccess && (
        <div style={{ marginTop: spacing[1], fontSize: typography.size.sm, color: colors.success.text }}>
          Baglanti basariyla kesildi.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main CredentialsPanel
// ---------------------------------------------------------------------------

const GROUP_LABELS: Record<string, string> = {
  ai_providers: "AI Servisleri (LLM)",
  visual_providers: "Gorsel Servisler",
  youtube: "YouTube",
};

const GROUP_ORDER = ["ai_providers", "visual_providers", "youtube"];

export function CredentialsPanel() {
  const { data: credentials, isLoading, isError, error } = useCredentialsList();

  if (isLoading) {
    return <p style={{ color: colors.neutral[600], fontSize: typography.size.base }}>Yükleniyor...</p>;
  }
  if (isError) {
    return (
      <p style={{ color: colors.error.base, fontSize: typography.size.base }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }
  if (!credentials || credentials.length === 0) {
    return <p style={{ color: colors.neutral[600], fontSize: typography.size.base }}>Tanimli credential bulunamadi.</p>;
  }

  // Group credentials by their group field
  const grouped: Record<string, CredentialStatus[]> = {};
  for (const cred of credentials) {
    const g = cred.group || "other";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(cred);
  }

  return (
    <div>
      {GROUP_ORDER.map((groupKey) => {
        const items = grouped[groupKey];
        if (!items || items.length === 0) return null;
        return (
          <div key={groupKey} style={SECTION}>
            <div style={SECTION_TITLE}>{GROUP_LABELS[groupKey] ?? groupKey}</div>
            {items.map((cred) => (
              <CredentialRow key={cred.key} cred={cred} />
            ))}
            {/* YouTube connection section after YouTube credentials */}
            {groupKey === "youtube" && <YouTubeConnectionSection />}
          </div>
        );
      })}
    </div>
  );
}
