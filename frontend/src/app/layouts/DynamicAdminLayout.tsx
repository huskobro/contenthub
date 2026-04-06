/**
 * DynamicAdminLayout — Selects Classic or Horizon layout based on active theme
 *
 * Reads the active theme's layoutMode to decide which layout shell to render.
 * This allows themes to control not just colors but the entire UI structure.
 */

import { useThemeStore } from "../../stores/themeStore";
import { AdminLayout } from "./AdminLayout";
import { HorizonAdminLayout } from "./HorizonAdminLayout";

export function DynamicAdminLayout() {
  const activeTheme = useThemeStore((s) => s.activeTheme);
  const theme = activeTheme();
  const layoutMode = theme.layoutMode || "classic";

  if (layoutMode === "horizon") {
    return <HorizonAdminLayout />;
  }

  return <AdminLayout />;
}
