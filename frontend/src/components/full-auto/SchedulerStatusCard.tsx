/**
 * SchedulerStatusCard — admin-facing scheduler health display.
 *
 * Mounted on the admin automation policies page to give operators
 * visibility into the full-auto cron scheduler's runtime state.
 */

import { useSchedulerStatus } from "../../hooks/useFullAuto";
import { cn } from "../../lib/cn";

interface SchedulerStatusCardProps {
  className?: string;
  testId?: string;
}

export function SchedulerStatusCard({
  className,
  testId = "scheduler-status-card",
}: SchedulerStatusCardProps) {
  const { data, isLoading, isError } = useSchedulerStatus();

  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border-subtle bg-surface-card shadow-sm p-5 animate-pulse",
          className,
        )}
        data-testid={testId}
      >
        <p className="m-0 text-sm text-neutral-500">
          Zamanlayici durumu yukleniyor...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        className={cn(
          "rounded-xl border border-error-base/30 bg-error-light/20 p-5",
          className,
        )}
        data-testid={testId}
      >
        <p className="m-0 text-sm text-error-dark">
          Zamanlayici durumu alinamadi.
        </p>
      </div>
    );
  }

  const lastTickFormatted = data.last_tick_at
    ? formatTime(data.last_tick_at)
    : "-";
  const nextRunFormatted = data.next_candidate_run_at
    ? formatTime(data.next_candidate_run_at)
    : "-";

  return (
    <div
      className={cn(
        "rounded-xl border border-border-subtle bg-surface-card shadow-sm p-5",
        className,
      )}
      data-testid={testId}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="m-0 text-sm font-semibold text-neutral-800">
          Otomatik Zamanlayici
        </p>
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
            data.enabled
              ? "bg-success-light text-success-dark"
              : "bg-neutral-100 text-neutral-500",
          )}
          data-testid={`${testId}-badge`}
        >
          {data.enabled ? "Aktif" : "Devre Disi"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <Stat label="Kontrol Sikligi" value={`${data.poll_interval_seconds}s`} />
        <Stat label="Son Kontrol" value={lastTickFormatted} />
        <Stat
          label="Kontrol Durumu"
          value={
            data.last_tick_ok === null
              ? "-"
              : data.last_tick_ok
                ? "OK"
                : "Hata"
          }
          warn={data.last_tick_ok === false}
        />
        <Stat
          label="Bekleyen Proje"
          value={String(data.pending_project_count)}
        />
      </div>

      {data.last_tick_error && (
        <div className="mt-3 rounded-md border border-error-base/30 bg-error-light/20 px-3 py-2 text-xs text-error-dark">
          {data.last_tick_error}
        </div>
      )}

      {data.next_candidate_project_id && (
        <div className="mt-3 text-xs text-neutral-600">
          Siradaki proje:{" "}
          <span className="font-mono">
            {data.next_candidate_project_id.slice(0, 12)}&hellip;
          </span>{" "}
          — {nextRunFormatted}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <p className="m-0 text-neutral-500 text-[10px] uppercase tracking-wider font-semibold">
        {label}
      </p>
      <p
        className={cn(
          "m-0 mt-0.5 font-mono",
          warn ? "text-error-dark font-semibold" : "text-neutral-700",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}
