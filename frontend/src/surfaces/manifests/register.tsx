/**
 * Surface manifest bootstrap — attaches layout bindings to metadata-only
 * manifests and registers the resulting surfaces.
 *
 * Faz 1 — Infrastructure only.
 *
 * CIRCULAR IMPORT DEFENSE:
 *   The legacy/horizon layouts (AdminLayout, UserLayout, HorizonAdminLayout,
 *   HorizonUserLayout) mount <ThemeProvider>. ThemeProvider imports
 *   SurfaceContext, which imports useSurfaceResolution. If this module is
 *   pulled into that chain during initial module evaluation, AdminLayout
 *   may still be `undefined` when registerSurface validates it — causing a
 *   bootstrap crash.
 *
 *   To break the cycle, layouts are NOT dereferenced at module-eval time.
 *   Instead, each layout binding is a thin functional wrapper that reads
 *   the real layout via a `* as` namespace import at render time. Namespace
 *   imports are "live bindings" in ES modules: by the time the wrapper's
 *   body executes (at React render), the full layout module graph has been
 *   evaluated and the component reference is defined.
 */

import { registerSurface } from "../registry";
import type { Surface, SurfaceLayoutProps } from "../contract";
import { LEGACY_MANIFEST } from "./legacy";
import { HORIZON_MANIFEST } from "./horizon";
import { ATRIUM_MANIFEST } from "./atrium";
import { BRIDGE_MANIFEST } from "./bridge";
import { CANVAS_MANIFEST } from "./canvas";

// Namespace imports (live bindings). At module-eval time the namespace
// objects exist but their members may still be uninitialized if we are
// inside a circular dep — that is fine because the wrapper functions below
// only touch them at render time.
import * as AdminLayoutModule from "../../app/layouts/AdminLayout";
import * as UserLayoutModule from "../../app/layouts/UserLayout";
import * as HorizonAdminLayoutModule from "../../app/layouts/HorizonAdminLayout";
import * as HorizonUserLayoutModule from "../../app/layouts/HorizonUserLayout";

// --- Lazy forwarders -------------------------------------------------------
// Each wrapper reads the real component from the module namespace at render
// time. React sees a function component and is satisfied; the registry sees
// a non-undefined adminLayout/userLayout and the validator accepts it.

function LegacyAdminForwarder(_props: SurfaceLayoutProps) {
  const Impl = AdminLayoutModule.AdminLayout;
  return <Impl />;
}
function LegacyUserForwarder(_props: SurfaceLayoutProps) {
  const Impl = UserLayoutModule.UserLayout;
  return <Impl />;
}
function HorizonAdminForwarder(_props: SurfaceLayoutProps) {
  const Impl = HorizonAdminLayoutModule.HorizonAdminLayout;
  return <Impl />;
}
function HorizonUserForwarder(_props: SurfaceLayoutProps) {
  const Impl = HorizonUserLayoutModule.HorizonUserLayout;
  return <Impl />;
}

const LEGACY_SURFACE: Surface = {
  manifest: LEGACY_MANIFEST,
  adminLayout: LegacyAdminForwarder,
  userLayout: LegacyUserForwarder,
};

const HORIZON_SURFACE: Surface = {
  manifest: HORIZON_MANIFEST,
  adminLayout: HorizonAdminForwarder,
  userLayout: HorizonUserForwarder,
};

const ATRIUM_SURFACE: Surface = { manifest: ATRIUM_MANIFEST };
const BRIDGE_SURFACE: Surface = { manifest: BRIDGE_MANIFEST };
const CANVAS_SURFACE: Surface = { manifest: CANVAS_MANIFEST };

registerSurface(LEGACY_SURFACE);
registerSurface(HORIZON_SURFACE);
registerSurface(ATRIUM_SURFACE);
registerSurface(BRIDGE_SURFACE);
registerSurface(CANVAS_SURFACE);

/** Re-register all built-ins (used by tests after __resetSurfaceRegistry). */
export function registerBuiltinSurfaces(): void {
  registerSurface(LEGACY_SURFACE);
  registerSurface(HORIZON_SURFACE);
  registerSurface(ATRIUM_SURFACE);
  registerSurface(BRIDGE_SURFACE);
  registerSurface(CANVAS_SURFACE);
}
