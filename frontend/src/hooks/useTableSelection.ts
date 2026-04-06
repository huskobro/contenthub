import { useState, useCallback } from "react";

export function useTableSelection(ids: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);
  const isAllSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const isIndeterminate = selected.size > 0 && !isAllSelected;

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (ids.every((id) => prev.has(id))) return new Set();
      return new Set(ids);
    });
  }, [ids]);

  const clear = useCallback(() => setSelected(new Set()), []);

  return {
    selected,
    selectedIds: Array.from(selected),
    selectedCount: selected.size,
    isSelected,
    isAllSelected,
    isIndeterminate,
    toggle,
    toggleAll,
    clear,
  };
}
