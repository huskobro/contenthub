import { SourceScanTargetOutputConsistencyBadge } from "./SourceScanTargetOutputConsistencyBadge";

type ConsistencyLevel = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

function isNonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function computeSourceScanTargetOutputConsistency(
  sourceId: string | null | undefined,
  resultCount: number | null | undefined,
  linkedNewsCountFromScan: number | null | undefined,
  usedNewsCountFromScan: number | null | undefined
): ConsistencyLevel {
  const hasTarget = isNonEmpty(sourceId);
  const hasOutput =
    (typeof resultCount === "number" && resultCount > 0) ||
    (typeof linkedNewsCountFromScan === "number" && linkedNewsCountFromScan > 0) ||
    (typeof usedNewsCountFromScan === "number" && usedNewsCountFromScan > 0);

  if (!hasTarget && !hasOutput) return "Artifacts yok";
  if (hasTarget && !hasOutput) return "Tek taraflı";
  if (!hasTarget && hasOutput) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  sourceId: string | null | undefined;
  resultCount: number | null | undefined;
  linkedNewsCountFromScan: number | null | undefined;
  usedNewsCountFromScan: number | null | undefined;
}

export function SourceScanTargetOutputConsistencySummary({
  sourceId,
  resultCount,
  linkedNewsCountFromScan,
  usedNewsCountFromScan,
}: Props) {
  const level = computeSourceScanTargetOutputConsistency(
    sourceId,
    resultCount,
    linkedNewsCountFromScan,
    usedNewsCountFromScan
  );
  return <SourceScanTargetOutputConsistencyBadge level={level} />;
}
