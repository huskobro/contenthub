type Level = "Hedef bağlı" | "Hedef eksik" | "Hedef bulunamadı" | "Belirsiz";

const STYLES: Record<Level, string> = {
  "Hedef bağlı":      "bg-success-light text-success-text",
  "Hedef eksik":      "bg-warning-light text-warning-text",
  "Hedef bulunamadı": "bg-error-light text-error-text",
  "Belirsiz":         "bg-neutral-100 text-neutral-600",
};

interface Props {
  level: Level;
}

export function UsedNewsTargetResolutionBadge({ level }: Props) {
  const s = STYLES[level] ?? STYLES["Belirsiz"];
  return (
    <span className={`inline-block px-2 py-[0.125rem] text-sm rounded-md font-medium whitespace-nowrap ${s}`}>
      {level ?? "—"}
    </span>
  );
}
