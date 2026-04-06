type Level = "Bağ yok" | "Bağlı" | "Yayın bağı var" | "Bilinmiyor";

const STYLES: Record<Level, string> = {
  "Bağ yok":       "bg-neutral-100 text-neutral-600",
  "Bağlı":         "bg-info-light text-brand-700",
  "Yayın bağı var":"bg-success-light text-success-text",
  "Bilinmiyor":    "bg-neutral-100 text-neutral-500",
};

interface Props {
  level: Level;
}

export function NewsItemUsedNewsLinkageBadge({ level }: Props) {
  const s = STYLES[level] ?? STYLES["Bilinmiyor"];
  return (
    <span className={`inline-block px-2 py-[0.125rem] text-sm rounded-md font-medium whitespace-nowrap ${s}`}>
      {level ?? "—"}
    </span>
  );
}
