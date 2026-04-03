export type QualityLevel = "İçerik yok" | "Zayıf set" | "Kısmi set" | "Güçlü set" | "Bilinmiyor";

const STYLES: Record<QualityLevel, { background: string; color: string }> = {
  "İçerik yok": { background: "#f1f5f9", color: "#64748b" },
  "Zayıf set":  { background: "#fee2e2", color: "#991b1b" },
  "Kısmi set":  { background: "#fef9c3", color: "#854d0e" },
  "Güçlü set":  { background: "#dcfce7", color: "#166534" },
  "Bilinmiyor": { background: "#f1f5f9", color: "#94a3b8" },
};

interface Props {
  level: QualityLevel;
  detail?: string;
}

export function NewsBulletinSelectedNewsQualityBadge({ level, detail }: Props) {
  const s = STYLES[level] ?? STYLES["Bilinmiyor"];
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        padding: "0.125rem 0.5rem",
        borderRadius: "0.375rem",
        fontSize: "0.75rem",
        fontWeight: 500,
        background: s.background,
        color: s.color,
        whiteSpace: "nowrap",
        gap: "1px",
      }}
    >
      <span>{level ?? "—"}</span>
      {detail && (
        <span style={{ fontSize: "0.65rem", fontWeight: 400, opacity: 0.8 }}>{detail}</span>
      )}
    </span>
  );
}
