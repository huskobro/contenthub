export type NewsItemReadinessLevel =
  | "Başlangıç"
  | "Ham kayıt"
  | "Gözden geçirildi"
  | "Kullanıldı"
  | "Hariç"
  | "Kısmen hazır";

const styles: Record<NewsItemReadinessLevel, string> = {
  "Başlangıç":         "bg-neutral-100 text-neutral-600 border-border",
  "Ham kayıt":         "bg-info-light text-info-dark border-info-light",
  "Gözden geçirildi":  "bg-warning-light text-warning-text border-warning-light",
  "Kullanıldı":        "bg-success-light text-success-text border-success-light",
  "Hariç":             "bg-neutral-100 text-neutral-500 border-border-subtle",
  "Kısmen hazır":      "bg-warning-light text-warning-text border-warning-light",
};

interface Props {
  level: NewsItemReadinessLevel;
}

export function NewsItemReadinessBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
