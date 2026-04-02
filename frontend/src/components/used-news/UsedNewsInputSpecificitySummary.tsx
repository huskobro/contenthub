import { UsedNewsInputSpecificityBadge } from "./UsedNewsInputSpecificityBadge";

type Level = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeUsedNewsInputSpecificity(
  newsItemId: string | null | undefined,
  usageType: string | null | undefined,
  targetModule: string | null | undefined,
  targetEntityId: string | null | undefined,
  usageContext: string | null | undefined,
  notes: string | null | undefined,
): Level {
  // Missing news_item_id or usage_type → Genel giriş
  if (!isNonEmpty(newsItemId) || !isNonEmpty(usageType)) return "Genel giriş";

  // Both present but target incomplete → Kısmi özgüllük
  const hasTarget = isNonEmpty(targetModule) && isNonEmpty(targetEntityId);
  if (!hasTarget) return "Kısmi özgüllük";

  // All four present — check for helper context
  const hasHelper = isNonEmpty(usageContext) || isNonEmpty(notes);
  if (hasHelper) return "Belirgin giriş";

  return "Kısmi özgüllük";
}

interface Props {
  newsItemId: string | null | undefined;
  usageType: string | null | undefined;
  targetModule: string | null | undefined;
  targetEntityId: string | null | undefined;
  usageContext: string | null | undefined;
  notes: string | null | undefined;
}

export function UsedNewsInputSpecificitySummary({
  newsItemId,
  usageType,
  targetModule,
  targetEntityId,
  usageContext,
  notes,
}: Props) {
  const level = computeUsedNewsInputSpecificity(
    newsItemId,
    usageType,
    targetModule,
    targetEntityId,
    usageContext,
    notes,
  );
  return <UsedNewsInputSpecificityBadge level={level} />;
}
