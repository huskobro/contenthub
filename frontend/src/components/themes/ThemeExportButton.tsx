/**
 * ThemeExportButton — Extracted from ThemeRegistryPage.
 *
 * Exports a theme as JSON to the clipboard. Wraps the export logic
 * that was previously inline in the page's handleExport callback.
 */

import { useCallback } from "react";
import { ActionButton } from "../design-system/primitives";
import { useThemeStore } from "../../stores/themeStore";
import { useToast } from "../../hooks/useToast";

export function ThemeExportButton({
  themeId,
  size = "sm",
}: {
  themeId: string;
  size?: "sm" | "md";
}) {
  const exportTheme = useThemeStore((s) => s.exportTheme);
  const toast = useToast();

  const handleExport = useCallback(() => {
    const json = exportTheme(themeId);
    if (json) {
      navigator.clipboard.writeText(json).then(
        () => toast.success("Tema JSON'i panoya kopyalandi."),
        () => toast.error("Kopyalama basarisiz oldu.")
      );
    }
  }, [exportTheme, themeId, toast]);

  return (
    <ActionButton
      variant="secondary"
      size={size}
      onClick={handleExport}
      data-testid={`theme-export-${themeId}`}
    >
      Disari Aktar
    </ActionButton>
  );
}
