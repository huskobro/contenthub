/** Return `n` if it is a finite number, otherwise `fallback`. */
export function safeNumber(
  n: number | null | undefined,
  fallback: number = 0,
): number {
  return typeof n === "number" && !isNaN(n) && isFinite(n) ? n : fallback;
}
