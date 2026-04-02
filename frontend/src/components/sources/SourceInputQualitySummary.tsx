import { SourceInputQualityBadge } from "./SourceInputQualityBadge";

export type SourceInputQualityLevel = "Zayıf giriş" | "Kısmi giriş" | "Güçlü giriş";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function getRequiredConfigField(
  sourceType: string | null | undefined,
  baseUrl: string | null | undefined,
  feedUrl: string | null | undefined,
  apiEndpoint: string | null | undefined
): string | null | undefined {
  const t = (sourceType ?? "").toLowerCase();
  if (t === "rss") return feedUrl;
  if (t === "manual_url") return baseUrl;
  if (t === "api") return apiEndpoint;
  // Unknown type: use first non-empty
  return feedUrl || baseUrl || apiEndpoint;
}

export function computeSourceInputQuality(
  sourceType: string | null | undefined,
  name: string | null | undefined,
  baseUrl: string | null | undefined,
  feedUrl: string | null | undefined,
  apiEndpoint: string | null | undefined,
  language: string | null | undefined
): SourceInputQualityLevel {
  const requiredConfig = getRequiredConfigField(sourceType, baseUrl, feedUrl, apiEndpoint);
  const hasConfig = isNonEmpty(requiredConfig);

  if (!hasConfig) return "Zayıf giriş";

  const hasName = isNonEmpty(name);
  const hasLanguage = isNonEmpty(language);

  if (hasName && hasLanguage) return "Güçlü giriş";
  return "Kısmi giriş";
}

interface Props {
  sourceType: string | null | undefined;
  name: string | null | undefined;
  baseUrl: string | null | undefined;
  feedUrl: string | null | undefined;
  apiEndpoint: string | null | undefined;
  language: string | null | undefined;
}

export function SourceInputQualitySummary({
  sourceType,
  name,
  baseUrl,
  feedUrl,
  apiEndpoint,
  language,
}: Props) {
  const level = computeSourceInputQuality(sourceType, name, baseUrl, feedUrl, apiEndpoint, language);
  return <SourceInputQualityBadge level={level} />;
}
