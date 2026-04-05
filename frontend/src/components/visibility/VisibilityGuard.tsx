import { useVisibility } from "../../hooks/useVisibility";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface VisibilityGuardProps {
  targetKey: string;
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Page-level visibility guard.
 * If the page is hidden (visible=false from backend), redirects to /admin or shows access denied.
 * While loading, shows nothing (avoids flash).
 * On backend error, graceful degradation: allows access (visible defaults to true).
 */
export function VisibilityGuard({ targetKey, children, redirectTo = "/admin" }: VisibilityGuardProps) {
  const { visible, isLoading } = useVisibility(targetKey);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !visible) {
      navigate(redirectTo, { replace: true });
    }
  }, [isLoading, visible, navigate, redirectTo]);

  if (isLoading) {
    return null; // no flash while checking
  }

  if (!visible) {
    return null; // redirect is happening
  }

  return <>{children}</>;
}
