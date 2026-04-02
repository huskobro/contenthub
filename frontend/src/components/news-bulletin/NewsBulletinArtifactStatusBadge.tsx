interface Props {
  present: boolean;
  label: string;
}

export function NewsBulletinArtifactStatusBadge({ present, label }: Props) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.35rem",
        fontSize: "0.7rem",
        borderRadius: "3px",
        background: present ? "#dcfce7" : "#f1f5f9",
        color: present ? "#166534" : "#94a3b8",
        border: `1px solid ${present ? "#bbf7d0" : "#e2e8f0"}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}: {present ? "Var" : "Eksik"}
    </span>
  );
}
