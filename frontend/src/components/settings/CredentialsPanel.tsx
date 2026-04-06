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
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    configured: { bg: "bg-success-light", fg: "text-success-text", label: "Yapilandirildi" },
    env_only: { bg: "bg-warning-light", fg: "text-warning-text", label: ".env" },
    missing: { bg: "bg-error-light", fg: "text-error-text", label: "Eksik" },
    invalid: { bg: "bg-error-light", fg: "text-error-text", label: "Gecersiz" },
    connected: { bg: "bg-info-light", fg: "text-brand-700", label: "Bagli" },
  };
  const s = map[status] ?? { bg: "bg-neutral-100", fg: "text-neutral-700", label: status };

  return (
    <span
      className={cn(
        "inline-block px-2 py-1 rounded-full text-xs font-semibold tracking-tight",
        s.bg,
        s.fg,
      )}
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
    <span className="inline-block px-2 py-1 rounded-sm text-xs font-medium bg-neutral-100 text-neutral-600">
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
    <div className="border border-border-subtle rounded-lg p-4 mb-3 bg-surface-card shadow-xs transition-shadow duration-normal hover:shadow-md hover:border-border">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-base font-semibold text-neutral-900 min-w-[160px]">{cred.label}</span>
        <StatusBadge status={cred.status} />
        <SourceBadge source={cred.source} />
        {cred.updated_at && (
          <span className="text-xs text-neutral-500">
            {new Date(cred.updated_at).toLocaleString("tr-TR")}
          </span>
        )}
      </div>

      {cred.help_text && <div className="text-xs text-neutral-500 mt-1 leading-normal">{cred.help_text}</div>}

      {/* Current masked value */}
      {cred.masked_value && !editing && (
        <div className="mt-2">
          <span className="text-base text-neutral-600 font-mono tracking-wide">{cred.masked_value}</span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex gap-2 mt-2 items-center">
        {editing ? (
          <>
            <input
              className="flex-1 min-w-[200px] px-2 py-1 border border-border rounded-sm text-base font-body outline-none transition-colors duration-fast focus:border-focus"
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Yeni deger girin..."
              autoComplete="off"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
            <button
              className={cn(
                "px-3 py-1 bg-brand-600 text-neutral-0 border-none rounded-md cursor-pointer text-sm font-medium transition-opacity duration-fast",
                saveMutation.isPending && "opacity-60",
              )}
              onClick={handleSave}
              disabled={saveMutation.isPending || !inputValue.trim()}
            >
              {saveMutation.isPending ? "..." : "Kaydet"}
            </button>
            <button
              className="px-3 py-1 bg-transparent text-neutral-600 border border-border rounded-md cursor-pointer text-sm font-medium transition-colors duration-fast hover:bg-neutral-50"
              onClick={handleCancel}
            >
              Iptal
            </button>
          </>
        ) : (
          <>
            <button
              className={cn(
                "px-3 py-1 bg-transparent text-neutral-600 border border-border rounded-md text-sm font-medium transition-colors duration-fast hover:bg-neutral-50",
                readOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              )}
              disabled={readOnly}
              onClick={() => setEditing(true)}
            >
              {cred.status === "missing" ? "Ekle" : "Degistir"}
            </button>
            {cred.status !== "missing" && (
              <button
                className={cn(
                  "px-3 py-1 bg-transparent text-neutral-600 border border-border rounded-md text-sm font-medium transition-colors duration-fast hover:bg-neutral-50",
                  validateMutation.isPending && "opacity-60",
                )}
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
          className={cn(
            "mt-1 text-sm",
            feedback.type === "success" ? "text-success-text" : "text-error",
          )}
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
    <div className="border border-border-subtle rounded-lg p-4 mb-3 bg-surface-card shadow-xs transition-shadow duration-normal hover:shadow-md hover:border-border">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-base font-semibold text-neutral-900 min-w-[160px]">YouTube Baglantisi</span>
        {isLoading && (
          <span className="text-xs text-neutral-500">Kontrol ediliyor...</span>
        )}
        {!isLoading && !isError && ytStatus && (
          <StatusBadge status={ytStatus.has_credentials ? "connected" : "missing"} />
        )}
        {isError && <StatusBadge status="invalid" />}
      </div>

      <div className="text-xs text-neutral-500 mt-1 leading-normal">
        YouTube'a video yayinlamak icin OAuth2 yetkilendirmesi gereklidir.
        Once yukaridaki YouTube Client ID ve Client Secret alanlarini doldurun,
        sonra baglantiyi baslatin.
      </div>

      {/* Connected channel info */}
      {channelInfo?.connected && channelInfo.channel_title && (
        <div className="flex items-center gap-3 mt-3 p-3 bg-success-light rounded-md border border-success-light">
          {channelInfo.thumbnail_url && (
            <img
              src={channelInfo.thumbnail_url}
              alt={channelInfo.channel_title}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <div className="text-base font-semibold text-success-text">
              {channelInfo.channel_title}
            </div>
            <div className="text-xs text-neutral-600">
              {channelInfo.subscriber_count && `${Number(channelInfo.subscriber_count).toLocaleString("tr-TR")} abone`}
              {channelInfo.subscriber_count && channelInfo.video_count && " · "}
              {channelInfo.video_count && `${Number(channelInfo.video_count).toLocaleString("tr-TR")} video`}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-2 items-center">
        {ytStatus?.has_credentials ? (
          <>
            <span className="text-sm text-success-text">
              OAuth token mevcut — yayinlama yapilabilir.
            </span>
            <button
              className={cn(
                "px-3 py-1 bg-error text-neutral-0 border-none rounded-md text-sm font-medium transition-opacity duration-fast",
                readOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              )}
              onClick={handleDisconnect}
              disabled={readOnly || revokeMutation.isPending}
            >
              {revokeMutation.isPending ? "..." : "Baglantiyi Kes"}
            </button>
          </>
        ) : (
          <button
            className={cn(
              "px-3 py-1 bg-brand-600 text-neutral-0 border-none rounded-md text-sm font-medium transition-opacity duration-fast",
              (readOnly || connecting) ? "opacity-60" : "",
              readOnly ? "cursor-not-allowed" : "cursor-pointer",
            )}
            onClick={handleConnect}
            disabled={readOnly || connecting}
          >
            {connecting ? "Yonlendiriliyor..." : "YouTube Baglantisi Baslat"}
          </button>
        )}
      </div>

      {connectError && (
        <div className="mt-1 text-sm text-error">
          {connectError}
        </div>
      )}

      {revokeMutation.isSuccess && (
        <div className="mt-1 text-sm text-success-text">
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
    return <p className="text-neutral-600 text-base">Yükleniyor...</p>;
  }
  if (isError) {
    return (
      <p className="text-error text-base">
        Hata: {error instanceof Error ? error.message : "Bilinmeyen hata"}
      </p>
    );
  }
  if (!credentials || credentials.length === 0) {
    return <p className="text-neutral-600 text-base">Tanimli credential bulunamadi.</p>;
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
          <div key={groupKey} className="mb-6">
            <div className="text-base font-semibold text-neutral-800 mb-3 pb-2 border-b border-border-subtle">
              {GROUP_LABELS[groupKey] ?? groupKey}
            </div>
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
