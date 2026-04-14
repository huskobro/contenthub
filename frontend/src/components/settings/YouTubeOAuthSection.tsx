/**
 * YouTubeOAuthSection — Extracted from CredentialsPanel.
 *
 * Handles the YouTube OAuth2 connection flow:
 * - Shows connection status
 * - Displays connected channel info (thumbnail, title, stats)
 * - Connect button that opens OAuth popup
 * - Disconnect button with confirmation
 */

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useYouTubeStatus,
  useYouTubeChannelInfo,
  useRevokeYouTube,
} from "../../hooks/useCredentials";
import { useReadOnly } from "../visibility/ReadOnlyGuard";
import { getYouTubeAuthUrl } from "../../api/credentialsApi";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Status Badge (reused locally)
// ---------------------------------------------------------------------------

function OAuthStatusBadge({ status }: { status: string }) {
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
// YouTubeOAuthSection
// ---------------------------------------------------------------------------

export function YouTubeOAuthSection() {
  const readOnly = useReadOnly();
  const { data: ytStatus, isLoading, isError } = useYouTubeStatus();
  const { data: channelInfo } = useYouTubeChannelInfo();
  const revokeMutation = useRevokeYouTube();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Popup'tan OAuth başarı sinyali dinle — token kaydedilince query'leri yenile
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "youtube-oauth-success") {
        queryClient.invalidateQueries({ queryKey: ["youtube-status"] });
        queryClient.invalidateQueries({ queryKey: ["youtube-channel-info"] });
        setConnecting(false);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [queryClient]);

  async function handleConnect() {
    // Publish Core Hardening Pack — account-selector regression guard.
    // The backend /auth-url endpoint requires channel_profile_id, but this
    // legacy admin-settings section has no channel context. Silently calling
    // getYouTubeAuthUrl(redirectUri) without it would 422 on the backend and
    // break the "always show account chooser" invariant if anyone relaxed the
    // backend to accept missing channel_profile_id. Redirect operators to the
    // per-channel connect flow, where channel_profile_id is always present.
    setConnectError(
      "Kanal bazlı bağlantı için kullanıcı panelinde kanal detay " +
      "sayfasından bağlayın (Kanallar → seçili kanal → YouTube'a Bağlan). " +
      "Bu bölüm salt bilgilendirme amaçlıdır."
    );
  }

  function handleDisconnect() {
    if (!window.confirm("YouTube baglantisinizi kesmek istediginizden emin misiniz?")) return;
    // Per-connection DB store: bu legacy admin-settings panelinde connectionId
    // yok — global/default baglanti icin undefined gecilir.
    revokeMutation.mutate(undefined);
  }

  return (
    <div className="border border-border-subtle rounded-lg p-4 mb-3 bg-surface-card shadow-xs transition-shadow duration-normal hover:shadow-md hover:border-border">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-base font-semibold text-neutral-900 min-w-[160px]">YouTube Baglantisi</span>
        {isLoading && (
          <span className="text-xs text-neutral-500">Kontrol ediliyor...</span>
        )}
        {!isLoading && !isError && ytStatus && (
          <OAuthStatusBadge
            status={
              ytStatus.has_credentials
                ? ytStatus.scope_ok === false
                  ? "invalid"
                  : "connected"
                : "missing"
            }
          />
        )}
        {isError && <OAuthStatusBadge status="invalid" />}
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

      {ytStatus?.has_credentials && ytStatus?.scope_ok === false && (
        <div className="flex items-center gap-2 mt-2 p-3 bg-warning-light rounded-md border border-warning-light">
          <span className="text-sm text-warning-text">
            Mevcut token yetersiz izinlerle alinmis. Lutfen baglantiyi kesip yeniden baglanin.
          </span>
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
