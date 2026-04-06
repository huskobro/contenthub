interface Props {
  styleLinkCount: number;
}

export function TemplateStyleLinkStatusBadge({ styleLinkCount }: Props) {
  if (styleLinkCount === 0) {
    return <span className="text-xs text-neutral-500">Bağ yok</span>;
  }
  return (
    <span className="inline-block px-2 py-[0.1rem] text-xs rounded-sm bg-info-light text-info-dark border border-info-light whitespace-nowrap">
      {styleLinkCount} bağ
    </span>
  );
}
