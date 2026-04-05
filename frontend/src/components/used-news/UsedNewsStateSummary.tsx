import { colors } from "../design-system/tokens";
import { UsedNewsStateBadge, UsedNewsStateLevel } from "./UsedNewsStateBadge";

interface Props {
  usageType?: string | null;
  targetModule?: string | null;
  targetEntityId?: string | null;
}

export function computeUsedNewsState(
  usageType: string | null | undefined,
  targetModule: string | null | undefined,
): UsedNewsStateLevel {
  if (!usageType) return "Belirsiz";
  if (usageType === "reserved") return "Rezerve";
  if (usageType === "scheduled") return "Planlandı";
  if (usageType === "draft") return "Taslakta";
  if (usageType === "published") return "Yayınlandı";
  // unknown usage_type but target_module present
  if (targetModule) return "Kayıtlı";
  return "Belirsiz";
}

export function UsedNewsStateSummary({ usageType, targetModule, targetEntityId }: Props) {
  const level = computeUsedNewsState(usageType, targetModule);

  const parts: string[] = [];
  if (targetModule) parts.push(targetModule);
  if (targetEntityId) parts.push(targetEntityId.slice(0, 10) + (targetEntityId.length > 10 ? "…" : ""));
  const detail = parts.length > 0 ? parts.join(" • ") : "target yok";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <UsedNewsStateBadge level={level} />
      <span style={{ fontSize: "0.68rem", color: colors.neutral[500] }}>{detail}</span>
    </div>
  );
}
