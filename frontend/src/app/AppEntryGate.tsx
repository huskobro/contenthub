import { Navigate } from "react-router-dom";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";

/**
 * App entry gate: checks if onboarding is required.
 * - If required: redirects to /onboarding
 * - If not required: redirects to /user (normal app)
 * - While loading: shows a minimal loading state
 * - On error: falls through to normal app (safe fallback)
 */
export function AppEntryGate() {
  const { data, isLoading, isError } = useOnboardingStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-neutral-600 text-lg">
        Yükleniyor...
      </div>
    );
  }

  // On error or completed onboarding: go to normal app
  if (isError || !data || !data.onboarding_required) {
    return <Navigate to="/user" replace />;
  }

  // Onboarding required
  return <Navigate to="/onboarding" replace />;
}
