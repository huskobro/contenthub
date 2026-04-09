/**
 * YouTube OAuth Callback Page — M9-B.
 *
 * Google OAuth2 redirect sonrasi bu sayfaya donus yapilir.
 * URL'deki ?code= parametresini alir ve backend /auth-callback endpoint'ine gonderir.
 * Basarili olursa ayarlar sayfasina yonlendirir.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn";
import { ActionButton } from "../../components/design-system/primitives";
import { api, ApiError } from "../../api/client";

export function YouTubeCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("YouTube yetkilendirmesi isleniyor...");
  // StrictMode'da useEffect iki kez çalışır — code tek kullanımlık olduğu için guard gerekli
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(`Google yetkilendirme hatasi: ${error}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("Authorization code bulunamadi. Google'dan gecerli bir yonlendirme yapilmamis olabilir.");
      return;
    }

    // Backend'e code'u gonder
    const redirectUri = `${window.location.origin}/admin/settings/youtube-callback`;

    api.post<{ status?: string; message?: string }>("/api/v1/publish/youtube/auth-callback", {
      code,
      redirect_uri: redirectUri,
    })
      .then((data) => {
        if (data?.status === "scope_warning") {
          setStatus("error");
          setMessage(
            data.message ||
            "Yetersiz izin alindi. Google hesap ayarlarinizdan eski erisimi kaldirip tekrar baglanin."
          );
          return;
        }
        setStatus("success");
        setMessage("YouTube baglantisi basariyla kuruldu!");
        // Popup ise kapat + ana pencereyi bilgilendir, değilse yönlendir
        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage({ type: "youtube-oauth-success" }, window.location.origin);
            window.close();
          } else {
            navigate("/admin/settings", { replace: true });
          }
        }, 1500);
      })
      .catch((err: unknown) => {
        const message = err instanceof ApiError ? err.detail ?? err.message : err instanceof Error ? err.message : String(err);
        setStatus("error");
        setMessage(`Token degisimi basarisiz: ${message}`);
      });
  }, [searchParams, navigate]);

  const bgClass = status === "success" ? "bg-success-light border-success-light" : status === "error" ? "bg-error-light border-error-light" : "bg-neutral-50 border-border-subtle";
  const textClass = status === "success" ? "text-success-text" : status === "error" ? "text-error-text" : "text-neutral-700";

  return (
    <div className="flex justify-center items-center min-h-[60vh] p-8">
      <div
        className={cn(
          "max-w-[480px] w-full p-8 rounded-xl border text-center",
          bgClass
        )}
      >
        <div className="text-2xl mb-4">
          {status === "processing" && "⏳"}
          {status === "success" && "✅"}
          {status === "error" && "❌"}
        </div>

        <h2
          className={cn(
            "text-xl font-semibold mb-3",
            textClass
          )}
        >
          {status === "processing" && "YouTube Yetkilendirmesi"}
          {status === "success" && "Baglanti Basarili"}
          {status === "error" && "Baglanti Hatasi"}
        </h2>

        <p
          className={cn(
            "text-md leading-relaxed",
            textClass
          )}
        >
          {message}
        </p>

        {status === "error" && (
          <div className="mt-4">
            <ActionButton
              variant="primary"
              onClick={() => navigate("/admin/settings", { replace: true })}
            >
              Ayarlara Don
            </ActionButton>
          </div>
        )}
      </div>
    </div>
  );
}
