import { colors, radius, typography } from "../design-system/tokens";
interface Props {
  count: number;
}

export function NewsBulletinSelectedNewsCountBadge({ count }: Props) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.4rem",
        fontSize: typography.size.xs,
        borderRadius: radius.sm,
        background: count > 0 ? colors.info.light : colors.neutral[100],
        color: count > 0 ? colors.info.dark : colors.neutral[500],
        border: `1px solid ${count > 0 ? colors.info.light : colors.border.subtle}`,
        whiteSpace: "nowrap",
        minWidth: "1.5rem",
        textAlign: "center",
      }}
    >
      {count}
    </span>
  );
}
