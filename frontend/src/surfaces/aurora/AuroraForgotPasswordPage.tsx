/**
 * AuroraForgotPasswordPage — production şifre sıfırlama akışı.
 *
 * Override key: `auth.forgot-password`.
 *
 * Akış (iki aşama):
 *   1) Kullanıcı e-postayı gönderir → /api/v1/auth/forgot-password
 *      Backend her zaman 200 döner (e-posta varlığı sızdırılmaz). Localhost
 *      MVP modunda reset_token response body içinde gelir; formu otomatik
 *      "reset" aşamasına geçiririz. Production'da reset_token=null gelir,
 *      kullanıcıya "e-postanızı kontrol edin" denir.
 *   2) Kullanıcı yeni şifreyi girip onaylar → /api/v1/auth/reset-password
 *      Başarı sonrası login ekranına yönlenir.
 *
 * Sayfa tamamen gerçek backend mutation'larına bağlıdır — setTimeout/mock yok.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  requestPasswordReset,
  confirmPasswordReset,
  type ForgotPasswordResponse,
  type ResetPasswordResponse,
} from "../../api/authApi";
import { AuroraButton, AuroraCard, AuroraStatusChip } from "./primitives";
import { Icon } from "./icons";

type Stage = "request" | "reset" | "done";

export function AuroraForgotPasswordPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("request");

  // Stage 1 — request
  const [email, setEmail] = useState("");

  // Stage 2 — reset
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const requestMut = useMutation<ForgotPasswordResponse, Error, string>({
    mutationFn: (targetEmail) => requestPasswordReset(targetEmail),
    onSuccess: (res) => {
      setError(null);
      setEmailMessage(res.message);
      if (res.reset_token) {
        // Localhost/dev mode: token arrived in response, go straight to reset.
        setToken(res.reset_token);
        setStage("reset");
      } else {
        // Production mode: token arrives via email; the user must re-enter it.
        setStage("reset");
      }
    },
    onError: (err) => {
      setError(err.message || "İstek gönderilemedi.");
    },
  });

  const confirmMut = useMutation<
    ResetPasswordResponse,
    Error,
    { token: string; newPassword: string }
  >({
    mutationFn: ({ token: t, newPassword: p }) => confirmPasswordReset(t, p),
    onSuccess: () => {
      setError(null);
      setStage("done");
    },
    onError: (err) => {
      setError(err.message || "Şifre güncellenemedi.");
    },
  });

  function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("E-posta adresinizi girin.");
      return;
    }
    requestMut.mutate(email.trim());
  }

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token.trim()) {
      setError("Sıfırlama kodunu girin.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    confirmMut.mutate({ token: token.trim(), newPassword });
  }

  return (
    <div
      data-surface="aurora"
      data-testid="aurora-forgot-password-page"
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
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: 16,
              letterSpacing: "-0.01em",
            }}
          >
            ContentHub
          </div>
          <div style={{ marginTop: 4 }}>
            <AuroraStatusChip tone="info">
              {stage === "done" ? "şifre güncellendi" : "şifre sıfırlama"}
            </AuroraStatusChip>
          </div>
        </div>
        <AuroraCard pad="default">
          {stage === "done" ? (
            <div style={{ textAlign: "center" }}>
              <div
                aria-hidden="true"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "var(--state-success-bg, rgba(59,200,184,0.12))",
                  border:
                    "2px solid var(--state-success-fg, var(--accent-primary))",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 14px",
                  color: "var(--state-success-fg, var(--accent-primary))",
                }}
              >
                <Icon name="check" size={22} />
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: "var(--font-display, var(--font-sans))",
                }}
              >
                Şifre güncellendi
              </h1>
              <p
                style={{
                  margin: "8px 0 18px",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  lineHeight: 1.55,
                }}
              >
                Yeni şifrenizle giriş yapabilirsiniz.
              </p>
              <AuroraButton
                variant="primary"
                size="md"
                onClick={() => navigate("/login", { replace: true })}
                style={{ width: "100%", justifyContent: "center" }}
                data-testid="aurora-forgot-to-login"
              >
                Giriş ekranına git
              </AuroraButton>
            </div>
          ) : stage === "reset" ? (
            <>
              <h1
                style={{
                  margin: "0 0 6px",
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: "var(--font-display, var(--font-sans))",
                  letterSpacing: "-0.01em",
                  textAlign: "center",
                }}
              >
                Yeni şifrenizi belirleyin
              </h1>
              <p
                style={{
                  margin: "0 0 18px",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  lineHeight: 1.55,
                  textAlign: "center",
                }}
              >
                {emailMessage ??
                  "E-posta adresinize gelen sıfırlama kodunu ve yeni şifrenizi girin."}
              </p>
              {error && (
                <div style={{ marginBottom: 14 }}>
                  <AuroraStatusChip tone="danger">{error}</AuroraStatusChip>
                </div>
              )}
              <form onSubmit={handleConfirm}>
                <div className="form-field">
                  <label className="form-label" htmlFor="aurora-forgot-token">
                    Sıfırlama kodu
                  </label>
                  <input
                    id="aurora-forgot-token"
                    className="form-input"
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    autoComplete="one-time-code"
                    placeholder="e-postanızdan gelen kod"
                    data-testid="aurora-forgot-token"
                    style={{ fontFamily: "var(--font-mono, var(--font-sans))" }}
                  />
                </div>
                <div className="form-field">
                  <label
                    className="form-label"
                    htmlFor="aurora-forgot-new-password"
                  >
                    Yeni şifre
                  </label>
                  <input
                    id="aurora-forgot-new-password"
                    className="form-input"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="en az 8 karakter"
                    data-testid="aurora-forgot-new-password"
                  />
                </div>
                <div className="form-field">
                  <label
                    className="form-label"
                    htmlFor="aurora-forgot-confirm-password"
                  >
                    Yeni şifre (tekrar)
                  </label>
                  <input
                    id="aurora-forgot-confirm-password"
                    className="form-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    data-testid="aurora-forgot-confirm-password"
                  />
                </div>
                <AuroraButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={confirmMut.isPending}
                  style={{ width: "100%", justifyContent: "center" }}
                  data-testid="aurora-forgot-confirm-submit"
                >
                  {confirmMut.isPending ? "..." : "Şifreyi güncelle"}
                </AuroraButton>
              </form>
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: "1px solid var(--border-subtle)",
                  textAlign: "center",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                Kod gelmedi mi?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setStage("request");
                    setToken("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setError(null);
                  }}
                  style={{
                    color: "var(--accent-primary-hover)",
                    fontSize: 12,
                    fontWeight: 500,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Yeniden talep et
                </button>
              </div>
            </>
          ) : (
            <>
              <h1
                style={{
                  margin: "0 0 6px",
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: "var(--font-display, var(--font-sans))",
                  letterSpacing: "-0.01em",
                  textAlign: "center",
                }}
              >
                Şifrenizi mi unuttunuz?
              </h1>
              <p
                style={{
                  margin: "0 0 18px",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  lineHeight: 1.55,
                  textAlign: "center",
                }}
              >
                Hesabınızla ilişkili e-postayı girin; sıfırlama bağlantısı
                hazırlayacağız.
              </p>
              {error && (
                <div style={{ marginBottom: 14 }}>
                  <AuroraStatusChip tone="danger">{error}</AuroraStatusChip>
                </div>
              )}
              <form onSubmit={handleRequest}>
                <div className="form-field">
                  <label className="form-label" htmlFor="aurora-forgot-email">
                    E-posta
                  </label>
                  <input
                    id="aurora-forgot-email"
                    className="form-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="ornek@email.com"
                    data-testid="aurora-forgot-email"
                  />
                </div>
                <AuroraButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={requestMut.isPending}
                  style={{ width: "100%", justifyContent: "center" }}
                  data-testid="aurora-forgot-submit"
                >
                  {requestMut.isPending ? "..." : "Sıfırlama bağlantısı gönder"}
                </AuroraButton>
              </form>
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: "1px solid var(--border-subtle)",
                  textAlign: "center",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                Hatırladınız mı?{" "}
                <Link
                  to="/login"
                  style={{
                    color: "var(--accent-primary-hover)",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  Giriş yap
                </Link>
              </div>
            </>
          )}
        </AuroraCard>
      </div>
    </div>
  );
}
