/**
 * CanvasChannelDetailPage — Faz 3B.
 *
 * Canvas override for `user.channels.detail`. Re-frames the legacy channel
 * detail page as a "kanal studyosu" (channel studio): the channel is shown
 * as a workspace surface the user is *inside of*, not a settings form they
 * are filling out. Identity, health, credentials, OAuth connection, and the
 * projects that live under this channel all share one canvas.
 *
 * Information architecture
 * ------------------------
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │ Hero: kanal adi + slug + status + back-to-studio             │
 *   ├───────────────────────────────────────────────────────────────┤
 *   │ Health ribbon: kimlik | api creds | oauth | proje sayisi     │
 *   ├────────────────────────────────┬──────────────────────────────┤
 *   │ Sol:                           │ Sag:                         │
 *   │  - Kanal kimligi kart          │  - YouTube baglanti kart     │
 *   │  - API credentials kart        │  - Ilgili projeler kart      │
 *   └────────────────────────────────┴──────────────────────────────┘
 *
 * Data contract preservation
 * --------------------------
 * Same hooks/APIs the legacy `ChannelDetailPage` uses — no new endpoints,
 * no fake metrics:
 *   - useChannelProfile(channelId)
 *   - useYouTubeStatusByChannel(channelId)
 *   - useYouTubeChannelInfoByChannel(channelId)
 *   - useChannelCredentials(channelId)
 *   - useSaveChannelCredentials()
 *   - useRevokeYouTube()
 *   - getYouTubeAuthUrl(redirectUri, channelId)  (for OAuth popup)
 *   - useContentProjects({ user_id, channel_profile_id }) — projects under
 *     this channel, honest count + quick list, cross-linked into Canvas
 *     project detail so the user stays inside the workspace.
 *
 * Fallback
 * --------
 * Mounted only when Canvas is the active user surface. Legacy
 * `ChannelDetailPage` falls through via `useSurfacePageOverride` trampoline
 * when Canvas is off.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useChannelProfile } from "../../hooks/useChannelProfiles";
import {
  useYouTubeStatusByChannel,
  useYouTubeChannelInfoByChannel,
  useRevokeYouTube,
  useChannelCredentials,
  useSaveChannelCredentials,
} from "../../hooks/useCredentials";
import { useContentProjects } from "../../hooks/useContentProjects";
import { getYouTubeAuthUrl } from "../../api/credentialsApi";
import { StatusBadge } from "../../components/design-system/primitives";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CanvasChannelDetailPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id;

  const { data: channel, isLoading: channelLoading } = useChannelProfile(
    channelId ?? "",
  );
  const { data: ytStatus, isLoading: ytLoading } = useYouTubeStatusByChannel(
    channelId ?? null,
  );
  const { data: channelInfo } = useYouTubeChannelInfoByChannel(
    channelId ?? null,
  );
  const { data: channelCreds } = useChannelCredentials(channelId ?? null);
  const saveCredsMutation = useSaveChannelCredentials();
  const revokeMutation = useRevokeYouTube();

  // Projects living under this channel (for workspace feel).
  const { data: projects } = useContentProjects(
    userId && channelId
      ? { user_id: userId, channel_profile_id: channelId, limit: 50 }
      : undefined,
  );

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saveCredsSuccess, setSaveCredsSuccess] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  // Track the success-banner auto-hide timer so we can cancel it on unmount
  // and avoid state updates on unmounted components.
  const saveCredsSuccessTimerRef = useRef<number | null>(null);

  // Cleanup the timer on unmount.
  useEffect(() => {
    return () => {
      if (saveCredsSuccessTimerRef.current !== null) {
        window.clearTimeout(saveCredsSuccessTimerRef.current);
        saveCredsSuccessTimerRef.current = null;
      }
    };
  }, []);

  // OAuth popup success listener (identical to legacy).
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
      // Cancel any previously scheduled hide before scheduling a new one.
      if (saveCredsSuccessTimerRef.current !== null) {
        window.clearTimeout(saveCredsSuccessTimerRef.current);
      }
      saveCredsSuccessTimerRef.current = window.setTimeout(() => {
        setSaveCredsSuccess(false);
        saveCredsSuccessTimerRef.current = null;
      }, 4000);
    } catch {
      // useApiError handles the error toast
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
      setConnectError(err instanceof Error ? err.message : "Bağlantı hatası.");
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    if (
      !window.confirm(
        "YouTube bağlantınızı kesmek istediğinizden emin misiniz?",
      )
    )
      return;
    revokeMutation.mutate(channelId ?? "");
  }

  const projectRows = useMemo(() => projects ?? [], [projects]);

  // Health snapshot — all derived from existing hooks, no fake data.
  const health = useMemo(() => {
    const identityOk = Boolean(channel);
    const credsOk = Boolean(channelCreds?.has_credentials);
    const oauthOk = Boolean(ytStatus?.has_credentials);
    const scopeWarn = ytStatus?.has_credentials && ytStatus?.scope_ok === false;
    return { identityOk, credsOk, oauthOk, scopeWarn };
  }, [channel, channelCreds, ytStatus]);

  // ---------------------------------------------------------------
  // Loading + not-found states
  // ---------------------------------------------------------------
  if (channelLoading) {
    return (
      <div
        className="max-w-[1280px] flex flex-col gap-5"
        data-testid="canvas-channel-detail"
      >
        <div
          className="rounded-xl border border-border-subtle bg-surface-card p-8 text-center text-sm text-neutral-500"
          data-testid="canvas-channel-detail-loading"
        >
          Kanal yükleniyor...
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div
        className="max-w-[1280px] flex flex-col gap-5"
        data-testid="canvas-channel-detail"
      >
        <div
          className="rounded-xl border border-dashed border-border-subtle bg-neutral-50/40 p-10 text-center"
          data-testid="canvas-channel-detail-empty"
        >
          <p className="m-0 text-sm font-semibold text-neutral-700">
            Kanal bulunamadı
          </p>
          <p className="m-0 mt-1 text-xs text-neutral-500">
            Bu kanal silinmiş veya artık erişilebilir değil.
          </p>
          <Link
            to="/user/channels"
            className="inline-block mt-3 text-xs font-semibold text-brand-600 hover:text-brand-700"
            data-testid="canvas-channel-detail-back-empty"
          >
            &larr; Kanal stüdyoma dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-5 max-w-[1280px]"
      data-testid="canvas-channel-detail"
    >
      {/* Hero ------------------------------------------------------------- */}
      <section
        className={cn(
          "rounded-xl border border-border-subtle bg-surface-card shadow-sm",
          "px-6 py-5 flex items-start gap-5",
        )}
        data-testid="canvas-channel-detail-hero"
      >
        <div
          className={cn(
            "shrink-0 w-14 h-14 rounded-full overflow-hidden",
            "border border-border-subtle bg-gradient-to-br from-brand-50 to-neutral-100",
            "flex items-center justify-center text-sm font-semibold text-brand-700",
          )}
        >
          {channelInfo?.thumbnail_url ? (
            <img
              src={channelInfo.thumbnail_url}
              alt={channel.profile_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{channel.profile_name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-brand-600">
            Canvas Workspace &middot; Kanal Stüdyosu
          </p>
          <h1 className="m-0 mt-1 text-xl font-semibold text-neutral-900 truncate">
            {channel.profile_name}
          </h1>
          <p lang="en" className="m-0 mt-0.5 text-xs font-mono uppercase text-neutral-500">
            @{channel.channel_slug}
          </p>
          {channelInfo?.connected && channelInfo.channel_title ? (
            <p className="m-0 mt-1 text-xs text-neutral-500">
              YouTube: <span className="font-semibold text-neutral-700">{channelInfo.channel_title}</span>
              {channelInfo.subscriber_count
                ? ` · ${Number(channelInfo.subscriber_count).toLocaleString("tr-TR")} abone`
                : null}
              {channelInfo.video_count
                ? ` · ${Number(channelInfo.video_count).toLocaleString("tr-TR")} video`
                : null}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={channel.status} size="sm" />
          <Link
            to="/user/channels"
            className="text-[11px] font-semibold text-neutral-500 hover:text-brand-600"
            data-testid="canvas-channel-detail-back"
          >
            &larr; Kanal stüdyoma dön
          </Link>
        </div>
      </section>

      {/* Health ribbon --------------------------------------------------- */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        data-testid="canvas-channel-detail-health"
      >
        <HealthTile
          label="Kimlik"
          state={health.identityOk ? "ok" : "warn"}
          note={
            channel.default_language
              ? `dil ${channel.default_language}`
              : "dil tanımsız"
          }
          testId="canvas-channel-health-identity"
        />
        <HealthTile
          label="API Creds"
          state={health.credsOk ? "ok" : "idle"}
          note={
            channelCreds?.masked_client_id
              ? String(channelCreds.masked_client_id)
              : "client id yok"
          }
          testId="canvas-channel-health-creds"
        />
        <HealthTile
          label="OAuth"
          state={
            health.scopeWarn ? "warn" : health.oauthOk ? "ok" : "idle"
          }
          note={
            health.scopeWarn
              ? "scope yetersiz"
              : health.oauthOk
                ? "bağlantı hazır"
                : "bağlantı yok"
          }
          testId="canvas-channel-health-oauth"
        />
        <HealthTile
          label="Projeler"
          state={projectRows.length > 0 ? "ok" : "idle"}
          note={`${projectRows.length} proje`}
          testId="canvas-channel-health-projects"
        />
      </div>

      {/* Two-column studio body ----------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* --- Left: identity + credentials ----------------------------- */}
        <div className="flex flex-col gap-5">
          {/* Identity card */}
          <section
            className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
            data-testid="canvas-channel-identity"
          >
            <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50">
              <p className="m-0 text-sm font-semibold text-neutral-800">
                Kanal Kimliği
              </p>
              <p className="m-0 mt-0.5 text-xs text-neutral-500">
                Stüdyonun temel meta bilgisi.
              </p>
            </header>
            <dl className="px-5 py-4 grid grid-cols-2 gap-4 text-xs">
              <DetailRow label="Durum">
                <StatusBadge status={channel.status} size="sm" />
              </DetailRow>
              <DetailRow label="Varsayılan Dil">
                <span className="font-medium text-neutral-800">
                  {channel.default_language || "—"}
                </span>
              </DetailRow>
              {channel.profile_type ? (
                <DetailRow label="Tip">
                  <span className="font-medium text-neutral-800">
                    {channel.profile_type}
                  </span>
                </DetailRow>
              ) : null}
              <DetailRow label="Oluşturulma">
                <span className="font-medium text-neutral-800">
                  {new Date(channel.created_at).toLocaleDateString("tr-TR")}
                </span>
              </DetailRow>
            </dl>
          </section>

          {/* API Credentials card */}
          <section
            className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
            data-testid="canvas-channel-credentials"
          >
            <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50">
              <p className="m-0 text-sm font-semibold text-neutral-800">
                YouTube API Kimlik Bilgileri
              </p>
              <p className="m-0 mt-0.5 text-xs text-neutral-500">
                Google Cloud Console&apos;dan bu kanal için OAuth2 client id /
                secret alın.
              </p>
            </header>
            <div className="px-5 py-4 flex flex-col gap-3">
              {channelCreds?.has_credentials ? (
                <div
                  className="rounded-md border border-success/30 bg-success-light/40 px-3 py-2 text-xs text-success-dark"
                  data-testid="canvas-channel-credentials-current"
                >
                  Mevcut client id:{" "}
                  <span className="font-mono">
                    {channelCreds.masked_client_id}
                  </span>
                </div>
              ) : null}

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded-md",
                    "border border-border-subtle bg-surface-card",
                    "focus:outline-none focus:border-brand-400",
                  )}
                  placeholder="123456789-xxx.apps.googleusercontent.com"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  data-testid="canvas-channel-credentials-client-id"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  Client Secret
                </label>
                <input
                  type="password"
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded-md",
                    "border border-border-subtle bg-surface-card",
                    "focus:outline-none focus:border-brand-400",
                  )}
                  placeholder="GOCSPX-xxxxx"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  data-testid="canvas-channel-credentials-client-secret"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveCredentials}
                  disabled={
                    saveCredsMutation.isPending ||
                    (!clientId.trim() && !clientSecret.trim())
                  }
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-semibold",
                    saveCredsMutation.isPending ||
                      (!clientId.trim() && !clientSecret.trim())
                      ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                      : "bg-brand-600 text-white hover:bg-brand-700",
                  )}
                  data-testid="canvas-channel-credentials-save"
                >
                  {saveCredsMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </button>
                {saveCredsSuccess ? (
                  <span
                    className="text-xs text-success-dark"
                    data-testid="canvas-channel-credentials-success"
                  >
                    Kaydedildi.
                  </span>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        {/* --- Right: connection + related projects --------------------- */}
        <div className="flex flex-col gap-5">
          {/* YouTube connection card */}
          <section
            className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
            data-testid="canvas-channel-oauth"
          >
            <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50">
              <p className="m-0 text-sm font-semibold text-neutral-800">
                YouTube Bağlantısı
              </p>
              <p className="m-0 mt-0.5 text-xs text-neutral-500">
                Yayınlama için OAuth2 token durumu.
              </p>
            </header>
            <div className="px-5 py-4 flex flex-col gap-3">
              {ytLoading ? (
                <p
                  className="m-0 text-xs text-neutral-500"
                  data-testid="canvas-channel-oauth-loading"
                >
                  Durum kontrol ediliyor...
                </p>
              ) : ytStatus?.has_credentials ? (
                <>
                  {channelInfo?.connected && channelInfo.channel_title ? (
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-md border border-success/30",
                        "bg-success-light/40 px-3 py-2",
                      )}
                      data-testid="canvas-channel-oauth-connected"
                    >
                      {channelInfo.thumbnail_url ? (
                        <img
                          src={channelInfo.thumbnail_url}
                          alt={channelInfo.channel_title}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-success-dark truncate">
                          {channelInfo.channel_title}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {channelInfo.subscriber_count
                            ? `${Number(channelInfo.subscriber_count).toLocaleString("tr-TR")} abone`
                            : null}
                          {channelInfo.subscriber_count &&
                          channelInfo.video_count
                            ? " · "
                            : null}
                          {channelInfo.video_count
                            ? `${Number(channelInfo.video_count).toLocaleString("tr-TR")} video`
                            : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {ytStatus.scope_ok === false ? (
                    <div
                      className="rounded-md border border-warning/30 bg-warning-light/40 px-3 py-2 text-xs text-warning-dark"
                      data-testid="canvas-channel-oauth-scope-warn"
                    >
                      Mevcut token yetersiz izinlerle alınmış. Lütfen
                      bağlantıyı kesip yeniden bağlanın.
                    </div>
                  ) : null}

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-success-dark">
                      OAuth token mevcut — yayınlama hazır.
                    </span>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={revokeMutation.isPending}
                      className={cn(
                        "ml-auto px-3 py-1.5 rounded-md text-xs font-semibold",
                        "bg-error text-white hover:bg-error-dark",
                        revokeMutation.isPending
                          ? "opacity-60 cursor-not-allowed"
                          : "cursor-pointer",
                      )}
                      data-testid="canvas-channel-oauth-disconnect"
                    >
                      {revokeMutation.isPending
                        ? "..."
                        : "Bağlantıyı Kes"}
                    </button>
                  </div>
                </>
              ) : channelCreds?.has_credentials ? (
                <>
                  <p className="m-0 text-xs text-neutral-600">
                    Bu kanalı YouTube&apos;a bağlamak için OAuth2
                    yetkilendirmesi gereklidir.
                  </p>
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting}
                    className={cn(
                      "self-start px-4 py-2 rounded-md text-sm font-semibold",
                      connecting
                        ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                        : "bg-brand-600 text-white hover:bg-brand-700",
                    )}
                    data-testid="canvas-channel-oauth-connect"
                  >
                    {connecting
                      ? "Yönlendiriliyor..."
                      : "YouTube Bağlantısı Başlat"}
                  </button>
                </>
              ) : (
                <p
                  className="m-0 text-xs text-neutral-500"
                  data-testid="canvas-channel-oauth-needs-creds"
                >
                  Önce yandaki bölümden API kimlik bilgilerini girin.
                </p>
              )}
              {connectError ? (
                <p className="m-0 text-xs text-error-dark">{connectError}</p>
              ) : null}
              {revokeMutation.isSuccess ? (
                <p className="m-0 text-xs text-success-dark">
                  Bağlantı başarıyla kesildi.
                </p>
              ) : null}
            </div>
          </section>

          {/* Related projects card */}
          <section
            className="rounded-xl border border-border-subtle bg-surface-card shadow-sm overflow-hidden"
            data-testid="canvas-channel-projects"
          >
            <header className="px-5 py-3 border-b border-border-subtle bg-neutral-50/50 flex items-center gap-2">
              <p className="m-0 text-sm font-semibold text-neutral-800">
                Bu Kanalın Projeleri
              </p>
              <span className="ml-auto text-[11px] text-neutral-500">
                {projectRows.length} proje
              </span>
            </header>
            {projectRows.length === 0 ? (
              <div
                className="px-5 py-8 text-center"
                data-testid="canvas-channel-projects-empty"
              >
                <p className="m-0 text-xs text-neutral-500">
                  Bu kanalda henüz proje yok.
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/user/create/video")}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-semibold",
                      "bg-brand-600 text-white hover:bg-brand-700",
                    )}
                    data-testid="canvas-channel-projects-create-video"
                  >
                    + Video Oluştur
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/user/create/bulletin")}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-semibold",
                      "border border-border-subtle bg-transparent",
                      "hover:bg-brand-50 hover:border-brand-400",
                    )}
                    data-testid="canvas-channel-projects-create-bulletin"
                  >
                    + Bülten Oluştur
                  </button>
                </div>
              </div>
            ) : (
              <ul
                className="list-none m-0 p-0 divide-y divide-border-subtle"
                data-testid="canvas-channel-projects-list"
              >
                {projectRows.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/user/projects/${p.id}`}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3 no-underline",
                        "hover:bg-brand-50/40 transition-colors",
                      )}
                      data-testid={`canvas-channel-project-${p.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="m-0 text-sm font-semibold text-neutral-800 truncate">
                          {p.title}
                        </p>
                        <p className="m-0 mt-0.5 text-[11px] text-neutral-500 flex items-center gap-2">
                          <span lang="en" className="uppercase font-mono tracking-wider">
                            {p.module_type}
                          </span>
                          <span>&middot;</span>
                          <span>{p.content_status}</span>
                          {p.deadline_at ? (
                            <>
                              <span>&middot;</span>
                              <span>
                                deadline{" "}
                                {new Date(p.deadline_at).toLocaleDateString(
                                  "tr-TR",
                                )}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-brand-600">
                        {p.publish_status}
                      </span>
                    </Link>
                  </li>
                ))}
                {projectRows.length > 8 ? (
                  <li
                    className="px-5 py-2 text-center"
                    data-testid="canvas-channel-projects-more"
                  >
                    <Link
                      to="/user/projects"
                      className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                    >
                      Tüm projeler ({projectRows.length}) &rarr;
                    </Link>
                  </li>
                ) : null}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------

type HealthState = "ok" | "warn" | "idle";

function HealthTile({
  label,
  state,
  note,
  testId,
}: {
  label: string;
  state: HealthState;
  note: string;
  testId: string;
}) {
  const dotClass =
    state === "ok"
      ? "bg-success"
      : state === "warn"
        ? "bg-warning"
        : "bg-neutral-300";
  return (
    <div
      className="rounded-lg border border-border-subtle bg-surface-card px-3 py-2"
      data-testid={testId}
      data-state={state}
    >
      <div className="flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full", dotClass)} />
        <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          {label}
        </div>
      </div>
      <div className="mt-1 text-xs text-neutral-700 truncate">{note}</div>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </dt>
      <dd className="m-0 mt-1 text-neutral-700">{children}</dd>
    </div>
  );
}

export default CanvasChannelDetailPage;
