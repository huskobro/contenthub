import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import { useAuthStore } from "../stores/authStore";

/**
 * App entry gate: checks auth state and onboarding status.
 * - If not authenticated: redirects to /login
 * - If onboarding required: redirects to /onboarding
 * - Otherwise: redirects to /user
 * - While loading: shows a minimal loading state
 * - On error: falls through to normal app (safe fallback)
 */
export function AppEntryGate() {
  const { data, isLoading, isError } = useOnboardingStatus();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  // Restore session from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-neutral-600 text-lg">
        Yukleniyor...
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // On error or completed onboarding: go to normal app
  if (isError || !data || !data.onboarding_required) {
    return <Navigate to="/user" replace />;
  }

  // Onboarding required
  return <Navigate to="/onboarding" replace />;
}
