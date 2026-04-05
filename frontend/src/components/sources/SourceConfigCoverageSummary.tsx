import { colors } from "../design-system/tokens";
import { SourceConfigCoverageBadge, SourceConfigCoverageLevel } from "./SourceConfigCoverageBadge";

interface Props {
  sourceType?: string | null;
  baseUrl?: string | null;
  feedUrl?: string | null;
  apiEndpoint?: string | null;
}

function isNonEmpty(val: string | null | undefined): boolean {
  return typeof val === "string" && val.trim().length > 0;
}

export function computeSourceConfigCoverage(
  sourceType: string | null | undefined,
  baseUrl: string | null | undefined,
  feedUrl: string | null | undefined,
  apiEndpoint: string | null | undefined,
): SourceConfigCoverageLevel {
  if (!sourceType || !sourceType.trim()) return "Tür belirsiz";
  const t = sourceType.trim().toLowerCase();
  if (t === "rss") return isNonEmpty(feedUrl) ? "Feed tanımlı" : "Feed eksik";
  if (t === "manual_url") return isNonEmpty(baseUrl) ? "URL tanımlı" : "URL eksik";
  if (t === "api") return isNonEmpty(apiEndpoint) ? "API tanımlı" : "API eksik";
  return "Tür belirsiz";
}

export function SourceConfigCoverageSummary({ sourceType, baseUrl, feedUrl, apiEndpoint }: Props) {
  const level = computeSourceConfigCoverage(sourceType, baseUrl, feedUrl, apiEndpoint);

  const detail = sourceType ? sourceType : "tür yok";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <SourceConfigCoverageBadge level={level} />
      <span style={{ fontSize: "0.68rem", color: colors.neutral[500] }}>{detail}</span>
    </div>
  );
}
