export type SourceScanResultRichnessLevel =
  | "Boş çıktı"
  | "Çıktı var"
  | "Zengin çıktı"
  | "Sorunlu"
  | "Belirsiz";

const styles: Record<SourceScanResultRichnessLevel, string> = {
  "Boş çıktı":   "bg-neutral-50 text-neutral-500 border-border",
  "Çıktı var":   "bg-success-light text-success-text border-success-light",
  "Zengin çıktı":"bg-success-light text-success-text border-success-light",
  "Sorunlu":     "bg-error-light text-error-text border-error-light",
  "Belirsiz":    "bg-neutral-100 text-neutral-600 border-border-subtle",
};

interface Props {
  level: SourceScanResultRichnessLevel;
}

export function SourceScanResultRichnessBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
