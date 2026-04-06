export type NewsItemPublicationSignalLevel =
  | "Hariç"
  | "Kullanıldı"
  | "Yayına yakın"
  | "Aday"
  | "Zayıf";

const styles: Record<NewsItemPublicationSignalLevel, string> = {
  "Hariç":       "bg-neutral-100 text-neutral-500 border-border",
  "Kullanıldı":  "bg-info-light text-brand-700 border-info-light",
  "Yayına yakın":"bg-success-light text-success-text border-success-light",
  "Aday":        "bg-warning-light text-warning-text border-warning-light",
  "Zayıf":       "bg-error-light text-error-text border-error-light",
};

interface Props {
  level: NewsItemPublicationSignalLevel;
}

export function NewsItemPublicationSignalBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
