/**
 * AuroraInternalErrorPage — Aurora 500 / unexpected-error sayfası.
 *
 * Shell-less; route bazlı bir route'a bağlı değil — App-level error
 * boundary veya `/error` route'u tarafından kullanılabilir. Surface
 * override key: `auth.500`.
 */
import { useNavigate } from "react-router-dom";
import { AuroraButton, AuroraCard, AuroraStatusChip } from "./primitives";

export function AuroraInternalErrorPage() {
  const navigate = useNavigate();

  return (
    <div
      data-surface="aurora"
      data-testid="aurora-500-page"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "radial-gradient(ellipse at top left, rgba(225,90,90,0.18), transparent 55%), radial-gradient(ellipse at bottom right, rgba(176,122,216,0.14), transparent 60%), var(--bg-canvas)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 460 }}>
        <AuroraCard pad="default" style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 12 }}>
            <AuroraStatusChip tone="danger">aurora · 500</AuroraStatusChip>
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono, var(--font-sans))",
              fontSize: 88,
              lineHeight: 1,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              color: "var(--state-danger-fg, var(--text-primary))",
              marginBottom: 14,
            }}
          >
            500
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: "var(--text-primary)",
              fontFamily: "var(--font-display, var(--font-sans))",
              letterSpacing: "-0.01em",
            }}
          >
            Beklenmeyen bir hata oluştu
          </h1>
          <p
            style={{
              margin: "8px 0 22px",
              fontSize: 13,
              color: "var(--text-muted)",
              lineHeight: 1.55,
            }}
          >
            Sunucuda bir sorun var. Sayfayı yenilemeyi veya birkaç dakika
            sonra tekrar denemeyi deneyin. Sorun devam ederse sistem
            yöneticinizle iletişime geçin.
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <AuroraButton
              variant="primary"
              size="md"
              onClick={() => window.location.reload()}
              data-testid="aurora-500-reload"
            >
              Yeniden Dene
            </AuroraButton>
            <AuroraButton
              variant="secondary"
              size="md"
              onClick={() => navigate("/")}
              data-testid="aurora-500-home"
            >
              Anasayfaya dön
            </AuroraButton>
          </div>
        </AuroraCard>
      </div>
    </div>
  );
}
