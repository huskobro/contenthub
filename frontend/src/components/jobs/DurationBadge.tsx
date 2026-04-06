import { formatDuration } from "../../lib/formatDuration";

interface DurationBadgeProps {
  seconds: number | null | undefined;
  label?: string;
  approximate?: boolean;
}

export function DurationBadge({ seconds, label, approximate = false }: DurationBadgeProps) {
  const text = formatDuration(seconds);
  const display = approximate && text !== "—" ? `~${text}` : text;

  return (
    <span className={`text-base ${seconds != null ? "text-neutral-900" : "text-neutral-500"}`}>
      {label && <span className="text-neutral-600 mr-1">{label}:</span>}
      {display}
    </span>
  );
}
