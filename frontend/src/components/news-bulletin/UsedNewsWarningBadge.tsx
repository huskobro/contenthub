interface Props {
  warning: boolean;
}

export function UsedNewsWarningBadge({ warning }: Props) {
  if (!warning) return null;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.4rem",
        fontSize: "0.7rem",
        background: "#fef9c3",
        color: "#92400e",
        border: "1px solid #fde68a",
        borderRadius: "3px",
        marginLeft: "0.4rem",
        whiteSpace: "nowrap",
      }}
    >
      Kullanım kaydı var
    </span>
  );
}
