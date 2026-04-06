type Level = "Scan kökenli" | "Kaynaklı" | "Kaynak yok" | "News item bulunamadı" | "Belirsiz";

const STYLES: Record<Level, string> = {
  "Scan kökenli":         "bg-info-light text-brand-700",
  "Kaynaklı":             "bg-success-light text-success-text",
  "Kaynak yok":           "bg-warning-light text-warning-text",
  "News item bulunamadı": "bg-error-light text-error-text",
  "Belirsiz":             "bg-neutral-100 text-neutral-600",
};

interface Props {
  level: Level;
}

export function UsedNewsSourceContextBadge({ level }: Props) {
  const s = STYLES[level] ?? STYLES["Belirsiz"];
  return (
    <span className={`inline-block px-2 py-[0.125rem] text-sm rounded-md font-medium whitespace-nowrap ${s}`}>
      {level ?? "—"}
    </span>
  );
}
