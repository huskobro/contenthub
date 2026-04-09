/**
 * AuthGuard — Sprint 1 hardening.
 *
 * Wraps route trees to enforce authentication and optional role checks.
 * Redirects unauthenticated users to /login.
 * Redirects unauthorized users (wrong role) to their appropriate panel.
 */

import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

interface AuthGuardProps {
  /** If set, user.role must match this value */
  requiredRole?: string;
}

export function AuthGuard({ requiredRole }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

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
