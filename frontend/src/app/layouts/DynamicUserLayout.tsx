/**
 * DynamicUserLayout — Selects Classic or Horizon layout based on active theme
 */

import { useThemeStore } from "../../stores/themeStore";
import { UserLayout } from "./UserLayout";
import { HorizonUserLayout } from "./HorizonUserLayout";

export function DynamicUserLayout() {
  const activeTheme = useThemeStore((s) => s.activeTheme);
  const theme = activeTheme();
  const layoutMode = theme.layoutMode || "classic";

  if (layoutMode === "horizon") {
    return <HorizonUserLayout key="horizon" />;
  }

  return <UserLayout key="classic" />;
}
