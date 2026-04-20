/**
 * AuroraLoginPage — minimal cockpit auth surface.
 *
 * Aurora Dusk Cockpit'in shell-less sayfalarından biri: rail/ctxbar/
 * statusbar yok — sadece full-bleed gradient zemin üzerinde ortalanmış
 * tek kart. Kart içinde marka, e-posta + şifre + giriş butonu, küçük
 * "Şifremi unuttum" linki ve mod değiştirici (kayıt ol).
 *
 * Davranış (login/register, redirect, hata) legacy LoginPage ile birebir
 * aynı — sadece görsel kabuk Aurora token'larına geçiyor.
 *
 * Tüm scoped Aurora stilleri için kök `<div>` üstüne `data-surface="aurora"`
 * konuyor; bu olmadan `cockpit.css`'teki .card / .btn / .form-input vb.
 * class'lar uygulanmaz.
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { AuroraButton, AuroraCard, AuroraStatusChip } from "./primitives";

type Mode = "login" | "register";

export function AuroraLoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
      const role = useAuthStore.getState().user?.role ?? null;
      navigate(role === "admin" ? "/admin" : "/user", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
  }

  return (
    <div
      data-surface="aurora"
      data-testid="aurora-login-page"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "radial-gradient(ellipse at top, rgba(176,122,216,0.18), transparent 55%), radial-gradient(ellipse at bottom right, rgba(59,200,184,0.16), transparent 60%), var(--bg-canvas)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Brand mark */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              margin: "0 auto 14px",
              display: "grid",
              placeItems: "center",
              background: "var(--gradient-brand, var(--accent-primary))",
              color: "var(--text-on-accent)",
              fontFamily: "var(--font-display, var(--font-sans))",
              fontWeight: 600,
              fontSize: 16,
              boxShadow: "var(--glow-accent, 0 0 0 1px rgba(59,200,184,0.4))",
            }}
          >
            CH
          </div>
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: 18,
              letterSpacing: "-0.01em",
              color: "var(--text-primary)",
            }}
          >
            ContentHub
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {mode === "login"
              ? "Hesabınıza giriş yapın"
              : "Yeni hesap oluşturun"}
          </div>
        </div>

        <AuroraCard pad="default">
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ marginBottom: 14 }}>
                <AuroraStatusChip tone="danger">{error}</AuroraStatusChip>
              </div>
            )}

            {mode === "register" && (
              <div className="form-field">
                <label className="form-label" htmlFor="aurora-login-name">
                  Görünen Ad
                </label>
                <input
                  id="aurora-login-name"
                  className="form-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Adınız Soyadınız"
                />
              </div>
            )}

            <div className="form-field">
              <label className="form-label" htmlFor="aurora-login-email">
                E-posta
              </label>
              <input
                id="aurora-login-email"
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="ornek@email.com"
                data-testid="aurora-login-email"
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="aurora-login-password">
                Şifre
              </label>
              <input
                id="aurora-login-password"
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="********"
                data-testid="aurora-login-password"
              />
            </div>

            <AuroraButton
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center" }}
              data-testid="aurora-login-submit"
            >
              {loading
                ? "..."
                : mode === "login"
                  ? "Giriş Yap"
                  : "Hesap Oluştur"}
            </AuroraButton>

            {mode === "login" && (
              <div style={{ marginTop: 12, textAlign: "center" }}>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                  }}
                >
                  Şifremi unuttum
                </Link>
              </div>
            )}
          </form>

          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: "1px solid var(--border-subtle)",
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {mode === "login" ? "Hesabınız yok mu? " : "Zaten hesabınız var mı? "}
            <button
              type="button"
              onClick={switchMode}
              style={{
                color: "var(--accent-primary-hover)",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {mode === "login" ? "Hesap oluştur" : "Giriş yap"}
            </button>
          </div>
        </AuroraCard>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <a
            href="/admin"
            style={{
              fontSize: 11,
              color: "var(--text-disabled)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Admin Paneli
          </a>
        </div>
      </div>
    </div>
  );
}
