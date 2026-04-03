export type NewsBulletinEnforcementStatus = "Temiz" | "Uyarı var" | "Bilinmiyor";

const styles: Record<NewsBulletinEnforcementStatus, { bg: string; color: string; border: string }> = {
  "Temiz":      { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  "Uyarı var":  { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  "Bilinmiyor": { bg: "#f1f5f9", color: "#94a3b8", border: "#cbd5e1" },
};

interface Props {
  status: NewsBulletinEnforcementStatus;
}

export function NewsBulletinEnforcementStatusBadge({ status }: Props) {
  const s = styles[status] ?? { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
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
      {status ?? "—"}
    </span>
  );
}
