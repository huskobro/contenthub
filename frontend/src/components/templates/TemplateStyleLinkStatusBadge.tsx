import { colors, radius, typography } from "../design-system/tokens";
interface Props {
  styleLinkCount: number;
}

export function TemplateStyleLinkStatusBadge({ styleLinkCount }: Props) {
  if (styleLinkCount === 0) {
    return <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>Bağ yok</span>;
  }
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.45rem",
        fontSize: typography.size.xs,
        borderRadius: radius.sm,
        background: colors.info.light,
        color: colors.info.dark,
        border: `1px solid ${colors.info.light}`,
        whiteSpace: "nowrap",
      }}
    >
      {styleLinkCount} bağ
    </span>
  );
}
