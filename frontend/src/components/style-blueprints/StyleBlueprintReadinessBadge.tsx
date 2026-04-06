export type StyleBlueprintReadinessLevel =
  | "Başlangıç"
  | "Taslak"
  | "Kısmen hazır"
  | "Hazır";

const styles: Record<StyleBlueprintReadinessLevel, string> = {
  "Başlangıç":  "bg-neutral-100 text-neutral-500 border-border",
  "Taslak":     "bg-warning-light text-warning-text border-warning-light",
  "Kısmen hazır": "bg-info-light text-info-dark border-info-light",
  "Hazır":      "bg-success-light text-success-text border-success-light",
};

interface Props {
  level: StyleBlueprintReadinessLevel;
}

export function StyleBlueprintReadinessBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
