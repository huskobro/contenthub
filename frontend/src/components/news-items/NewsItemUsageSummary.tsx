import { NewsItemUsageBadge } from "./NewsItemUsageBadge";

interface Props {
  usageCount?: number;
  lastUsageType?: string | null;
  lastTargetModule?: string | null;
}

export function NewsItemUsageSummary({ usageCount, lastUsageType, lastTargetModule }: Props) {
  const count = usageCount ?? 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <NewsItemUsageBadge usageCount={count} />
      {count > 0 && (lastUsageType || lastTargetModule) && (
        <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
          {[lastUsageType, lastTargetModule].filter(Boolean).join(" / ")}
        </span>
      )}
    </div>
  );
}
