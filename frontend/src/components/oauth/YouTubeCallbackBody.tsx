/**
 * YouTubeCallbackBody — Redesign REV-2 / P3.1 duplicate birleştirme.
 *
 * Admin + User panellerinin YouTube OAuth callback sayfalarını tek motorda
 * toplar. Mevcut ayrı sayfalar (`YouTubeCallbackPage`, `UserYouTubeCallbackPage`)
 * artık bu body'nin thin wrapper'ı — Calendar/Inbox/JobDetail çiftlerindeki
 * aynı pattern.
 *
 * Role-aware davranış `mode` prop'u ile kontrol edilir:
 *  - "admin": `state` query param'ı yok, başarı → `/admin/settings`, hata →
 *    "Yetersiz izin" uzun metni, emoji icon'lu kart.
 *  - "user": `state` query param `{channel_profile_id}:{nonce}` formatında;
 *    profile id çıkarılıp backend'e geçer; başarı → `/user/channels/:id`
 *    (yoksa `/user/channels`), hata geri dönüş "Kanallar" sayfasına.
 *
 * Kural: backend sözleşmesi değişmedi — tek endpoint
 * `/api/v1/publish/youtube/auth-callback` her iki mode'da çağrılıyor, redirect
 * URI farklı path yansıtıyor.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn";
import { ActionButton } from "../design-system/primitives";
import { api, ApiError } from "../../api/client";

type CallbackMode = "admin" | "user";

interface YouTubeCallbackBodyProps {
  /**
   * Admin mode: state param yoksayılır, redirect /admin/settings.
   * User mode: state'ten channel_profile_id çıkarılır, redirect
   *   /user/channels/:id veya /user/channels.
   */
  mode: CallbackMode;
}

export function YouTubeCallbackBody({ mode }: YouTubeCallbackBodyProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("YouTube yetkilendirmesi isleniyor...");
  // StrictMode'da useEffect iki kez çalışır — code tek kullanımlık olduğu için guard gerekli.
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // User mode: state `{channel_profile_id}:{nonce}` formatında. Admin mode:
    // state yok (yoksayılır).
    let channelProfileId: string | null = null;
    if (mode === "user") {
      const rawState = searchParams.get("state");
      if (rawState) {
        channelProfileId = rawState.includes(":")
          ? rawState.split(":", 1)[0]
          : rawState;
      }
    }

    if (error) {
      setStatus("error");
      setMessage(`Google yetkilendirme hatasi: ${error}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage(
        mode === "admin"
          ? "Authorization code bulunamadi. Google'dan gecerli bir yonlendirme yapilmamis olabilir."
          : "Authorization code bulunamadi.",
      );
      return;
    }

    const basePath = mode === "admin" ? "/admin" : "/user";
    const redirectUri = `${window.location.origin}${basePath}/settings/youtube-callback`;
    const payload: { code: string; redirect_uri: string; channel_profile_id?: string } = {
      code,
      redirect_uri: redirectUri,
    };
    if (mode === "user" && channelProfileId) {
      payload.channel_profile_id = channelProfileId;
    }

    api
      .post<{ status?: string; message?: string }>(
        "/api/v1/publish/youtube/auth-callback",
        payload,
      )
      .then((data) => {
        if (data?.status === "scope_warning") {
          setStatus("error");
          setMessage(
            data.message ||
              (mode === "admin"
                ? "Yetersiz izin alindi. Google hesap ayarlarinizdan eski erisimi kaldirip tekrar baglanin."
                : "Yetersiz izin alindi."),
          );
          return;
        }
        setStatus("success");
        setMessage("YouTube baglantisi basariyla kuruldu!");
        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage(
              { type: "youtube-oauth-success" },
              window.location.origin,
            );
            window.close();
          } else {
            if (mode === "admin") {
              navigate("/admin/settings", { replace: true });
            } else {
              navigate(
                channelProfileId ? `/user/channels/${channelProfileId}` : "/user/channels",
                { replace: true },
              );
            }
          }
        }, 1500);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof ApiError
            ? err.detail ?? err.message
            : err instanceof Error
              ? err.message
              : String(err);
        setStatus("error");
        setMessage(`Token degisimi basarisiz: ${msg}`);
      });
  }, [searchParams, navigate, mode]);

  const bgClass =
    status === "success"
      ? "bg-success-light border-success-light"
      : status === "error"
        ? "bg-error-light border-error-light"
        : "bg-neutral-50 border-border-subtle";
  const textClass =
    status === "success"
      ? "text-success-text"
      : status === "error"
        ? "text-error-text"
        : "text-neutral-700";

  const errorBackLabel = mode === "admin" ? "Ayarlara Don" : "Kanallara Don";
  const errorBackPath = mode === "admin" ? "/admin/settings" : "/user/channels";

  return (
    <div
      className="flex justify-center items-center min-h-[60vh] p-8"
      data-testid={`youtube-callback-${mode}`}
    >
      <div
        className={cn(
          "max-w-[480px] w-full p-8 rounded-xl border text-center",
          bgClass,
        )}
      >
        <div className="text-2xl mb-4" data-testid="youtube-callback-icon">
          {status === "processing" && "⏳"}
          {status === "success" && "✅"}
          {status === "error" && "❌"}
        </div>

        <h2 className={cn("text-xl font-semibold mb-3", textClass)}>
          {status === "processing" && "YouTube Yetkilendirmesi"}
          {status === "success" && "Baglanti Basarili"}
          {status === "error" && "Baglanti Hatasi"}
        </h2>

        <p className={cn("text-md leading-relaxed", textClass)}>{message}</p>

        {status === "error" && (
          <div className="mt-4">
            <ActionButton
              variant="primary"
              onClick={() => navigate(errorBackPath, { replace: true })}
            >
              {errorBackLabel}
            </ActionButton>
          </div>
        )}
      </div>
    </div>
  );
}
