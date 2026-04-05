import { colors, typography } from "../design-system/tokens";
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
    <span style={{ fontSize: typography.size.base, color: seconds != null ? colors.neutral[900] : colors.neutral[500] }}>
      {label && <span style={{ color: colors.neutral[600], marginRight: "0.25rem" }}>{label}:</span>}
      {display}
    </span>
  );
}
