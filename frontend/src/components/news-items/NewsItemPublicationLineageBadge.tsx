type Level = "Zincir yok" | "İçerik zincirinde" | "Yayın zincirinde" | "Kısmi zincir" | "Belirsiz";

const STYLES: Record<Level, string> = {
  "Zincir yok":        "bg-neutral-100 text-neutral-600",
  "İçerik zincirinde": "bg-info-light text-brand-700",
  "Yayın zincirinde":  "bg-success-light text-success-text",
  "Kısmi zincir":      "bg-warning-light text-warning-text",
  "Belirsiz":          "bg-neutral-100 text-neutral-500",
};

interface Props {
  level: Level;
}

export function NewsItemPublicationLineageBadge({ level }: Props) {
  const s = STYLES[level] ?? STYLES["Belirsiz"];
  return (
    <span className={`inline-block px-2 py-[0.125rem] text-sm rounded-md font-medium whitespace-nowrap ${s}`}>
      {level ?? "—"}
    </span>
  );
}
