import type { UsedNewsArtifactConsistencyLevel } from "./UsedNewsArtifactConsistencySummary";

const STYLES: Record<UsedNewsArtifactConsistencyLevel, string> = {
  "Artifacts yok": "bg-neutral-100 text-neutral-600",
  "Tek taraflı": "bg-warning-light text-warning-text",
  "Tutarsız": "bg-error-light text-error-text",
  "Dengeli": "bg-success-light text-success-text",
};

interface Props {
  level: UsedNewsArtifactConsistencyLevel;
}

export function UsedNewsArtifactConsistencyBadge({ level }: Props) {
  const s = STYLES[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-2 py-[0.125rem] text-sm rounded-full whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
