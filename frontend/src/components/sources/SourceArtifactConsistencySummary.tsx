import { SourceArtifactConsistencyBadge, type ArtifactConsistencyLevel } from "./SourceArtifactConsistencyBadge";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function hasConfig(
  sourceType: string | null | undefined,
  baseUrl: string | null | undefined,
  feedUrl: string | null | undefined,
  apiEndpoint: string | null | undefined,
): boolean {
  if (!sourceType) {
    return isNonEmpty(baseUrl) || isNonEmpty(feedUrl) || isNonEmpty(apiEndpoint);
  }
  const t = sourceType.toLowerCase();
  if (t === "rss") return isNonEmpty(feedUrl);
  if (t === "manual_url") return isNonEmpty(baseUrl);
  if (t === "api") return isNonEmpty(apiEndpoint);
  // Other/unknown: any non-empty endpoint counts
  return isNonEmpty(baseUrl) || isNonEmpty(feedUrl) || isNonEmpty(apiEndpoint);
}

export function computeSourceArtifactConsistency(
  sourceType: string | null | undefined,
  baseUrl: string | null | undefined,
  feedUrl: string | null | undefined,
  apiEndpoint: string | null | undefined,
  linkedNewsCount: number | null | undefined,
): ArtifactConsistencyLevel {
  const configOk = hasConfig(sourceType, baseUrl, feedUrl, apiEndpoint);
  const hasOutput = typeof linkedNewsCount === "number" && linkedNewsCount > 0;

  if (!configOk && !hasOutput) return "Artifacts yok";
  if (configOk && !hasOutput) return "Tek taraflı";
  if (!configOk && hasOutput) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  sourceType: string | null | undefined;
  baseUrl: string | null | undefined;
  feedUrl: string | null | undefined;
  apiEndpoint: string | null | undefined;
  linkedNewsCount: number | null | undefined;
}

export function SourceArtifactConsistencySummary({
  sourceType,
  baseUrl,
  feedUrl,
  apiEndpoint,
  linkedNewsCount,
}: Props) {
  const level = computeSourceArtifactConsistency(sourceType, baseUrl, feedUrl, apiEndpoint, linkedNewsCount);
  return <SourceArtifactConsistencyBadge level={level} />;
}
