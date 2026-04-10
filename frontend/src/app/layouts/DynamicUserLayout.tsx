/**
 * DynamicUserLayout — Surface Registry aware (Faz 1)
 *
 * Mirror of DynamicAdminLayout but scoped to the user panel. See that file
 * for the full design rationale.
 */

import { useSurfaceResolution } from "../../surfaces/useSurfaceResolution";
// Mirror DynamicAdminLayout: import the surfaces barrel for registration.
import "../../surfaces";
import { UserLayout } from "./UserLayout";

export function DynamicUserLayout() {
  const { user } = useSurfaceResolution();
  const Layout = user.surface.userLayout;
  const surfaceId = user.surface.manifest.id;

  if (!Layout) {
    return <UserLayout key="legacy-safety" />;
  }

  return <Layout key={surfaceId} />;
}
