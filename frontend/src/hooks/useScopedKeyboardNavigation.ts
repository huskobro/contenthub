/**
 * useScopedKeyboardNavigation — Wave 1
 *
 * Composite hook combining scope management with roving tabindex.
 * Automatically pushes/pops keyboard scope and provides navigation.
 *
 * This is the primary hook for pages with keyboard-navigable lists.
 *
 * Usage:
 *   const { activeIndex, setActiveIndex, getTabIndex, handleKeyDown } =
 *     useScopedKeyboardNavigation({
 *       scopeId: "jobs-table",
 *       scopeLabel: "Jobs Table",
 *       itemCount: jobs.length,
 *       onSelect: (i) => openDetail(jobs[i]),
 *       enabled: true,
 *     });
 */

import { useEffect } from "react";
import { useKeyboardStore } from "../stores/keyboardStore";
import { useRovingTabindex } from "./useRovingTabindex";

interface UseScopedKeyboardNavigationOptions {
  scopeId: string;
  scopeLabel?: string;
  itemCount: number;
  onSelect?: (index: number) => void;
  /** Whether this scope should be active. Default true. */
  enabled?: boolean;
  wrap?: boolean;
}

export function useScopedKeyboardNavigation({
  scopeId,
  scopeLabel,
  itemCount,
  onSelect,
  enabled = true,
  wrap,
}: UseScopedKeyboardNavigationOptions) {
  const pushScope = useKeyboardStore((s) => s.pushScope);
  const popScope = useKeyboardStore((s) => s.popScope);

  // Manage scope lifecycle
  useEffect(() => {
    if (enabled) {
      pushScope({ id: scopeId, label: scopeLabel });
    } else {
      popScope(scopeId);
    }
    return () => popScope(scopeId);
  }, [scopeId, scopeLabel, enabled, pushScope, popScope]);

  return useRovingTabindex({
    itemCount,
    onSelect,
    scopeId,
    wrap,
  });
}
