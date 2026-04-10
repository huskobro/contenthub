/**
 * DynamicAdminLayout — Surface Registry aware (Faz 1)
 *
 * Before Faz 1: switched between AdminLayout and HorizonAdminLayout based on
 * `theme.layoutMode`.
 *
 * After Faz 1:
 *  - Calls `useSurfaceResolution` directly (not through context), because
 *    this component renders at the router level — ABOVE the layout tree that
 *    mounts ThemeProvider / SurfaceProvider.
 *  - When the Surface Registry kill switch is OFF (default), the resolver
 *    short-circuits to legacy/horizon using the active theme's layoutMode,
 *    so behavior is identical to the pre-Faz-1 implementation.
 *  - When the kill switch is ON, the resolver additionally consults
 *    user preference → role default → global default → legacy.
 *  - If the resolved surface has no adminLayout (should never happen because
 *    the resolver filters on scope), we fall back to legacy as a hard safety
 *    net.
 */

import { useSurfaceResolution } from "../../surfaces/useSurfaceResolution";
// Import the surfaces barrel for its registration side-effect. This is the
// first router-level consumer of the registry, so by importing here we
// guarantee built-in surfaces are registered exactly once before the
// resolver ever runs. The barrel does NOT pull in ThemeProvider, so there
// is no circular dependency with AdminLayout.
import "../../surfaces";
import { AdminLayout } from "./AdminLayout";

export function DynamicAdminLayout() {
  const { admin } = useSurfaceResolution();
  const Layout = admin.surface.adminLayout;
  const surfaceId = admin.surface.manifest.id;

  if (!Layout) {
    return <AdminLayout key="legacy-safety" />;
  }

  // key=surfaceId forces React to remount when the surface changes, so
  // outgoing layout effects get properly torn down.
  return <Layout key={surfaceId} />;
}
