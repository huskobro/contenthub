import { colors, radius, typography } from "../design-system/tokens";
interface Props {
  warning: boolean;
}

export function UsedNewsWarningBadge({ warning }: Props) {
  if (!warning) return null;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.4rem",
        fontSize: typography.size.xs,
        background: colors.warning.light,
        color: colors.warning.text,
        border: `1px solid ${colors.warning.light}`,
        borderRadius: radius.sm,
        marginLeft: "0.4rem",
        whiteSpace: "nowrap",
      }}
    >
      Kullanım kaydı var
    </span>
  );
}
