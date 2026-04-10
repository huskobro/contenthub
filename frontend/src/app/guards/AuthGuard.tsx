/**
 * AuthGuard — Sprint 1 hardening + auth bootstrap fix.
 *
 * Wraps route trees to enforce authentication and optional role checks.
 * Redirects unauthenticated users to /login.
 * Redirects unauthorized users (wrong role) to their appropriate panel.
 *
 * Bootstrap contract: the guard MUST NOT make any redirect decision while
 * `hasHydrated` is `false`. In practice the Zustand store hydrates
 * synchronously inside its lazy initializer, so this flag is true on the
 * very first render in a real browser — but the explicit wait makes the
 * behaviour deterministic for tests (which can reset the store between
 * cases) and defensively protects against any future async hydration.
 */

import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

interface AuthGuardProps {
  /** If set, user.role must match this value */
  requiredRole?: string;
}

export function AuthGuard({ requiredRole }: AuthGuardProps) {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  // Wait for store bootstrap — never redirect before we know the real state.
  if (!hasHydrated) {
    return (
      <div
        className="flex items-center justify-center min-h-screen text-neutral-600 text-sm"
        data-testid="auth-guard-bootstrapping"
        aria-busy="true"
      >
        Oturum dogrulaniyor...
      </div>
    );
  }

  // Not authenticated → login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Role check (if required)
  if (requiredRole && user.role !== requiredRole) {
    // Non-admin trying to access admin → redirect to user panel
    if (requiredRole === "admin") {
      return <Navigate to="/user" replace />;
    }
    // Fallback: redirect to home
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
