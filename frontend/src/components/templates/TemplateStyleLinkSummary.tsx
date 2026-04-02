import { TemplateStyleLinkStatusBadge } from "./TemplateStyleLinkStatusBadge";

interface Props {
  styleLinkCount?: number;
  primaryLinkRole?: string | null;
}

export function TemplateStyleLinkSummary({ styleLinkCount, primaryLinkRole }: Props) {
  const count = styleLinkCount ?? 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <TemplateStyleLinkStatusBadge styleLinkCount={count} />
      {count > 0 && primaryLinkRole && (
        <span style={{ fontSize: "0.68rem", color: "#64748b" }}>{primaryLinkRole}</span>
      )}
    </div>
  );
}
