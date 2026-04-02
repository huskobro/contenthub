export type NewsBulletinPublicationSignalLevel =
  | "Başlangıç"
  | "İçerik toplandı"
  | "Taslak hazır"
  | "Kontrol gerekli"
  | "Yayına yakın";

const styles: Record<NewsBulletinPublicationSignalLevel, { bg: string; color: string; border: string }> = {
  "Başlangıç":      { bg: "#f8fafc", color: "#94a3b8", border: "#cbd5e1" },
  "İçerik toplandı":{ bg: "#fef9c3", color: "#854d0e", border: "#fde68a" },
  "Taslak hazır":   { bg: "#e0f2fe", color: "#0369a1", border: "#7dd3fc" },
  "Kontrol gerekli":{ bg: "#fff7ed", color: "#c2410c", border: "#fdba74" },
  "Yayına yakın":   { bg: "#dcfce7", color: "#166534", border: "#86efac" },
};

interface Props {
  level: NewsBulletinPublicationSignalLevel;
}

export function NewsBulletinPublicationSignalBadge({ level }: Props) {
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
