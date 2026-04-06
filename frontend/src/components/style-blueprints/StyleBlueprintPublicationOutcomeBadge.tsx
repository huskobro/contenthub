type Level = "Hazırlanıyor" | "Ham çıktı" | "Aday çıktı" | "Yayına yakın çıktı";

const STYLES: Record<Level, string> = {
  "Hazırlanıyor":       "bg-neutral-100 text-neutral-600",
  "Ham çıktı":          "bg-warning-light text-warning-text",
  "Aday çıktı":         "bg-info-light text-brand-700",
  "Yayına yakın çıktı": "bg-success-light text-success-text",
};

interface Props {
  level: Level;
}

export function StyleBlueprintPublicationOutcomeBadge({ level }: Props) {
  const s = STYLES[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-2 py-[0.125rem] text-sm rounded-full whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
