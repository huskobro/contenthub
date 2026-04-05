/**
 * YouTube OAuth Callback Page — M9-B.
 *
 * Google OAuth2 redirect sonrasi bu sayfaya donus yapilir.
 * URL'deki ?code= parametresini alir ve backend /auth-callback endpoint'ine gonderir.
 * Basarili olursa ayarlar sayfasina yonlendirir.
 */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { colors, radius, spacing, typography } from "../../components/design-system/tokens";
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

  const bgColor = status === "success" ? colors.success.light : status === "error" ? colors.error.light : colors.neutral[50];
  const textColor = status === "success" ? colors.success.text : status === "error" ? colors.error.text : colors.neutral[700];
  const borderColor = status === "success" ? colors.success.light : status === "error" ? colors.error.light : colors.border.subtle;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        padding: spacing[8],
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          padding: spacing[8],
          borderRadius: radius.xl,
          border: `1px solid ${borderColor}`,
          background: bgColor,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: typography.size["2xl"], marginBottom: spacing[4] }}>
          {status === "processing" && "⏳"}
          {status === "success" && "✅"}
          {status === "error" && "❌"}
        </div>

        <h2
          style={{
            fontSize: typography.size.xl,
            fontWeight: typography.weight.semibold,
            color: textColor,
            marginBottom: spacing[3],
          }}
        >
          {status === "processing" && "YouTube Yetkilendirmesi"}
          {status === "success" && "Baglanti Basarili"}
          {status === "error" && "Baglanti Hatasi"}
        </h2>

        <p
          style={{
            fontSize: typography.size.md,
            color: textColor,
            lineHeight: typography.lineHeight.relaxed,
          }}
        >
          {message}
        </p>

        {status === "error" && (
          <div style={{ marginTop: spacing[4] }}>
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
