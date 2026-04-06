export type SourceConfigCoverageLevel =
  | "Feed tanımlı"
  | "Feed eksik"
  | "URL tanımlı"
  | "URL eksik"
  | "API tanımlı"
  | "API eksik"
  | "Tür belirsiz";

const styles: Record<SourceConfigCoverageLevel, string> = {
  "Feed tanımlı": "bg-success-light text-success-text border-success-light",
  "Feed eksik":   "bg-warning-light text-warning-text border-warning-light",
  "URL tanımlı":  "bg-success-light text-success-text border-success-light",
  "URL eksik":    "bg-warning-light text-warning-text border-warning-light",
  "API tanımlı":  "bg-success-light text-success-text border-success-light",
  "API eksik":    "bg-warning-light text-warning-text border-warning-light",
  "Tür belirsiz": "bg-neutral-100 text-neutral-500 border-border",
};

interface Props {
  level: SourceConfigCoverageLevel;
}

export function SourceConfigCoverageBadge({ level }: Props) {
  const s = styles[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-[0.45rem] py-[0.1rem] text-xs rounded-sm border whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
