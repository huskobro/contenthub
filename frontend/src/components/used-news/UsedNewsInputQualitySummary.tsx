import { UsedNewsInputQualityBadge } from "./UsedNewsInputQualityBadge";

type InputQualityLevel = "Zayıf giriş" | "Kısmi giriş" | "Güçlü giriş";

function isNonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function computeUsedNewsInputQuality(
  newsItemId: string | null | undefined,
  usageType: string | null | undefined,
  targetModule: string | null | undefined,
  targetEntityId: string | null | undefined,
  usageContext: string | null | undefined,
  notes: string | null | undefined
): InputQualityLevel {
  // Step 1: news_item_id or usage_type missing → Zayıf giriş
  if (!isNonEmpty(newsItemId) || !isNonEmpty(usageType)) {
    return "Zayıf giriş";
  }

  // Step 2: both present but target info missing → Kısmi giriş
  const hasTarget = isNonEmpty(targetModule) && isNonEmpty(targetEntityId);
  if (!hasTarget) {
    return "Kısmi giriş";
  }

  // Step 3: base + target + at least one helper field → Güçlü giriş
  const hasHelper = isNonEmpty(usageContext) || isNonEmpty(notes);
  if (hasHelper) {
    return "Güçlü giriş";
  }

  return "Kısmi giriş";
}

interface Props {
  newsItemId: string | null | undefined;
  usageType: string | null | undefined;
  targetModule: string | null | undefined;
  targetEntityId: string | null | undefined;
  usageContext: string | null | undefined;
  notes: string | null | undefined;
}

export function UsedNewsInputQualitySummary({
  newsItemId,
  usageType,
  targetModule,
  targetEntityId,
  usageContext,
  notes,
}: Props) {
  const level = computeUsedNewsInputQuality(
    newsItemId,
    usageType,
    targetModule,
    targetEntityId,
    usageContext,
    notes
  );
  return <UsedNewsInputQualityBadge level={level} />;
}
