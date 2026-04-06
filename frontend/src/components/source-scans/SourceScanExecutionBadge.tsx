export type SourceScanExecutionLevel =
  | "Bekliyor"
  | "Tamamlandı"
  | "Sonuç üretti"
  | "Hata aldı"
  | "Belirsiz";

const styles: Record<SourceScanExecutionLevel, string> = {
  "Bekliyor":      "bg-warning-light text-warning-text border-warning-light",
  "Tamamlandı":    "bg-success-light text-success-text border-success-light",
  "Sonuç üretti":  "bg-success-light text-success-text border-success-light",
  "Hata aldı":     "bg-error-light text-error-text border-error-light",
  "Belirsiz":      "bg-neutral-100 text-neutral-500 border-border",
};

interface Props {
  level: SourceScanExecutionLevel;
}

export function SourceScanExecutionBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
