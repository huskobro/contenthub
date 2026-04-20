/**
 * AuroraNotFoundPage — 404 Aurora "minimal cockpit" sayfası.
 *
 * Shell-less; ortalanmış kart, büyük "404", kısa açıklama, anasayfa /
 * admin paneli butonları. Davranış legacy NotFoundPage ile aynı (route
 * yönlendirme).
 */
import { useNavigate } from "react-router-dom";
import { AuroraButton, AuroraCard, AuroraStatusChip } from "./primitives";

export function AuroraNotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      data-surface="aurora"
      data-testid="aurora-404-page"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "radial-gradient(ellipse at top right, rgba(176,122,216,0.16), transparent 55%), radial-gradient(ellipse at bottom left, rgba(232,184,122,0.12), transparent 60%), var(--bg-canvas)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 460 }}>
        <AuroraCard pad="default" style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 12 }}>
            <AuroraStatusChip tone="warning">aurora · 404</AuroraStatusChip>
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono, var(--font-sans))",
              fontSize: 88,
              lineHeight: 1,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              background: "var(--gradient-brand, var(--accent-primary))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: 14,
            }}
          >
            404
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
            Sayfa bulunamadı
          </h1>
          <p
            style={{
              margin: "8px 0 22px",
              fontSize: 13,
              color: "var(--text-muted)",
              lineHeight: 1.55,
            }}
          >
            Aradığınız sayfa mevcut değil veya taşınmış olabilir. URL'i
            kontrol edin ya da aşağıdan ana ekrana dönün.
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
              onClick={() => navigate("/")}
              data-testid="aurora-404-home"
            >
              Anasayfaya dön
            </AuroraButton>
            <AuroraButton
              variant="secondary"
              size="md"
              onClick={() => navigate("/admin")}
              data-testid="aurora-404-admin"
            >
              Yönetim Paneli
            </AuroraButton>
          </div>
        </AuroraCard>
      </div>
    </div>
  );
}
