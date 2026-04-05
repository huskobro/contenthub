/**
 * useSearchFocus — Wave 1 Final
 *
 * "/" key to focus search input.
 * Only activates when no overlay is open and no input/textarea is focused.
 *
 * Usage:
 *   const searchRef = useRef<HTMLInputElement>(null);
 *   useSearchFocus(searchRef, { enabled: !sheetOpen });
 */

import { useEffect, useRef } from "react";

interface UseSearchFocusOptions {
  /** Whether the "/" shortcut is active. Default true. */
  enabled?: boolean;
}

export function useSearchFocus(
  inputRef: React.RefObject<HTMLInputElement | null>,
  options?: UseSearchFocusOptions
): void {
  const enabledRef = useRef(options?.enabled ?? true);
  enabledRef.current = options?.enabled ?? true;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!enabledRef.current) return;

      // Only trigger on "/" key
      if (e.key !== "/") return;

      // Don't trigger if already in an input/textarea/select
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        (active && (active as HTMLElement).isContentEditable)
      ) {
        return;
      }

      e.preventDefault();
      inputRef.current?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [inputRef]);
}
