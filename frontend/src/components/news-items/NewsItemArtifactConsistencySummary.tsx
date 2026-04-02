export type NewsItemArtifactConsistencyLevel =
  | "Artifacts yok"
  | "Tek taraflı"
  | "Tutarsız"
  | "Dengeli";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeNewsItemArtifactConsistency(
  sourceId: string | null | undefined,
  sourceScanId: string | null | undefined,
  usageCount: number | null | undefined,
  hasPublishedUsedNewsLink: boolean | null | undefined
): NewsItemArtifactConsistencyLevel {
  const hasSource = isNonEmpty(sourceId) || isNonEmpty(sourceScanId);
  const hasPublication =
    (typeof usageCount === "number" && usageCount > 0) ||
    hasPublishedUsedNewsLink === true;

  if (!hasSource && !hasPublication) return "Artifacts yok";
  if (hasSource && !hasPublication) return "Tek taraflı";
  if (!hasSource && hasPublication) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  sourceId: string | null | undefined;
  sourceScanId: string | null | undefined;
  usageCount: number | null | undefined;
  hasPublishedUsedNewsLink: boolean | null | undefined;
}

export function NewsItemArtifactConsistencySummary({
  sourceId,
  sourceScanId,
  usageCount,
  hasPublishedUsedNewsLink,
}: Props) {
  const level = computeNewsItemArtifactConsistency(
    sourceId,
    sourceScanId,
    usageCount,
    hasPublishedUsedNewsLink
  );
  return <NewsItemArtifactConsistencyBadge level={level} />;
}

import { NewsItemArtifactConsistencyBadge } from "./NewsItemArtifactConsistencyBadge";
