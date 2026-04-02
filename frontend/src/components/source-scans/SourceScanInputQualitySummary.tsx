export type SourceScanInputQualityLevel = "Zayıf giriş" | "Kısmi giriş" | "Güçlü giriş";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeSourceScanInputQuality(
  sourceId: string | null | undefined,
  scanMode: string | null | undefined,
  requestedBy: string | null | undefined
): SourceScanInputQualityLevel {
  if (!isNonEmpty(sourceId)) return "Zayıf giriş";
  if (isNonEmpty(scanMode) && isNonEmpty(requestedBy)) return "Güçlü giriş";
  return "Kısmi giriş";
}

interface Props {
  sourceId: string | null | undefined;
  scanMode: string | null | undefined;
  requestedBy: string | null | undefined;
}

export function SourceScanInputQualitySummary({ sourceId, scanMode, requestedBy }: Props) {
  const level = computeSourceScanInputQuality(sourceId, scanMode, requestedBy);
  return <SourceScanInputQualityBadge level={level} />;
}

import { SourceScanInputQualityBadge } from "./SourceScanInputQualityBadge";
