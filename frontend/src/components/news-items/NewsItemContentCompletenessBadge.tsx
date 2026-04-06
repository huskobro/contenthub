export type NewsItemCompletenessLevel =
  | "Eksik"
  | "Kısmi"
  | "Dolu";

const styles: Record<NewsItemCompletenessLevel, string> = {
  "Eksik": "bg-error-light text-error-text border-error-light",
  "Kısmi": "bg-warning-light text-warning-text border-warning-light",
  "Dolu":  "bg-success-light text-success-text border-success-light",
};

interface Props {
  level: NewsItemCompletenessLevel;
}

export function NewsItemContentCompletenessBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
