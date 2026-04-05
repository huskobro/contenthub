/**
 * useToast — Wave 1
 *
 * Convenience wrapper around uiStore.addToast.
 * Returns typed helper functions for common toast types.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success("Kaydedildi");
 *   toast.error("Islem basarisiz");
 */

import { useCallback } from "react";
import { useUIStore } from "../stores/uiStore";

interface UseToastReturn {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

export function useToast(): UseToastReturn {
  const addToast = useUIStore((s) => s.addToast);

  return {
    success: useCallback((msg: string) => addToast("success", msg), [addToast]),
    error: useCallback((msg: string) => addToast("error", msg), [addToast]),
    warning: useCallback((msg: string) => addToast("warning", msg), [addToast]),
    info: useCallback((msg: string) => addToast("info", msg), [addToast]),
  };
}
