interface Props {
  usageCount?: number;
}

export function NewsItemUsageBadge({ usageCount }: Props) {
  const count = usageCount ?? 0;
  if (count === 0) {
    return <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Kullanılmamış</span>;
  }
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.4rem",
        fontSize: "0.7rem",
        borderRadius: "3px",
        background: "#fef9c3",
        color: "#92400e",
        border: "1px solid #fde68a",
        whiteSpace: "nowrap",
      }}
    >
      {count}x kullanıldı
    </span>
  );
}
