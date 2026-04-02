export type UsedNewsStateLevel =
  | "Rezerve"
  | "Planlandı"
  | "Taslakta"
  | "Yayınlandı"
  | "Kayıtlı"
  | "Belirsiz";

const styles: Record<UsedNewsStateLevel, { bg: string; color: string; border: string }> = {
  "Rezerve":   { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "Planlandı": { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Taslakta":  { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  "Yayınlandı":{ bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  "Kayıtlı":   { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  "Belirsiz":  { bg: "#f1f5f9", color: "#94a3b8", border: "#cbd5e1" },
};

interface Props {
  level: UsedNewsStateLevel;
}

export function UsedNewsStateBadge({ level }: Props) {
  const s = styles[level];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.45rem",
        fontSize: "0.7rem",
        borderRadius: "3px",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {level}
    </span>
  );
}
