import { useState } from "react";
import {
  useCredentialsList,
  useSaveCredential,
  useValidateCredential,
  useYouTubeStatus,
  useYouTubeChannelInfo,
  useRevokeYouTube,
} from "../../hooks/useCredentials";
import { getYouTubeAuthUrl, type CredentialStatus } from "../../api/credentialsApi";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const SECTION: React.CSSProperties = {
  marginBottom: "1.5rem",
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#334155",
  marginBottom: "0.75rem",
  paddingBottom: "0.375rem",
  borderBottom: "1px solid #e2e8f0",
};

const CARD: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "1rem",
  marginBottom: "0.75rem",
  background: "#fff",
};

const ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  flexWrap: "wrap",
};

const LABEL: React.CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#1e293b",
  minWidth: "160px",
};

const HELP: React.CSSProperties = {
  fontSize: "0.6875rem",
  color: "#94a3b8",
  marginTop: "0.25rem",
  lineHeight: 1.4,
};

const MASKED: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "#64748b",
  fontFamily: "monospace",
  letterSpacing: "0.5px",
};

const INPUT: React.CSSProperties = {
  flex: 1,
  minWidth: "200px",
  padding: "0.375rem 0.5rem",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  fontSize: "0.8125rem",
  boxSizing: "border-box",
};

const BTN_PRIMARY: React.CSSProperties = {
  padding: "0.3rem 0.75rem",
  background: "#1e40af",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "0.75rem",
  fontWeight: 500,
};

const BTN_SECONDARY: React.CSSProperties = {
  padding: "0.3rem 0.75rem",
  background: "transparent",
  color: "#64748b",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "0.75rem",
};

const BTN_DANGER: React.CSSProperties = {
  padding: "0.3rem 0.75rem",
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "0.75rem",
  fontWeight: 500,
};

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    configured: { bg: "#dcfce7", fg: "#166534", label: "Yapilandirildi" },
    env_only: { bg: "#fef9c3", fg: "#854d0e", label: ".env" },
    missing: { bg: "#fef2f2", fg: "#991b1b", label: "Eksik" },
    invalid: { bg: "#fee2e2", fg: "#b91c1c", label: "Gecersiz" },
    connected: { bg: "#dbeafe", fg: "#1e40af", label: "Bagli" },
  };
  const s = map[status] ?? { bg: "#f1f5f9", fg: "#475569", label: status };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "9999px",
        fontSize: "0.6875rem",
        fontWeight: 600,
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
        borderRadius: "4px",
        fontSize: "0.625rem",
        fontWeight: 500,
        background: "#f1f5f9",
        color: "#64748b",
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
          <span style={{ fontSize: "0.625rem", color: "#94a3b8" }}>
            {new Date(cred.updated_at).toLocaleString("tr-TR")}
          </span>
        )}
      </div>

      {cred.help_text && <div style={HELP}>{cred.help_text}</div>}

      {/* Current masked value */}
      {cred.masked_value && !editing && (
        <div style={{ marginTop: "0.5rem" }}>
          <span style={MASKED}>{cred.masked_value}</span>
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", alignItems: "center" }}>
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
            <button style={BTN_SECONDARY} onClick={() => setEditing(true)}>
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
            marginTop: "0.375rem",
            fontSize: "0.75rem",
            color: feedback.type === "success" ? "#166534" : "#dc2626",
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
          <span style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>Kontrol ediliyor...</span>
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
            gap: "0.75rem",
            marginTop: "0.75rem",
            padding: "0.625rem",
            background: "#f0fdf4",
            borderRadius: "6px",
            border: "1px solid #bbf7d0",
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
            <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#166534" }}>
              {channelInfo.channel_title}
            </div>
            <div style={{ fontSize: "0.6875rem", color: "#64748b" }}>
              {channelInfo.subscriber_count && `${Number(channelInfo.subscriber_count).toLocaleString("tr-TR")} abone`}
              {channelInfo.subscriber_count && channelInfo.video_count && " · "}
              {channelInfo.video_count && `${Number(channelInfo.video_count).toLocaleString("tr-TR")} video`}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", alignItems: "center" }}>
        {ytStatus?.has_credentials ? (
          <>
            <span style={{ fontSize: "0.75rem", color: "#166534" }}>
              OAuth token mevcut — yayinlama yapilabilir.
            </span>
            <button style={BTN_DANGER} onClick={handleDisconnect} disabled={revokeMutation.isPending}>
              {revokeMutation.isPending ? "..." : "Baglantiyi Kes"}
            </button>
          </>
        ) : (
          <button
            style={{ ...BTN_PRIMARY, opacity: connecting ? 0.6 : 1 }}
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? "Yonlendiriliyor..." : "YouTube Baglantisi Baslat"}
          </button>
        )}
      </div>

      {connectError && (
        <div style={{ marginTop: "0.375rem", fontSize: "0.75rem", color: "#dc2626" }}>
          {connectError}
        </div>
      )}

      {revokeMutation.isSuccess && (
        <div style={{ marginTop: "0.375rem", fontSize: "0.75rem", color: "#166534" }}>
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
    return <p style={{ color: "#64748b", fontSize: "0.8125rem" }}>Yukleniyor...</p>;
  }
  if (isError) {
    return (
      <p style={{ color: "#dc2626", fontSize: "0.8125rem" }}>
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }
  if (!credentials || credentials.length === 0) {
    return <p style={{ color: "#64748b", fontSize: "0.8125rem" }}>Tanimli credential bulunamadi.</p>;
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
