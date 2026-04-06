type Level = "İçerik yok" | "Ham çıktı" | "Aday çıktı" | "Kullanılmış çıktı" | "Bilinmiyor";

const STYLES: Record<Level, string> = {
  "İçerik yok":        "bg-neutral-100 text-neutral-600",
  "Ham çıktı":         "bg-warning-light text-warning-text",
  "Aday çıktı":        "bg-info-light text-brand-700",
  "Kullanılmış çıktı": "bg-success-light text-success-text",
  "Bilinmiyor":        "bg-neutral-100 text-neutral-500",
};

interface Props {
  level: Level;
}

export function SourceScanPublicationYieldBadge({ level }: Props) {
  const s = STYLES[level] ?? STYLES["Bilinmiyor"];
  return (
    <span className={`inline-block px-2 py-[0.125rem] text-sm rounded-md font-medium whitespace-nowrap ${s}`}>
      {level ?? "—"}
    </span>
  );
}
