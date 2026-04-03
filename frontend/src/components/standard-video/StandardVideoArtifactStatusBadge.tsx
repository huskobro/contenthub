export type ArtifactStatus = "Var" | "Eksik" | "Bilinmiyor";

const styles: Record<ArtifactStatus, { bg: string; color: string; border: string }> = {
  "Var":        { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  "Eksik":      { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "Bilinmiyor": { bg: "#f1f5f9", color: "#94a3b8", border: "#cbd5e1" },
};

interface Props {
  status: ArtifactStatus;
}

export function StandardVideoArtifactStatusBadge({ status }: Props) {
  const s = styles[status] ?? { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.35rem",
        fontSize: "0.65rem",
        borderRadius: "3px",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {status ?? "—"}
    </span>
  );
}
