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
    <span className="inline-block px-2 py-[0.1rem] text-xs rounded-sm bg-neutral-100 text-neutral-700 border border-border whitespace-nowrap font-mono">
      {label}
    </span>
  );
}
