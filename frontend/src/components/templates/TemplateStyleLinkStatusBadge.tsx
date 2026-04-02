interface Props {
  styleLinkCount: number;
}

export function TemplateStyleLinkStatusBadge({ styleLinkCount }: Props) {
  if (styleLinkCount === 0) {
    return <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Bağ yok</span>;
  }
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.45rem",
        fontSize: "0.7rem",
        borderRadius: "3px",
        background: "#eff6ff",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
        whiteSpace: "nowrap",
      }}
    >
      {styleLinkCount} bağ
    </span>
  );
}
