import { SourceInputSpecificityBadge } from "./SourceInputSpecificityBadge";

type Level = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function getRequiredConfigField(
  sourceType: string | null | undefined,
  feedUrl: string | null | undefined,
  baseUrl: string | null | undefined,
  apiEndpoint: string | null | undefined,
): boolean {
  const t = (sourceType ?? "").toLowerCase().trim();
  if (t === "rss") return isNonEmpty(feedUrl);
  if (t === "manual_url") return isNonEmpty(baseUrl);
  if (t === "api") return isNonEmpty(apiEndpoint);
  // Unknown source_type: check any URL field
  return isNonEmpty(feedUrl) || isNonEmpty(baseUrl) || isNonEmpty(apiEndpoint);
}

export function computeSourceInputSpecificity(
  sourceType: string | null | undefined,
  name: string | null | undefined,
  baseUrl: string | null | undefined,
  feedUrl: string | null | undefined,
  apiEndpoint: string | null | undefined,
  language: string | null | undefined,
): Level {
  const hasConfig = getRequiredConfigField(sourceType, feedUrl, baseUrl, apiEndpoint);

  // No required config field → Genel giriş
  if (!hasConfig) return "Genel giriş";

  const hasName = isNonEmpty(name);
  const hasLanguage = isNonEmpty(language);

  // config + name + language → Belirgin giriş
  if (hasName && hasLanguage) return "Belirgin giriş";

  // config but missing name or language → Kısmi özgüllük
  return "Kısmi özgüllük";
}

interface Props {
  sourceType: string | null | undefined;
  name: string | null | undefined;
  baseUrl: string | null | undefined;
  feedUrl: string | null | undefined;
  apiEndpoint: string | null | undefined;
  language: string | null | undefined;
}

export function SourceInputSpecificitySummary({
  sourceType,
  name,
  baseUrl,
  feedUrl,
  apiEndpoint,
  language,
}: Props) {
  const level = computeSourceInputSpecificity(sourceType, name, baseUrl, feedUrl, apiEndpoint, language);
  return <SourceInputSpecificityBadge level={level} />;
}
