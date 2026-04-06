import { TemplateStyleLinkStatusBadge } from "./TemplateStyleLinkStatusBadge";

interface Props {
  styleLinkCount?: number;
  primaryLinkRole?: string | null;
}

export function TemplateStyleLinkSummary({ styleLinkCount, primaryLinkRole }: Props) {
  const count = styleLinkCount ?? 0;
  return (
    <div className="flex flex-col gap-[0.15rem]">
      <TemplateStyleLinkStatusBadge styleLinkCount={count} />
      {count > 0 && primaryLinkRole && (
        <span className="text-[0.68rem] text-neutral-600">{primaryLinkRole}</span>
      )}
    </div>
  );
}
