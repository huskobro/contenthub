export type ReadinessLevel = "Başlangıç" | "İçerik seçildi" | "Script hazır" | "Kısmen hazır" | "Hazır";

const styles: Record<ReadinessLevel, string> = {
  "Başlangıç":       "bg-neutral-100 text-neutral-600 border-border",
  "İçerik seçildi":  "bg-info-light text-info-dark border-info-light",
  "Script hazır":    "bg-warning-light text-warning-text border-warning-light",
  "Kısmen hazır":    "bg-warning-light text-warning-text border-warning-light",
  "Hazır":           "bg-success-light text-success-text border-success-light",
};

interface Props {
  level: ReadinessLevel;
}

export function NewsBulletinReadinessBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
