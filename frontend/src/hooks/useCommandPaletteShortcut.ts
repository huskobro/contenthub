/**
 * useCommandPaletteShortcut — Wave 2 / M25
 *
 * Global keyboard shortcut for opening the command palette.
 * Listens for Cmd+K (macOS) / Ctrl+K (Windows/Linux).
 * Prevents default browser behavior (e.g., Chrome's address bar focus).
 */

import { useEffect } from "react";
import { useCommandPaletteStore } from "../stores/commandPaletteStore";

export function useCommandPaletteShortcut() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        e.stopPropagation();
        useCommandPaletteStore.getState().toggle();
      }
    }

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);
}
