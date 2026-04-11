/**
 * UserYouTubeCallbackPage — User-panel YouTube OAuth callback.
 *
 * Handles the OAuth2 redirect from Google for per-channel connections.
 * The `state` query param carries the channel_profile_id.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn";
import { ActionButton } from "../../components/design-system/primitives";
import { api, ApiError } from "../../api/client";

export function UserYouTubeCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("YouTube yetkilendirmesi isleniyor...");
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state"); // channel_profile_id

    if (error) {
      setStatus("error");
      setMessage(`Google yetkilendirme hatasi: ${error}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("Authorization code bulunamadi.");
      return;
    }

    const redirectUri = `${window.location.origin}/user/settings/youtube-callback`;

    api
      .post<{ status?: string; message?: string }>(
        "/api/v1/publish/youtube/auth-callback",
        {
          code,
          redirect_uri: redirectUri,
          channel_profile_id: state || undefined,
        },
      )
      .then((data) => {
        if (data?.status === "scope_warning") {
          setStatus("error");
          setMessage(data.message || "Yetersiz izin alindi.");
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
            navigate(
              state ? `/user/channels/${state}` : "/user/channels",
              { replace: true },
            );
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
  }, [searchParams, navigate]);

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

  return (
    <div className="flex justify-center items-center min-h-[60vh] p-8">
      <div
        className={cn(
          "max-w-[480px] w-full p-8 rounded-xl border text-center",
          bgClass,
        )}
      >
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
              onClick={() => navigate("/user/channels", { replace: true })}
            >
              Kanallara Don
            </ActionButton>
          </div>
        )}
      </div>
    </div>
  );
}
