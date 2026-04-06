type ConsistencyLevel = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

interface Props {
  level: ConsistencyLevel;
}

const STYLES: Record<ConsistencyLevel, string> = {
  "Artifacts yok": "bg-neutral-100 text-neutral-600",
  "Tek taraflı":   "bg-warning-light text-warning-text",
  "Tutarsız":      "bg-error-light text-error-text",
  "Dengeli":       "bg-success-light text-success-text",
};

export function JobTargetOutputConsistencyBadge({ level }: Props) {
  const s = STYLES[level] ?? "bg-neutral-100 text-neutral-600";
  return (
    <span className={`inline-block px-2 py-[0.125rem] text-sm rounded-md font-medium whitespace-nowrap ${s}`}>
      {level ?? "—"}
    </span>
  );
}
