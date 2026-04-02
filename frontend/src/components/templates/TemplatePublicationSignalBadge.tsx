export type TemplatePublicationSignalLevel =
  | "Başlangıç"
  | "Taslak"
  | "Bağlandı"
  | "Kısmen hazır"
  | "Yayına yakın";

const styles: Record<TemplatePublicationSignalLevel, { bg: string; color: string; border: string }> = {
  "Başlangıç":   { bg: "#f8fafc", color: "#94a3b8", border: "#cbd5e1" },
  "Taslak":      { bg: "#fef9c3", color: "#854d0e", border: "#fde68a" },
  "Bağlandı":    { bg: "#e0f2fe", color: "#0369a1", border: "#7dd3fc" },
  "Kısmen hazır":{ bg: "#fff7ed", color: "#c2410c", border: "#fdba74" },
  "Yayına yakın":{ bg: "#dcfce7", color: "#166534", border: "#86efac" },
};

interface Props {
  level: TemplatePublicationSignalLevel;
}

export function TemplatePublicationSignalBadge({ level }: Props) {
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
