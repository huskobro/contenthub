import { colors, radius, typography } from "../design-system/tokens";
interface Props {
  present: boolean;
  label: string;
}

export function NewsBulletinArtifactStatusBadge({ present, label }: Props) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.35rem",
        fontSize: typography.size.xs,
        borderRadius: radius.sm,
        background: present ? colors.success.light : colors.neutral[100],
        color: present ? colors.success.text : colors.neutral[500],
        border: `1px solid ${present ? colors.success.light : colors.border.subtle}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}: {present ? "Var" : "Eksik"}
    </span>
  );
}
