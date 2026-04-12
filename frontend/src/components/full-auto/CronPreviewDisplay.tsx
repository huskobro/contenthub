/**
 * CronPreviewDisplay — live next-fire-times for a cron expression.
 *
 * Enforces the "preview-first" UX rule: the operator always sees what
 * a cron expression means before committing it to the project config.
 */

import { useCronPreview } from "../../hooks/useFullAuto";
import { cn } from "../../lib/cn";

interface CronPreviewDisplayProps {
  expression: string;
  count?: number;
  className?: string;
  testId?: string;
}

export function CronPreviewDisplay({
  expression,
  count = 5,
  className,
  testId = "cron-preview",
}: CronPreviewDisplayProps) {
  const trimmed = expression.trim();
  const { data, isLoading, isError } = useCronPreview(trimmed, count);

  if (!trimmed) return null;

  if (isLoading) {
    return (
      <div
        className={cn("text-[11px] text-neutral-400 animate-pulse", className)}
        data-testid={testId}
      >
        Hesaplaniyor...
      </div>
    );
  }

  if (isError || !data?.next_runs?.length) {
    return (
      <div
        className={cn("text-[11px] text-error-dark", className)}
        data-testid={testId}
      >
        Gecersiz cron ifadesi
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-0.5", className)} data-testid={testId}>
      <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        Sonraki {data.next_runs.length} calistirma
      </p>
      <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
        {data.next_runs.map((dt, i) => (
          <li key={i} className="text-[11px] font-mono text-neutral-600">
            {formatRunTime(dt)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatRunTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
