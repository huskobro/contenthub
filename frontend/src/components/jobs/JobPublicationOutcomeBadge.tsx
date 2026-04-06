type Level = "Sorunlu" | "Hazırlanıyor" | "Taslak çıktı" | "Yayına yakın çıktı" | "Belirsiz";

const STYLES: Record<Level, string> = {
  "Sorunlu":           "bg-error-light text-error-text",
  "Hazırlanıyor":      "bg-warning-light text-warning-text",
  "Taslak çıktı":      "bg-info-light text-brand-700",
  "Yayına yakın çıktı":"bg-success-light text-success-text",
  "Belirsiz":          "bg-neutral-100 text-neutral-600",
};

interface Props {
  level: Level;
}

export function JobPublicationOutcomeBadge({ level }: Props) {
  const s = STYLES[level] ?? STYLES["Belirsiz"];
  return (
    <span className={`inline-block px-2 py-[0.125rem] text-sm rounded-md font-medium whitespace-nowrap ${s}`}>
      {level ?? "—"}
    </span>
  );
}
