/**
 * Returns true if value is null, undefined, empty string, or whitespace-only.
 * Use for display fallback decisions — NOT for business logic validation.
 */
export function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}
