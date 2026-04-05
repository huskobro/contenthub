/**
 * useRovingTabindex — Wave 1
 *
 * WAI-ARIA roving tabindex pattern for list/table keyboard navigation.
 * Active item gets tabIndex=0, all others get tabIndex=-1.
 *
 * Supports: Arrow Up/Down, Home, End, Enter, Space
 *
 * Usage:
 *   const { activeIndex, setActiveIndex, getTabIndex, handleKeyDown } =
 *     useRovingTabindex({ itemCount: items.length, onSelect, scopeId });
 */

import { useState, useCallback } from "react";
import { useKeyboardStore } from "../stores/keyboardStore";

interface UseRovingTabindexOptions {
  /** Total number of navigable items */
  itemCount: number;
  /** Called when Enter or Space is pressed on the active item */
  onSelect?: (index: number) => void;
  /** Keyboard scope id — only active when this scope is topmost */
  scopeId?: string;
  /** Whether navigation wraps around at the edges */
  wrap?: boolean;
}

interface UseRovingTabindexReturn {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  getTabIndex: (index: number) => 0 | -1;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useRovingTabindex({
  itemCount,
  onSelect,
  scopeId,
  wrap = true,
}: UseRovingTabindexOptions): UseRovingTabindexReturn {
  const [activeIndex, setActiveIndex] = useState(0);
  const isActiveScope = useKeyboardStore((s) => s.isActiveScope);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // If scopeId is provided, only handle events when this scope is active
      if (scopeId && !isActiveScope(scopeId)) return;
      if (itemCount === 0) return;

      let nextIndex = activeIndex;
      let handled = false;

      switch (e.key) {
        case "ArrowDown":
        case "j": {
          handled = true;
          if (wrap) {
            nextIndex = (activeIndex + 1) % itemCount;
          } else {
            nextIndex = Math.min(activeIndex + 1, itemCount - 1);
          }
          break;
        }
        case "ArrowUp":
        case "k": {
          handled = true;
          if (wrap) {
            nextIndex = (activeIndex - 1 + itemCount) % itemCount;
          } else {
            nextIndex = Math.max(activeIndex - 1, 0);
          }
          break;
        }
        case "Home": {
          handled = true;
          nextIndex = 0;
          break;
        }
        case "End": {
          handled = true;
          nextIndex = itemCount - 1;
          break;
        }
        case "Enter": {
          handled = true;
          onSelect?.(activeIndex);
          break;
        }
      }

      if (handled) {
        e.preventDefault();
        if (nextIndex !== activeIndex) {
          setActiveIndex(nextIndex);
        }
      }
    },
    [activeIndex, itemCount, onSelect, scopeId, isActiveScope, wrap]
  );

  const getTabIndex = useCallback(
    (index: number): 0 | -1 => (index === activeIndex ? 0 : -1),
    [activeIndex]
  );

  return { activeIndex, setActiveIndex, getTabIndex, handleKeyDown };
}
