type Level = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

const STYLES: Record<Level, string> = {
  "Artifacts yok": "bg-neutral-100 text-neutral-600",
  "Tek taraflı":   "bg-warning-light text-warning-text",
  "Tutarsız":      "bg-error-light text-error-text",
  "Dengeli":       "bg-success-light text-success-text",
};

interface Props {
  level: Level;
}

export function StyleBlueprintTargetOutputConsistencyBadge({ level }: Props) {
  const s = STYLES[level] ?? "bg-neutral-50 text-neutral-700 border-border-subtle";
  return (
    <span
      className={`inline-block px-2 py-[0.125rem] text-sm rounded-full whitespace-nowrap ${s}`}
    >
      {level ?? "—"}
    </span>
  );
}
