import { NewsBulletinSelectedNewsQualityBadge, type QualityLevel } from "./NewsBulletinSelectedNewsQualityBadge";
import { safeNumber } from "../../lib/safeNumber";

export function computeNewsBulletinSelectedNewsQuality(
  selectedNewsCount: number | null | undefined,
  completeCount: number | null | undefined,
  partialCount: number | null | undefined,
  weakCount: number | null | undefined,
): QualityLevel {
  if (selectedNewsCount == null) return "Bilinmiyor";
  if (selectedNewsCount <= 0) return "İçerik yok";

  const complete = completeCount ?? 0;
  const partial = partialCount ?? 0;
  const weak = weakCount ?? 0;
  const total = complete + partial + weak;

  if (total === 0) return "Bilinmiyor";

  // Dominant classification: whichever category has the most items wins
  if (complete >= partial && complete >= weak) return "Güçlü set";
  if (weak >= complete && weak >= partial) return "Zayıf set";
  return "Kısmi set";
}

function buildDetail(
  completeCount: number | null | undefined,
  partialCount: number | null | undefined,
  weakCount: number | null | undefined,
  selectedNewsCount: number | null | undefined,
): string | undefined {
  if (!selectedNewsCount || selectedNewsCount <= 0) return undefined;
  const complete = safeNumber(completeCount, 0);
  const partial = safeNumber(partialCount, 0);
  const weak = safeNumber(weakCount, 0);
  const parts: string[] = [];
  if (complete > 0) parts.push(`${complete} güçlü`);
  if (partial > 0) parts.push(`${partial} kısmi`);
  if (weak > 0) parts.push(`${weak} zayıf`);
  return parts.length > 0 ? parts.join(" • ") : undefined;
}

interface Props {
  selectedNewsCount: number | null | undefined;
  selectedNewsQualityCompleteCount: number | null | undefined;
  selectedNewsQualityPartialCount: number | null | undefined;
  selectedNewsQualityWeakCount: number | null | undefined;
}

export function NewsBulletinSelectedNewsQualitySummary({
  selectedNewsCount,
  selectedNewsQualityCompleteCount,
  selectedNewsQualityPartialCount,
  selectedNewsQualityWeakCount,
}: Props) {
  const level = computeNewsBulletinSelectedNewsQuality(
    selectedNewsCount,
    selectedNewsQualityCompleteCount,
    selectedNewsQualityPartialCount,
    selectedNewsQualityWeakCount,
  );
  const detail = buildDetail(
    selectedNewsQualityCompleteCount,
    selectedNewsQualityPartialCount,
    selectedNewsQualityWeakCount,
    selectedNewsCount,
  );
  return <NewsBulletinSelectedNewsQualityBadge level={level} detail={detail} />;
}
