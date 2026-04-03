/**
 * Safe date formatting helpers.
 * All functions return a fallback string when the input is null, undefined,
 * empty, or produces an invalid Date.
 */

import type { ReactNode } from "react";

/** Full date+time for detail panels: "3.04.2026, 14:30:00" */
export function formatDateTime(
  value: string | null | undefined,
  fallback: string | null = null,
): string | null {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString();
}

/** Short date for registry tables: "3.04.2026" */
export function formatDateShort(
  value: string | null | undefined,
  fallback: string = "—",
): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString();
}

/** ISO-like "2026-04-03 14:30:00" for Job panels (slice pattern replacement).
 *  Fallback may be a JSX element for panels that use em-dash elements. */
export function formatDateISO(
  value: string | null | undefined,
  fallback: ReactNode = "—",
): ReactNode {
  if (!value) return fallback;
  if (value.length < 19) return value;
  return value.slice(0, 19).replace("T", " ");
}

/** Normalize a date string for datetime-local input: "2026-04-03T14:30" */
export function normalizeDateForInput(
  value: string | null | undefined,
): string {
  if (!value) return "";
  return String(value).slice(0, 16);
}
