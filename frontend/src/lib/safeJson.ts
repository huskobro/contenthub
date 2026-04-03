/**
 * Safe JSON formatting helpers.
 * Provides crash-safe pretty printing and preview utilities for JSON string fields.
 */

/** Pretty-print a JSON string. Returns formatted string on success, raw value on parse failure, fallback on null/empty. */
export function safeJsonPretty(
  value: string | null | undefined,
  fallback: string = "—",
): string {
  if (!value || !value.trim()) return fallback;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

/** Validate a JSON string for form fields. Returns error message or null if valid. Empty string is considered valid (optional). */
export function validateJson(value: string): string | null {
  if (!value.trim()) return null;
  try {
    JSON.parse(value);
    return null;
  } catch {
    return "Geçersiz JSON";
  }
}
