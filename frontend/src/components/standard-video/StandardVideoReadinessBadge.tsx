export type StandardVideoReadinessLevel =
  | "Başlangıç"
  | "Taslak"
  | "Script hazır"
  | "Kısmen hazır"
  | "Hazır";

const styles: Record<StandardVideoReadinessLevel, string> = {
  "Başlangıç":    "bg-neutral-100 text-neutral-500 border-border",
  "Taslak":       "bg-warning-light text-warning-text border-warning-light",
  "Script hazır": "bg-info-light text-info-dark border-info-light",
  "Kısmen hazır": "bg-brand-50 text-brand-700 border-border-subtle",
  "Hazır":        "bg-success-light text-success-text border-success-light",
};

interface Props {
  level: StandardVideoReadinessLevel;
}

export function StandardVideoReadinessBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
