import { SourceScanPublicationYieldBadge } from "./SourceScanPublicationYieldBadge";

type Level = "İçerik yok" | "Ham çıktı" | "Aday çıktı" | "Kullanılmış çıktı" | "Bilinmiyor";

export function computeSourceScanPublicationYield(
  linkedCount: number | null | undefined,
  reviewedCount: number | null | undefined,
  usedCount: number | null | undefined,
): Level {
  if (linkedCount == null) return "Bilinmiyor";
  if (linkedCount <= 0) return "İçerik yok";
  const used = usedCount ?? 0;
  const reviewed = reviewedCount ?? 0;
  if (used > 0) return "Kullanılmış çıktı";
  if (reviewed > 0) return "Aday çıktı";
  return "Ham çıktı";
}

interface Props {
  linkedCount: number | null | undefined;
  reviewedCount: number | null | undefined;
  usedCount: number | null | undefined;
}

export function SourceScanPublicationYieldSummary({ linkedCount, reviewedCount, usedCount }: Props) {
  const level = computeSourceScanPublicationYield(linkedCount, reviewedCount, usedCount);
  return <SourceScanPublicationYieldBadge level={level} />;
}
