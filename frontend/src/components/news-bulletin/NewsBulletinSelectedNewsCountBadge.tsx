interface Props {
  count: number;
}

export function NewsBulletinSelectedNewsCountBadge({ count }: Props) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.4rem",
        fontSize: "0.7rem",
        borderRadius: "3px",
        background: count > 0 ? "#eff6ff" : "#f1f5f9",
        color: count > 0 ? "#1d4ed8" : "#94a3b8",
        border: `1px solid ${count > 0 ? "#bfdbfe" : "#e2e8f0"}`,
        whiteSpace: "nowrap",
        minWidth: "1.5rem",
        textAlign: "center",
      }}
    >
      {count}
    </span>
  );
}
