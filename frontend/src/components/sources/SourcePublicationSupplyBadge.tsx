export type SourcePublicationSupplyLevel =
  | "İçerik yok"
  | "Ham içerik"
  | "Aday içerik var"
  | "Kullanılmış içerik var"
  | "Bilinmiyor";

const styles: Record<SourcePublicationSupplyLevel, string> = {
  "İçerik yok":           "bg-neutral-50 text-neutral-500 border-border",
  "Ham içerik":           "bg-warning-light text-warning-text border-warning-light",
  "Aday içerik var":      "bg-success-light text-success-text border-success-light",
  "Kullanılmış içerik var":"bg-info-light text-brand-700 border-info-light",
  "Bilinmiyor":           "bg-neutral-100 text-neutral-600 border-border-subtle",
};

interface Props {
  level: SourcePublicationSupplyLevel;
}

export function SourcePublicationSupplyBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
