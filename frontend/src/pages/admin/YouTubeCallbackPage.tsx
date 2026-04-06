/**
 * YouTube OAuth Callback Page — M9-B.
 *
 * Google OAuth2 redirect sonrasi bu sayfaya donus yapilir.
 * URL'deki ?code= parametresini alir ve backend /auth-callback endpoint'ine gonderir.
 * Basarili olursa ayarlar sayfasina yonlendirir.
 */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn";
import { ActionButton } from "../../components/design-system/primitives";

export function YouTubeCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("YouTube yetkilendirmesi isleniyor...");

  useEffect(() => {
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

    fetch("/api/v1/publish/youtube/auth-callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.detail ?? `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(() => {
        setStatus("success");
        setMessage("YouTube baglantisi basariyla kuruldu! Ayarlar sayfasina yonlendiriliyorsunuz...");
        // 2 saniye sonra ayarlar sayfasina don
        setTimeout(() => {
          navigate("/admin/settings", { replace: true });
        }, 2000);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(`Token degisimi basarisiz: ${err.message}`);
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
