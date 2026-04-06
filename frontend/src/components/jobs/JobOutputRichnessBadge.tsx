export type JobOutputRichnessLevel =
  | "Sorunlu"
  | "Zayıf bağlam"
  | "Kısmi bağlam"
  | "Zengin bağlam";

const styles: Record<JobOutputRichnessLevel, string> = {
  "Sorunlu":     "bg-error-light text-error-text border-error-light",
  "Zayıf bağlam":"bg-neutral-50 text-neutral-500 border-border",
  "Kısmi bağlam":"bg-warning-light text-warning-text border-warning-light",
  "Zengin bağlam":"bg-success-light text-success-text border-success-light",
};

interface Props {
  level: JobOutputRichnessLevel;
}

export function JobOutputRichnessBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
