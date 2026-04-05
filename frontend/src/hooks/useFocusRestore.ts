/**
 * useFocusRestore — Wave 1
 *
 * Captures the active element when an overlay opens,
 * restores focus to it when the overlay closes.
 *
 * Usage:
 *   const restoreFocus = useFocusRestore(isOpen);
 *   // restoreFocus() is called automatically on close, or you can call manually
 */

import { useEffect, useRef, useCallback } from "react";

export function useFocusRestore(isOpen: boolean): () => void {
  const savedElement = useRef<HTMLElement | null>(null);

  // Capture focus when opening
  useEffect(() => {
    if (isOpen) {
      savedElement.current = document.activeElement as HTMLElement | null;
    }
  }, [isOpen]);

  const restore = useCallback(() => {
    if (savedElement.current && typeof savedElement.current.focus === "function") {
      // Use requestAnimationFrame to avoid race with closing animations
      requestAnimationFrame(() => {
        savedElement.current?.focus();
        savedElement.current = null;
      });
    }
  }, []);

  // Auto-restore when closing
  useEffect(() => {
    if (!isOpen && savedElement.current) {
      restore();
    }
  }, [isOpen, restore]);

  return restore;
}
