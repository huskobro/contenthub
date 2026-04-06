import { NewsItemUsageBadge } from "./NewsItemUsageBadge";

interface Props {
  usageCount?: number;
  lastUsageType?: string | null;
  lastTargetModule?: string | null;
}

export function NewsItemUsageSummary({ usageCount, lastUsageType, lastTargetModule }: Props) {
  const count = usageCount ?? 0;
  return (
    <div className="flex flex-col gap-[0.15rem]">
      <NewsItemUsageBadge usageCount={count} />
      {count > 0 && (lastUsageType || lastTargetModule) && (
        <span className="text-[0.68rem] text-neutral-500">
          {[lastUsageType, lastTargetModule].filter(Boolean).join(" / ")}
        </span>
      )}
    </div>
  );
}
