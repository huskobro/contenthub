import { colors, radius, typography } from "../design-system/tokens";
import type { NewsItemArtifactConsistencyLevel } from "./NewsItemArtifactConsistencySummary";

const STYLES: Record<NewsItemArtifactConsistencyLevel, { bg: string; color: string }> = {
  "Artifacts yok": { bg: colors.neutral[100], color: colors.neutral[600] },
  "Tek taraflı": { bg: colors.warning.light, color: colors.warning.text },
  "Tutarsız": { bg: colors.error.light, color: colors.error.text },
  "Dengeli": { bg: colors.success.light, color: colors.success.text },
};

interface Props {
  level: NewsItemArtifactConsistencyLevel;
}

export function NewsItemArtifactConsistencyBadge({ level }: Props) {
  const s = STYLES[level] ?? { bg: colors.neutral[50], color: colors.neutral[700], border: colors.border.subtle };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: radius.full,
        fontSize: typography.size.sm,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {level ?? "—"}
    </span>
  );
}
