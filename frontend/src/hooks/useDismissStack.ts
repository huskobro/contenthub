/**
 * useDismissStack — Wave 1
 *
 * ESC key priority system.
 * Only the topmost registered handler receives ESC events.
 * Prevents double-dismiss when overlays are nested (Sheet inside QuickLook, etc.).
 *
 * Usage:
 *   useDismissStack("sheet-detail", isOpen, handleClose);
 */

import { useEffect, useRef } from "react";

// Global stack — shared across all instances
const dismissStack: { id: string; handler: () => void }[] = [];

export function useDismissStack(
  id: string,
  active: boolean,
  onDismiss: () => void
): void {
  const handlerRef = useRef(onDismiss);
  handlerRef.current = onDismiss;

  useEffect(() => {
    if (!active) {
      // Remove from stack when deactivated
      const idx = dismissStack.findIndex((entry) => entry.id === id);
      if (idx !== -1) dismissStack.splice(idx, 1);
      return;
    }

    // Push to stack
    const entry = { id, handler: () => handlerRef.current() };
    // Remove existing entry with same id first (re-push)
    const existingIdx = dismissStack.findIndex((e) => e.id === id);
    if (existingIdx !== -1) dismissStack.splice(existingIdx, 1);
    dismissStack.push(entry);

    return () => {
      const idx = dismissStack.findIndex((e) => e.id === id);
      if (idx !== -1) dismissStack.splice(idx, 1);
    };
  }, [id, active]);

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      // Only the topmost entry gets to handle ESC
      const top = dismissStack[dismissStack.length - 1];
      if (top && top.id === id) {
        e.preventDefault();
        e.stopPropagation();
        top.handler();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [id, active]);
}
