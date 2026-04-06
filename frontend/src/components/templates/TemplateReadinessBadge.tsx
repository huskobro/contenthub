export type TemplateReadinessLevel =
  | "Başlangıç"
  | "Taslak"
  | "Bağlandı"
  | "Kısmen hazır"
  | "Hazır";

const styles: Record<TemplateReadinessLevel, string> = {
  "Başlangıç":    "bg-neutral-100 text-neutral-600 border-border",
  "Taslak":       "bg-warning-light text-warning-text border-warning-light",
  "Bağlandı":     "bg-info-light text-info-dark border-info-light",
  "Kısmen hazır": "bg-warning-light text-warning-text border-warning-light",
  "Hazır":        "bg-success-light text-success-text border-success-light",
};

interface Props {
  level: TemplateReadinessLevel;
}

export function TemplateReadinessBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
