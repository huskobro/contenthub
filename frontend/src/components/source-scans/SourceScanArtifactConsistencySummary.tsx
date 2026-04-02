import { SourceScanArtifactConsistencyBadge, type ArtifactConsistencyLevel } from "./SourceScanArtifactConsistencyBadge";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeSourceScanArtifactConsistency(
  sourceId: string | null | undefined,
  linkedNewsCountFromScan: number | null | undefined,
): ArtifactConsistencyLevel {
  const hasSource = isNonEmpty(sourceId);
  const hasOutput = typeof linkedNewsCountFromScan === "number" && linkedNewsCountFromScan > 0;

  if (!hasSource && !hasOutput) return "Artifacts yok";
  if (hasSource && !hasOutput) return "Tek taraflı";
  if (!hasSource && hasOutput) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  sourceId: string | null | undefined;
  linkedNewsCountFromScan: number | null | undefined;
}

export function SourceScanArtifactConsistencySummary({ sourceId, linkedNewsCountFromScan }: Props) {
  const level = computeSourceScanArtifactConsistency(sourceId, linkedNewsCountFromScan);
  return <SourceScanArtifactConsistencyBadge level={level} />;
}
