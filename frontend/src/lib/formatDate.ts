/**
 * Safe date formatting helpers.
 * All functions return a fallback string when the input is null, undefined,
 * empty, or produces an invalid Date.
 *
 * Timezone is read from localStorage key "ui.timezone" (set by settings sync).
 * Falls back to "Europe/Istanbul" if not set.
 */

import type { ReactNode } from "react";

function getTimezone(): string {
  try {
    return localStorage.getItem("ui.timezone") || "Europe/Istanbul";
  } catch {
    return "Europe/Istanbul";
  }
}

/** Full date+time for detail panels: "03.04.2026 14:30:55" */
export function formatDateTime(
  value: string | null | undefined,
  fallback: string = "—",
): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: getTimezone(),
  });
}

/** Short date+time for registry tables: "03.04.2026 14:30" */
export function formatDateShort(
  value: string | null | undefined,
  fallback: string = "—",
): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: getTimezone(),
  });
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

/** Relative time: "3 dk once", "2 saat once", "1 gun once" */
export function timeAgo(
  value: string | null | undefined,
  fallback: string = "—",
): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  const now = Date.now();
  const diffMs = now - d.getTime();
  if (diffMs < 0) return "az once";
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "az once";
  if (diffMin < 60) return `${diffMin} dk once`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} saat once`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} gun once`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} ay once`;
}

/** Normalize a date string for datetime-local input: "2026-04-03T14:30" */
export function normalizeDateForInput(
  value: string | null | undefined,
): string {
  if (!value) return "";
  return String(value).slice(0, 16);
}
