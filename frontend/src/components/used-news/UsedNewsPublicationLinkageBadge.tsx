type Level = "Taslağa bağlı" | "Planlandı" | "Yayınlandı" | "Bağ eksik" | "Belirsiz";

const STYLES: Record<Level, string> = {
  "Taslağa bağlı": "bg-success-light text-success-text",
  "Planlandı":     "bg-info-light text-brand-700",
  "Yayınlandı":    "bg-success-light text-success-text",
  "Bağ eksik":     "bg-warning-light text-warning-text",
  "Belirsiz":      "bg-neutral-100 text-neutral-600",
};

interface Props {
  level: Level;
}

export function UsedNewsPublicationLinkageBadge({ level }: Props) {
  const s = STYLES[level] ?? STYLES["Belirsiz"];
  return (
    <span className={`inline-block px-2 py-[0.125rem] text-sm rounded-md font-medium whitespace-nowrap ${s}`}>
      {level ?? "—"}
    </span>
  );
}
