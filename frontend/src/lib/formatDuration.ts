/**
 * Formats a duration in seconds to a short human-readable Turkish string.
 *
 * Examples:
 *   5      → "5 sn"
 *   65     → "1 dk 5 sn"
 *   3661   → "1 sa 1 dk"
 *   null   → "—"
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds) || seconds < 0) {
    return "—";
  }

  const total = Math.floor(seconds);
  const sn = total % 60;
  const dk = Math.floor(total / 60) % 60;
  const sa = Math.floor(total / 3600);

  if (sa > 0) {
    return dk > 0 ? `${sa} sa ${dk} dk` : `${sa} sa`;
  }
  if (dk > 0) {
    return sn > 0 ? `${dk} dk ${sn} sn` : `${dk} dk`;
  }
  return `${sn} sn`;
}
