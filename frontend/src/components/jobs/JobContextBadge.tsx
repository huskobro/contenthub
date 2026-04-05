import { colors, radius, typography } from "../design-system/tokens";
const MODULE_LABELS: Record<string, string> = {
  standard_video: "Standard Video",
  news_bulletin: "News Bulletin",
  product_review: "Product Review",
  educational_video: "Educational Video",
  howto_video: "How-To Video",
};

interface Props {
  moduleType: string;
}

export function JobContextBadge({ moduleType }: Props) {
  const label = MODULE_LABELS[moduleType] ?? moduleType;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.45rem",
        fontSize: typography.size.xs,
        borderRadius: radius.sm,
        background: colors.neutral[100],
        color: colors.neutral[700],
        border: `1px solid ${colors.border.default}`,
        whiteSpace: "nowrap",
        fontFamily: "monospace",
      }}
    >
      {label}
    </span>
  );
}
