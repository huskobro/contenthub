/**
 * Gate 4 (Z-3) — Publish scheduler health badge.
 *
 * Renders the in-memory scheduler status read from `/publish/scheduler/status`.
 * Three visible states:
 *   - 'healthy'  → green dot, "Çalışıyor"
 *   - 'stale'    → red dot, "Donmuş olabilir" + last_error
 *   - 'unknown'  → grey dot, "Henüz tick atmadı"
 *
 * The hook polls every 30s; nothing else is needed at the call site beyond
 * placing this badge in a header/sidebar slot.
 */
import { useSchedulerHealth } from "../../hooks/usePublish";

const STATE_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  healthy: {
    dot: "bg-green-500",
    text: "text-green-700",
    label: "Çalışıyor",
  },
  stale: {
    dot: "bg-error",
    text: "text-error",
    label: "Donmuş olabilir",
  },
  unknown: {
    dot: "bg-neutral-400",
    text: "text-neutral-500",
    label: "Henüz tick atmadı",
  },
};

function formatLastTick(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const ago = Math.floor((Date.now() - d.getTime()) / 1000);
  if (ago < 60) return `${ago}s önce`;
  if (ago < 3600) return `${Math.floor(ago / 60)}d önce`;
  return `${Math.floor(ago / 3600)}sa önce`;
}

export function SchedulerHealthBadge() {
  const { data, isLoading, isError } = useSchedulerHealth();

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-neutral-500">
        <span className="h-2 w-2 rounded-full bg-neutral-300 animate-pulse" />
        Scheduler yükleniyor…
      </span>
    );
  }
  if (isError || !data) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-error">
        <span className="h-2 w-2 rounded-full bg-error" />
        Scheduler durumu okunamadı
      </span>
    );
  }

  const style = STATE_STYLES[data.state] ?? STATE_STYLES.unknown;
  const tick = formatLastTick(data.last_tick_at);
  const tooltipLines = [
    `Son tick: ${tick}`,
    `Son tick'te due: ${data.last_due_count}`,
    `Tetiklenen: ${data.last_triggered_count}`,
    `Atlanan (reauth): ${data.last_skipped_count}`,
    `Aralık: ${Math.round(data.interval_seconds)}s`,
    data.consecutive_errors > 0
      ? `Üst üste hata: ${data.consecutive_errors}`
      : null,
    data.last_error ? `Son hata: ${data.last_error}` : null,
  ].filter(Boolean);

  return (
    <span
      className={`inline-flex items-center gap-2 text-xs ${style.text}`}
      title={tooltipLines.join("\n")}
      data-testid="scheduler-health-badge"
      data-state={data.state}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      <span className="font-medium">Scheduler: {style.label}</span>
      <span className="text-neutral-500">· {tick}</span>
      {data.last_skipped_count > 0 && (
        <span className="text-warning" title="Token reauth bekliyor">
          · {data.last_skipped_count} bekliyor
        </span>
      )}
    </span>
  );
}
