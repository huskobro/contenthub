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
        fontSize: "0.7rem",
        borderRadius: "3px",
        background: "#f1f5f9",
        color: "#475569",
        border: "1px solid #cbd5e1",
        whiteSpace: "nowrap",
        fontFamily: "monospace",
      }}
    >
      {label}
    </span>
  );
}
