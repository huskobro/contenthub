/**
 * ChannelDetailPage — Per-channel detail with YouTube OAuth connection.
 *
 * Shows channel profile info and YouTube connection management.
 * OAuth flow opens a popup that redirects to /user/settings/youtube-callback.
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSurfacePageOverride } from "../../surfaces";
import { useChannelProfile } from "../../hooks/useChannelProfiles";
import {
  useYouTubeStatusByChannel,
  useYouTubeChannelInfoByChannel,
  useRevokeYouTube,
  useChannelCredentials,
  useSaveChannelCredentials,
} from "../../hooks/useCredentials";
import { getYouTubeAuthUrl } from "../../api/credentialsApi";
import {
  PageShell,
  SectionShell,
  StatusBadge,
} from "../../components/design-system/primitives";
import { cn } from "../../lib/cn";

export function ChannelDetailPage() {
  const Override = useSurfacePageOverride("user.channels.detail");
  if (Override) return <Override />;
  return <LegacyChannelDetailPage />;
}

function LegacyChannelDetailPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const queryClient = useQueryClient();
  const { data: channel, isLoading: channelLoading } = useChannelProfile(channelId ?? "");
  const { data: ytStatus, isLoading: ytLoading } = useYouTubeStatusByChannel(channelId ?? null);
  const { data: channelInfo } = useYouTubeChannelInfoByChannel(channelId ?? null);
  const { data: channelCreds } = useChannelCredentials(channelId ?? null);
  const saveCredsMutation = useSaveChannelCredentials();
  const revokeMutation = useRevokeYouTube();

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saveCredsSuccess, setSaveCredsSuccess] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Listen for OAuth popup success
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "youtube-oauth-success") {
        queryClient.invalidateQueries({ queryKey: ["youtube"] });
        queryClient.invalidateQueries({ queryKey: ["my-connections"] });
        setConnecting(false);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [queryClient]);

  async function handleSaveCredentials() {
    if (!channelId || (!clientId.trim() && !clientSecret.trim())) return;
    setSaveCredsSuccess(false);
    try {
      await saveCredsMutation.mutateAsync({
        channelProfileId: channelId,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      });
      setClientId("");
      setClientSecret("");
      setSaveCredsSuccess(true);
      setTimeout(() => setSaveCredsSuccess(false), 4000);
    } catch {
      // error handled by useApiError in the mutation
    }
  }

  async function handleConnect() {
    if (!channelId) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const redirectUri = `${window.location.origin}/user/settings/youtube-callback`;
      const authUrl = await getYouTubeAuthUrl(redirectUri, channelId);
      window.open(authUrl, "_blank", "width=600,height=700");
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Baglanti hatasi.");
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    if (!window.confirm("YouTube baglantisinizi kesmek istediginizden emin misiniz?")) return;
    revokeMutation.mutate(channelId ?? "");
  }

  if (channelLoading) {
    return (
      <PageShell title="Kanal Detayi">
        <div className="p-8 text-sm text-neutral-400">Yukleniyor...</div>
      </PageShell>
    );
  }

  if (!channel) {
    return (
      <PageShell title="Kanal Bulunamadi">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-neutral-500 mb-4">
            Bu kanal bulunamadi veya silinmis olabilir.
          </p>
          <Link
            to="/user/channels"
            className="text-sm text-brand-600 hover:text-brand-700"
          >
            &larr; Kanallara Don
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={channel.profile_name}
      subtitle={`@${channel.channel_slug}`}
      actions={
        <Link
          to="/user/channels"
          className="text-sm text-neutral-500 hover:text-neutral-700"
        >
          &larr; Kanallara Don
        </Link>
      }
    >
      {/* Channel Info */}
      <SectionShell title="Kanal Bilgileri">
        <div className="grid grid-cols-2 gap-4 max-w-lg text-sm">
          <div>
            <span className="font-medium text-neutral-600">Durum</span>
            <div className="mt-1">
              <StatusBadge status={channel.status} size="sm" />
            </div>
          </div>
          <div>
            <span className="font-medium text-neutral-600">Dil</span>
            <p className="mt-1 text-neutral-800">{channel.default_language}</p>
          </div>
          {channel.profile_type && (
            <div>
              <span className="font-medium text-neutral-600">Tip</span>
              <p className="mt-1 text-neutral-800">{channel.profile_type}</p>
            </div>
          )}
          <div>
            <span className="font-medium text-neutral-600">Olusturulma</span>
            <p className="mt-1 text-neutral-800">
              {new Date(channel.created_at).toLocaleDateString("tr-TR")}
            </p>
          </div>
        </div>
      </SectionShell>

      {/* YouTube API Credentials */}
      <SectionShell title="YouTube API Ayarlari">
        <div className="max-w-lg space-y-3">
          <p className="text-sm text-neutral-600">
            Google Cloud Console'dan bu kanal icin OAuth2 Client ID ve Client
            Secret olusturun. Her kanal icin farkli kimlik bilgileri
            kullanabilirsiniz.
          </p>

          {channelCreds?.has_credentials && (
            <div className="flex items-center gap-2 p-2 bg-success-light rounded-md text-sm text-success-text">
              <span>Client ID: {channelCreds.masked_client_id}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Client ID
            </label>
            <input
              type="text"
              className="w-full px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
              placeholder="123456789-xxx.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Client Secret
            </label>
            <input
              type="password"
              className="w-full px-3 py-1.5 text-sm border border-border-default rounded-md bg-surface-page"
              placeholder="GOCSPX-xxxxx"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>
          <button
            className={cn(
              "px-4 py-2 bg-brand-600 text-neutral-0 rounded-md text-sm font-medium",
              saveCredsMutation.isPending
                ? "opacity-60"
                : "cursor-pointer hover:bg-brand-700",
            )}
            onClick={handleSaveCredentials}
            disabled={
              saveCredsMutation.isPending ||
              (!clientId.trim() && !clientSecret.trim())
            }
          >
            {saveCredsMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
          </button>
          {saveCredsSuccess && (
            <p className="text-sm text-success-text">
              Kimlik bilgileri kaydedildi.
            </p>
          )}
        </div>
      </SectionShell>

      {/* YouTube Connection */}
      <SectionShell title="YouTube Baglantisi">
        <div className="max-w-lg">
          {ytLoading ? (
            <p className="text-sm text-neutral-400">Kontrol ediliyor...</p>
          ) : ytStatus?.has_credentials ? (
            <div className="space-y-3">
              {/* Connected channel info */}
              {channelInfo?.connected && channelInfo.channel_title && (
                <div className="flex items-center gap-3 p-3 bg-success-light rounded-md border border-success-light">
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
                      {channelInfo.subscriber_count &&
                        `${Number(channelInfo.subscriber_count).toLocaleString("tr-TR")} abone`}
                      {channelInfo.subscriber_count && channelInfo.video_count && " · "}
                      {channelInfo.video_count &&
                        `${Number(channelInfo.video_count).toLocaleString("tr-TR")} video`}
                    </div>
                  </div>
                </div>
              )}

              {ytStatus.scope_ok === false && (
                <div className="p-3 bg-warning-light rounded-md border border-warning-light text-sm text-warning-text">
                  Mevcut token yetersiz izinlerle alinmis. Lutfen baglantiyi kesip
                  yeniden baglanin.
                </div>
              )}

              <div className="flex items-center gap-3">
                <span className="text-sm text-success-text">
                  OAuth token mevcut -- yayinlama yapilabilir.
                </span>
                <button
                  className="px-3 py-1 bg-error text-neutral-0 rounded-md text-sm font-medium cursor-pointer"
                  onClick={handleDisconnect}
                  disabled={revokeMutation.isPending}
                >
                  {revokeMutation.isPending ? "..." : "Baglantiyi Kes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {channelCreds?.has_credentials ? (
                <>
                  <p className="text-sm text-neutral-600">
                    Bu kanali YouTube'a baglamak icin OAuth2 yetkilendirmesi
                    gereklidir.
                  </p>
                  <button
                    className={cn(
                      "px-4 py-2 bg-brand-600 text-neutral-0 rounded-md text-sm font-medium",
                      connecting
                        ? "opacity-60"
                        : "cursor-pointer hover:bg-brand-700",
                    )}
                    onClick={handleConnect}
                    disabled={connecting}
                  >
                    {connecting
                      ? "Yonlendiriliyor..."
                      : "YouTube Baglantisi Baslat"}
                  </button>
                </>
              ) : (
                <p className="text-sm text-neutral-500">
                  Once yukaridaki bolumden YouTube API kimlik bilgilerini girin.
                </p>
              )}
            </div>
          )}

          {connectError && (
            <div className="mt-2 text-sm text-error">{connectError}</div>
          )}
          {revokeMutation.isSuccess && (
            <div className="mt-2 text-sm text-success-text">
              Baglanti basariyla kesildi.
            </div>
          )}
        </div>
      </SectionShell>
    </PageShell>
  );
}

export default ChannelDetailPage;
