export type NewsBulletinSourceCoverageLevel =
  | "Kaynak yok"
  | "Kaynak bilgisi eksik"
  | "Tek kaynak"
  | "Çoklu kaynak";

const styles: Record<NewsBulletinSourceCoverageLevel, string> = {
  "Kaynak yok":           "bg-neutral-100 text-neutral-500 border-border",
  "Kaynak bilgisi eksik": "bg-warning-light text-warning-text border-warning-light",
  "Tek kaynak":           "bg-info-light text-brand-700 border-info-light",
  "Çoklu kaynak":         "bg-success-light text-success-text border-success-light",
};

interface Props {
  level: NewsBulletinSourceCoverageLevel;
}

export function NewsBulletinSourceCoverageBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
