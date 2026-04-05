/**
 * YouTube OAuth Callback Page — M9-B.
 *
 * Google OAuth2 redirect sonrasi bu sayfaya donus yapilir.
 * URL'deki ?code= parametresini alir ve backend /auth-callback endpoint'ine gonderir.
 * Basarili olursa ayarlar sayfasina yonlendirir.
 */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

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

  const bgColor = status === "success" ? "#f0fdf4" : status === "error" ? "#fef2f2" : "#f8fafc";
  const textColor = status === "success" ? "#166534" : status === "error" ? "#991b1b" : "#475569";
  const borderColor = status === "success" ? "#bbf7d0" : status === "error" ? "#fecaca" : "#e2e8f0";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          padding: "2rem",
          borderRadius: "12px",
          border: `1px solid ${borderColor}`,
          background: bgColor,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>
          {status === "processing" && "⏳"}
          {status === "success" && "✅"}
          {status === "error" && "❌"}
        </div>

        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            color: textColor,
            marginBottom: "0.75rem",
          }}
        >
          {status === "processing" && "YouTube Yetkilendirmesi"}
          {status === "success" && "Baglanti Basarili"}
          {status === "error" && "Baglanti Hatasi"}
        </h2>

        <p
          style={{
            fontSize: "0.875rem",
            color: textColor,
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>

        {status === "error" && (
          <button
            onClick={() => navigate("/admin/settings", { replace: true })}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1.25rem",
              background: "#1e40af",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: 500,
            }}
          >
            Ayarlara Don
          </button>
        )}
      </div>
    </div>
  );
}
