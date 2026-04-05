import { colors, radius, typography } from "../design-system/tokens";
interface Props {
  usageCount?: number;
}

export function NewsItemUsageBadge({ usageCount }: Props) {
  const count = usageCount ?? 0;
  if (count === 0) {
    return <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>Kullanılmamış</span>;
  }
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.4rem",
        fontSize: typography.size.xs,
        borderRadius: radius.sm,
        background: colors.warning.light,
        color: colors.warning.text,
        border: `1px solid ${colors.warning.light}`,
        whiteSpace: "nowrap",
      }}
    >
      {count}x kullanıldı
    </span>
  );
}
