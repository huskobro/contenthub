/**
 * useAutoSave — Wave 1
 *
 * Field-type auto-save strategy for Settings page:
 * - toggle/select: save immediately on change
 * - text/number: save on blur
 * - textarea: save after 800ms debounce
 *
 * Usage:
 *   const { triggerSave, isDirty, isSaving } = useAutoSave({
 *     fieldType: "text",
 *     value,
 *     onSave: async (val) => await updateSetting(key, val),
 *   });
 */

import { useEffect, useRef, useState, useCallback } from "react";

export type AutoSaveFieldType = "toggle" | "select" | "text" | "number" | "textarea";

interface UseAutoSaveOptions<T> {
  fieldType: AutoSaveFieldType;
  value: T;
  onSave: (value: T) => Promise<void>;
  /** Debounce delay for textarea fields (ms). Default 800. */
  debounceMs?: number;
  /** Whether auto-save is enabled. Default true. */
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  /** Call on blur for text/number fields */
  triggerSave: () => void;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Whether a save is in progress */
  isSaving: boolean;
  /** Last save error, if any */
  error: string | null;
}

export function useAutoSave<T>({
  fieldType,
  value,
  onSave,
  debounceMs = 800,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedValueRef = useRef(value);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const performSave = useCallback(
    async (val: T) => {
      if (!enabled) return;
      setIsSaving(true);
      setError(null);
      try {
        await onSaveRef.current(val);
        savedValueRef.current = val;
        setIsDirty(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kaydetme hatasi");
      } finally {
        setIsSaving(false);
      }
    },
    [enabled]
  );

  // Track dirty state
  useEffect(() => {
    const dirty = value !== savedValueRef.current;
    setIsDirty(dirty);
  }, [value]);

  // Immediate save for toggle/select
  useEffect(() => {
    if (!enabled) return;
    if (fieldType !== "toggle" && fieldType !== "select") return;
    if (value === savedValueRef.current) return;
    performSave(value);
  }, [fieldType, value, performSave, enabled]);

  // Debounced save for textarea
  useEffect(() => {
    if (!enabled) return;
    if (fieldType !== "textarea") return;
    if (value === savedValueRef.current) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performSave(value);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [fieldType, value, debounceMs, performSave, enabled]);

  // Manual trigger for text/number (call on blur)
  const triggerSave = useCallback(() => {
    if (!enabled) return;
    if (value === savedValueRef.current) return;
    performSave(value);
  }, [value, performSave, enabled]);

  return { triggerSave, isDirty, isSaving, error };
}
