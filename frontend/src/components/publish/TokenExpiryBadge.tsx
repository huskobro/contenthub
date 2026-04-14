/**
 * Gate 4 (Z-4) — Token expiry badge for a PlatformConnection row.
 *
 * Reads `/publish/connections/:id/token-status` (non-aggressive — does NOT
 * call the platform API). Color-coded:
 *   - 'ok'       → green
 *   - 'warn'     → amber (expires within 7d)
 *   - 'critical' → orange (expires within 24h)
 *   - 'expired'  → grey-warning (refresh_token will self-heal)
 *   - 'reauth'   → red (scheduler skips publishes for this connection)
 *   - 'unknown'  → grey
 *
 * Only the 'reauth' state surfaces an explicit "Reauth gerekli" call to action.
 */
import { useConnectionTokenStatus } from "../../hooks/usePublish";

const SEVERITY_STYLES: Record<
  string,
  { dot: string; text: string; label: string }
> = {
  ok: { dot: "bg-green-500", text: "text-green-700", label: "Geçerli" },
  warn: { dot: "bg-warning", text: "text-warning", label: "Yakında bitiyor" },
  critical: { dot: "bg-warning", text: "text-warning", label: "Bu gün biter" },
  expired: { dot: "bg-neutral-500", text: "text-neutral-600", label: "Süresi geçmiş" },
  reauth: { dot: "bg-error", text: "text-error", label: "Reauth gerekli" },
  unknown: { dot: "bg-neutral-300", text: "text-neutral-500", label: "Bilinmiyor" },
};

function formatDelta(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  const abs = Math.abs(seconds);
  if (abs < 3600) return `${Math.floor(abs / 60)}d`;
  if (abs < 86400) return `${Math.floor(abs / 3600)}sa`;
  return `${Math.floor(abs / 86400)}g`;
}

interface TokenExpiryBadgeProps {
  connectionId: string | undefined;
  /** When true, hides the badge entirely if severity is 'ok' (compact mode). */
  hideWhenHealthy?: boolean;
}

export function TokenExpiryBadge({
  connectionId,
  hideWhenHealthy = false,
}: TokenExpiryBadgeProps) {
  const { data, isLoading, isError } = useConnectionTokenStatus(connectionId);

  if (!connectionId) return null;
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-300 animate-pulse" />
        Token…
      </span>
    );
  }
  if (isError || !data) return null;
  if (hideWhenHealthy && data.severity === "ok") return null;

  const style = SEVERITY_STYLES[data.severity] ?? SEVERITY_STYLES.unknown;
  const delta = formatDelta(data.seconds_remaining);
  const tooltip = [
    data.suggested_action ?? style.label,
    data.expires_at ? `Bitiş: ${new Date(data.expires_at).toLocaleString()}` : null,
    data.has_refresh_token ? "Refresh token mevcut" : "Refresh token yok",
    data.is_blocking ? "Scheduler bu bağlantıyı atlıyor" : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${style.text}`}
      title={tooltip}
      data-testid="token-expiry-badge"
      data-severity={data.severity}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
      {(data.severity === "warn" || data.severity === "critical") && (
        <span className="text-neutral-500">· {delta}</span>
      )}
    </span>
  );
}
