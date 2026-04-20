/**
 * AuroraSessionExpiredPage — oturum süresi dolduğunda gösterilen Aurora
 * shell-less sayfası. Surface override key: `auth.session-expired`.
 *
 * Davranış: kullanıcıya bilgi verir + "Tekrar giriş yap" CTA'sı
 * /login'e yönlendirir. Mevcut auth state'in temizlenmesi auth-store
 * tarafından zaten yapılır; burada redirect yeterli.
 */
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { AuroraButton, AuroraCard, AuroraStatusChip } from "./primitives";
import { Icon } from "./icons";

export function AuroraSessionExpiredPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  function handleRelogin() {
    // Defansif: store'da hala stale token varsa temizle, sonra /login.
    try {
      logout?.();
    } catch {
      /* noop */
    }
    navigate("/login", { replace: true });
  }

  return (
    <div
      data-surface="aurora"
      data-testid="aurora-session-expired-page"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "radial-gradient(ellipse at top, rgba(232,184,122,0.16), transparent 55%), radial-gradient(ellipse at bottom right, rgba(176,122,216,0.14), transparent 60%), var(--bg-canvas)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <AuroraCard pad="default" style={{ textAlign: "center" }}>
          <div
            aria-hidden="true"
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--state-warning-bg, rgba(232,184,122,0.14))",
              border: "2px solid var(--state-warning-fg, var(--accent-tertiary))",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 14px",
              color: "var(--state-warning-fg, var(--accent-tertiary))",
            }}
          >
            <Icon name="clock" size={22} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <AuroraStatusChip tone="warning">oturum sona erdi</AuroraStatusChip>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              fontFamily: "var(--font-display, var(--font-sans))",
              letterSpacing: "-0.01em",
            }}
          >
            Oturumunuzun süresi doldu
          </h1>
          <p
            style={{
              margin: "8px 0 22px",
              fontSize: 13,
              color: "var(--text-muted)",
              lineHeight: 1.55,
            }}
          >
            Güvenlik için oturum sonlandırıldı. Devam etmek için lütfen
            yeniden giriş yapın.
          </p>
          <AuroraButton
            variant="primary"
            size="md"
            onClick={handleRelogin}
            style={{ width: "100%", justifyContent: "center" }}
            data-testid="aurora-session-relogin"
          >
            Tekrar giriş yap
          </AuroraButton>
        </AuroraCard>
      </div>
    </div>
  );
}
