export type JobActionabilityLevel =
  | "Dikkat gerekli"
  | "Bekliyor"
  | "Çalışıyor"
  | "Tamamlandı"
  | "Belirsiz";

const styles: Record<JobActionabilityLevel, string> = {
  "Dikkat gerekli": "bg-error-light text-error-text border-error-light",
  "Bekliyor":       "bg-warning-light text-warning-text border-warning-light",
  "Çalışıyor":      "bg-info-light text-info-dark border-info-light",
  "Tamamlandı":     "bg-success-light text-success-text border-success-light",
  "Belirsiz":       "bg-neutral-100 text-neutral-500 border-border",
};

interface Props {
  level: JobActionabilityLevel;
}

export function JobActionabilityBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
