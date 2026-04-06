import { useState, useCallback } from "react";

/**
 * Persists column visibility preferences to localStorage.
 * tableKey: unique identifier (e.g. "sources-table")
 * allColumns: all column keys in order
 * defaultHidden: columns hidden by default
 */
export function useColumnVisibility(
  tableKey: string,
  allColumns: string[],
  defaultHidden: string[] = [],
) {
  const storageKey = `col-vis:${tableKey}`;

  function loadInitial(): Set<string> {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        return new Set(parsed);
      }
    } catch {
      // ignore parse errors
    }
    const hidden = new Set(defaultHidden);
    return new Set(allColumns.filter((c) => !hidden.has(c)));
  }

  const [visible, setVisible] = useState<Set<string>>(loadInitial);

  const toggle = useCallback(
    (col: string) => {
      setVisible((prev) => {
        const next = new Set(prev);
        if (next.has(col)) {
          // always keep at least 1 visible
          if (next.size <= 1) return prev;
          next.delete(col);
        } else {
          next.add(col);
        }
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch {
          // ignore quota errors
        }
        return next;
      });
    },
    [storageKey],
  );

  const isVisible = useCallback((col: string) => visible.has(col), [visible]);

  return { visible, isVisible, toggle };
}
