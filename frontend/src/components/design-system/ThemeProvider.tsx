/**
 * ThemeProvider — Wave 1 Final + Surface Registry (Faz 1)
 *
 * React component that applies the active theme's CSS variables to the DOM.
 * Place this at the top of the component tree (in layouts).
 *
 * Faz 1 extension:
 *   - ThemeProvider now also mounts the <SurfaceProvider>.
 *   - An inner component (ThemeSurfaceBinder) reads the surface context and
 *     re-applies the theme whenever the resolved surface changes, so
 *     surface-level token overrides flow through the single
 *     `applyThemeToDOM` entrypoint.
 *   - Because SurfaceProvider is always mounted by this component, the
 *     binder can safely call useSurfaceContext() without guards.
 *   - Pre-Faz-1 behavior is preserved: when the kill switch is OFF, the
 *     resolver returns legacy/horizon based on theme.layoutMode, and
 *     tokenOverrides are null (legacy/horizon have no overrides).
 */

import { useEffect } from "react";
import { useThemeStore } from "../../stores/themeStore";
import { applyThemeToDOM } from "./themeEngine";
// IMPORTANT: import from the context module directly (not the barrel) so the
// module graph does not pull in surfaces/manifests/register.ts. Built-in
// surfaces are registered at top-level via DynamicAdminLayout /
// DynamicUserLayout, which live above ThemeProvider in the router tree.
import { SurfaceProvider, useSurfaceContext } from "../../surfaces/SurfaceContext";

function ThemeSurfaceBinder({ children }: { children: React.ReactNode }) {
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const activeTheme = useThemeStore((s) => s.activeTheme);
  const ctx = useSurfaceContext();

  const adminSurfaceId = ctx.admin.surface.manifest.id;
  const adminOverrides = ctx.admin.surface.tokenOverrides ?? null;

  useEffect(() => {
    const theme = activeTheme();
    applyThemeToDOM(theme, {
      surfaceId: adminSurfaceId,
      surfaceOverrides: adminOverrides,
    });
  }, [activeThemeId, activeTheme, adminSurfaceId, adminOverrides]);

  return <>{children}</>;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <SurfaceProvider>
      <ThemeSurfaceBinder>{children}</ThemeSurfaceBinder>
    </SurfaceProvider>
  );
}
