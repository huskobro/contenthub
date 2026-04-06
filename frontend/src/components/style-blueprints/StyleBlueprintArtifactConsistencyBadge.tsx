export type ArtifactConsistencyLevel = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

const STYLES: Record<ArtifactConsistencyLevel, string> = {
  "Artifacts yok": "bg-neutral-100 text-neutral-600",
  "Tek taraflı":   "bg-warning-light text-warning-text",
  "Tutarsız":      "bg-error-light text-error-text",
  "Dengeli":       "bg-success-light text-success-text",
};

interface Props {
  level: ArtifactConsistencyLevel;
}

export function StyleBlueprintArtifactConsistencyBadge({ level }: Props) {
  const s = STYLES[level] ?? STYLES["Artifacts yok"];
  return (
    <span className={`inline-block px-2 py-[0.125rem] text-sm rounded-md font-medium whitespace-nowrap ${s}`}>
      {level ?? "—"}
    </span>
  );
}
