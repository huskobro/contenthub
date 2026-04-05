/**
 * ThemeProvider — Wave 1 Final
 *
 * React component that applies the active theme's CSS variables to the DOM.
 * Place this at the top of the component tree (in layouts).
 *
 * When the active theme changes in the store, this component
 * re-applies CSS variables to document.documentElement.
 */

import { useEffect } from "react";
import { useThemeStore } from "../../stores/themeStore";
import { applyThemeToDOM } from "./themeEngine";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const activeTheme = useThemeStore((s) => s.activeTheme);

  useEffect(() => {
    const theme = activeTheme();
    applyThemeToDOM(theme);
  }, [activeThemeId, activeTheme]);

  return <>{children}</>;
}
