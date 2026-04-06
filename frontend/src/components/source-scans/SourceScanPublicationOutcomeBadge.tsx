type OutcomeLevel =
  | "Sorunlu"
  | "Hazırlanıyor"
  | "Ham çıktı"
  | "Aday çıktı"
  | "Yayına yakın çıktı"
  | "Belirsiz";

interface Props {
  level: OutcomeLevel;
}

const STYLES: Record<OutcomeLevel, string> = {
  "Sorunlu":             "bg-error-light text-error-text",
  "Hazırlanıyor":        "bg-info-light text-info-dark",
  "Ham çıktı":           "bg-warning-light text-warning-text",
  "Aday çıktı":          "bg-warning-light text-warning-text",
  "Yayına yakın çıktı":  "bg-success-light text-success-text",
  "Belirsiz":            "bg-neutral-100 text-neutral-600",
};

export function SourceScanPublicationOutcomeBadge({ level }: Props) {
  const s = STYLES[level] ?? "bg-neutral-100 text-neutral-600";
  return (
    <span className={`inline-block px-2 py-[0.125rem] text-sm rounded-md font-medium whitespace-nowrap ${s}`}>
      {level ?? "—"}
    </span>
  );
}
