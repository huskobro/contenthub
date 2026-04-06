export type NewsItemScanLineageLevel =
  | "Scan bağlı"
  | "Manuel"
  | "Scan referansı"
  | "Scan bulunamadı"
  | "Bilinmiyor";

const styles: Record<NewsItemScanLineageLevel, string> = {
  "Scan bağlı":      "bg-success-light text-success-text border-success-light",
  "Manuel":          "bg-neutral-100 text-neutral-700 border-border",
  "Scan referansı":  "bg-warning-light text-warning-text border-warning-light",
  "Scan bulunamadı": "bg-error-light text-error-text border-error-light",
  "Bilinmiyor":      "bg-neutral-50 text-neutral-500 border-border-subtle",
};

interface Props {
  level: NewsItemScanLineageLevel;
}

export function NewsItemScanLineageBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
