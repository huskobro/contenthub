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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          color: "#64748b",
          fontSize: "0.9375rem",
        }}
      >
        Yukleniyor...
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
