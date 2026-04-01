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
    <span style={{ fontSize: "0.8125rem", color: seconds != null ? "#0f172a" : "#94a3b8" }}>
      {label && <span style={{ color: "#64748b", marginRight: "0.25rem" }}>{label}:</span>}
      {display}
    </span>
  );
}
