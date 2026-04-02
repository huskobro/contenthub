import { UsedNewsArtifactConsistencyBadge } from "./UsedNewsArtifactConsistencyBadge";

export type UsedNewsArtifactConsistencyLevel =
  | "Artifacts yok"
  | "Tek taraflı"
  | "Tutarsız"
  | "Dengeli";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeUsedNewsArtifactConsistency(
  hasNewsItemSource: boolean | null | undefined,
  hasNewsItemScanReference: boolean | null | undefined,
  hasTargetResolved: boolean | null | undefined,
  targetModule: string | null | undefined,
  targetEntityId: string | null | undefined
): UsedNewsArtifactConsistencyLevel {
  const hasSource =
    hasNewsItemSource === true || hasNewsItemScanReference === true;

  const hasTarget =
    hasTargetResolved === true ||
    (isNonEmpty(targetModule) && isNonEmpty(targetEntityId));

  if (!hasSource && !hasTarget) return "Artifacts yok";
  if (hasSource && !hasTarget) return "Tek taraflı";
  if (!hasSource && hasTarget) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  hasNewsItemSource: boolean | null | undefined;
  hasNewsItemScanReference: boolean | null | undefined;
  hasTargetResolved: boolean | null | undefined;
  targetModule: string | null | undefined;
  targetEntityId: string | null | undefined;
}

export function UsedNewsArtifactConsistencySummary({
  hasNewsItemSource,
  hasNewsItemScanReference,
  hasTargetResolved,
  targetModule,
  targetEntityId,
}: Props) {
  const level = computeUsedNewsArtifactConsistency(
    hasNewsItemSource,
    hasNewsItemScanReference,
    hasTargetResolved,
    targetModule,
    targetEntityId
  );
  return <UsedNewsArtifactConsistencyBadge level={level} />;
}
