import { SourceScanInputSpecificityBadge } from "./SourceScanInputSpecificityBadge";

type Level = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeSourceScanInputSpecificity(
  sourceId: string | null | undefined,
  scanMode: string | null | undefined,
  requestedBy: string | null | undefined,
  notes: string | null | undefined,
): Level {
  // No source → Genel giriş
  if (!isNonEmpty(sourceId)) return "Genel giriş";

  // source present but scan_mode or requested_by missing → Kısmi özgüllük
  const hasScanMode = isNonEmpty(scanMode);
  const hasRequestedBy = isNonEmpty(requestedBy);
  if (!hasScanMode || !hasRequestedBy) return "Kısmi özgüllük";

  // All three present — notes elevates to Belirgin giriş
  if (isNonEmpty(notes)) return "Belirgin giriş";

  return "Kısmi özgüllük";
}

interface Props {
  sourceId: string | null | undefined;
  scanMode: string | null | undefined;
  requestedBy: string | null | undefined;
  notes: string | null | undefined;
}

export function SourceScanInputSpecificitySummary({
  sourceId,
  scanMode,
  requestedBy,
  notes,
}: Props) {
  const level = computeSourceScanInputSpecificity(sourceId, scanMode, requestedBy, notes);
  return <SourceScanInputSpecificityBadge level={level} />;
}
