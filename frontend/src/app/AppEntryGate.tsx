import { Navigate } from "react-router-dom";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import { useAuthStore } from "../stores/authStore";

/**
 * App entry gate: decides where to send the user after landing on "/".
 *
 * Order of concerns (auth bootstrap fix):
 *   1. Wait for auth store hydration (`hasHydrated === true`).
 *   2. If not authenticated → `/login`. No API calls are made before this
 *      point, so an unauthenticated visitor never triggers a stray 401 on
 *      `/api/v1/onboarding/status`.
 *   3. Only once authenticated do we fetch onboarding status and route to
 *      `/onboarding` or `/user` accordingly.
 *
 * This inversion — auth first, onboarding second — removes the original
 * refresh bounce where the onboarding query ran in parallel with guard
 * evaluation and could force a logout before hydration completed.
 */
export function AppEntryGate() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userRole = useAuthStore((s) => s.user?.role ?? null);

  // Step 1 — wait for auth bootstrap.
  if (!hasHydrated) {
    return (
      <div
        className="flex items-center justify-center min-h-screen text-neutral-600 text-lg"
        data-testid="app-entry-bootstrapping"
        aria-busy="true"
      >
        Yukleniyor...
      </div>
    );
  }

  // Step 2 — unauthenticated visitors never hit protected APIs.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Step 3 — authenticated: now (and only now) consult onboarding status.
  return <AuthenticatedEntryRedirect role={userRole} />;
}

/**
 * Split out so that `useOnboardingStatus` only mounts after the store has
 * confirmed an authenticated user — guaranteeing the request carries an
 * Authorization header and never races with hydration.
 *
 * Role-aware default (F1 fix — critical UX navigation pack):
 *   - admin → /admin  (operators land on the admin cockpit)
 *   - anything else → /user  (creators land on the canvas workspace)
 *
 * Onboarding still takes precedence for first-run users regardless of role.
 */
function AuthenticatedEntryRedirect({ role }: { role: string | null }) {
  const { data, isLoading, isError } = useOnboardingStatus();

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen text-neutral-600 text-lg"
        data-testid="app-entry-onboarding-loading"
        aria-busy="true"
      >
        Yukleniyor...
      </div>
    );
  }

  // Onboarding is a first-run flow; it wins over role-based defaults.
  if (!isError && data && data.onboarding_required) {
    return <Navigate to="/onboarding" replace />;
  }

  // Role-aware default landing: admin → admin panel, users → user panel.
  const defaultPath = role === "admin" ? "/admin" : "/user";
  return <Navigate to={defaultPath} replace />;
}
