import { SourceTargetOutputConsistencyBadge } from "./SourceTargetOutputConsistencyBadge";

type Level = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

function isNonEmpty(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return value.trim().length > 0;
}

function getConfigField(
  sourceType: string | null | undefined,
  feedUrl: string | null | undefined,
  baseUrl: string | null | undefined,
  apiEndpoint: string | null | undefined,
): boolean {
  if (sourceType === "rss") return isNonEmpty(feedUrl);
  if (sourceType === "manual_url") return isNonEmpty(baseUrl);
  if (sourceType === "api") return isNonEmpty(apiEndpoint);
  // unknown type — no config considered
  return false;
}

export function computeSourceTargetOutputConsistency(
  sourceType: string | null | undefined,
  feedUrl: string | null | undefined,
  baseUrl: string | null | undefined,
  apiEndpoint: string | null | undefined,
  linkedNewsCount: number | null | undefined,
  reviewedNewsCount: number | null | undefined,
  usedNewsCountFromSource: number | null | undefined,
): Level {
  const hasConfig = getConfigField(sourceType, feedUrl, baseUrl, apiEndpoint);
  const hasOutput =
    (linkedNewsCount ?? 0) > 0 ||
    (reviewedNewsCount ?? 0) > 0 ||
    (usedNewsCountFromSource ?? 0) > 0;

  if (!hasConfig && !hasOutput) return "Artifacts yok";
  if (hasConfig && !hasOutput) return "Tek taraflı";
  if (!hasConfig && hasOutput) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  sourceType: string | null | undefined;
  feedUrl: string | null | undefined;
  baseUrl: string | null | undefined;
  apiEndpoint: string | null | undefined;
  linkedNewsCount: number | null | undefined;
  reviewedNewsCount: number | null | undefined;
  usedNewsCountFromSource: number | null | undefined;
}

export function SourceTargetOutputConsistencySummary({
  sourceType,
  feedUrl,
  baseUrl,
  apiEndpoint,
  linkedNewsCount,
  reviewedNewsCount,
  usedNewsCountFromSource,
}: Props) {
  const level = computeSourceTargetOutputConsistency(
    sourceType,
    feedUrl,
    baseUrl,
    apiEndpoint,
    linkedNewsCount,
    reviewedNewsCount,
    usedNewsCountFromSource,
  );
  return <SourceTargetOutputConsistencyBadge level={level} />;
}
