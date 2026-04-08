/**
 * LoginPage — Faz 4.
 *
 * Login and register form. On success, redirects to /user.
 * Uses authStore for authentication state.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { cn } from "../lib/cn";

type Mode = "login" | "register";

export function LoginPage() {
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
      navigate("/user", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata olustu");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-[400px]">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 font-heading tracking-[-0.02em]">
            ContentHub
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {mode === "login"
              ? "Hesabiniza giris yapin"
              : "Yeni hesap olusturun"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-card border border-border-subtle rounded-xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error banner */}
            {error && (
              <div className="py-2.5 px-3.5 rounded-lg text-sm bg-error-light text-error-text border border-error/20">
                {error}
              </div>
            )}

            {/* Display name (register only) */}
            {mode === "register" && (
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium text-neutral-700 mb-1.5"
                >
                  Gorunen Ad
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Adiniz Soyadiniz"
                  className={cn(
                    "w-full py-2.5 px-3 border border-border rounded-lg text-base bg-surface-card text-neutral-800 outline-none",
                    "transition-all duration-fast",
                    "focus:border-brand-400 focus:ring-[3px] focus:ring-brand-100",
                  )}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-700 mb-1.5"
              >
                E-posta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="ornek@email.com"
                className={cn(
                  "w-full py-2.5 px-3 border border-border rounded-lg text-base bg-surface-card text-neutral-800 outline-none",
                  "transition-all duration-fast",
                  "focus:border-brand-400 focus:ring-[3px] focus:ring-brand-100",
                )}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700 mb-1.5"
              >
                Sifre
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="********"
                className={cn(
                  "w-full py-2.5 px-3 border border-border rounded-lg text-base bg-surface-card text-neutral-800 outline-none",
                  "transition-all duration-fast",
                  "focus:border-brand-400 focus:ring-[3px] focus:ring-brand-100",
                )}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-2.5 px-4 rounded-lg text-base font-medium border leading-[1.5] transition-all duration-fast",
                "bg-gradient-to-br from-brand-600 to-brand-700 text-white border-brand-600",
                "hover:from-brand-700 hover:to-brand-800 hover:shadow-sm",
                loading && "opacity-50 cursor-not-allowed",
                !loading && "cursor-pointer",
              )}
            >
              {loading
                ? "..."
                : mode === "login"
                  ? "Giris Yap"
                  : "Hesap Olustur"}
            </button>
          </form>

          {/* Mode switch */}
          <div className="mt-4 text-center text-sm text-neutral-500">
            {mode === "login" ? (
              <>
                Hesabiniz yok mu?{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-brand-600 font-medium bg-transparent border-none cursor-pointer hover:text-brand-700 transition-colors duration-fast"
                >
                  Hesap olustur
                </button>
              </>
            ) : (
              <>
                Zaten hesabiniz var mi?{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-brand-600 font-medium bg-transparent border-none cursor-pointer hover:text-brand-700 transition-colors duration-fast"
                >
                  Giris yap
                </button>
              </>
            )}
          </div>
        </div>

        {/* Admin link */}
        <div className="mt-6 text-center">
          <a
            href="/admin"
            className="text-xs text-neutral-400 no-underline hover:text-neutral-600 transition-colors duration-fast"
          >
            Admin Paneli
          </a>
        </div>
      </div>
    </div>
  );
}
