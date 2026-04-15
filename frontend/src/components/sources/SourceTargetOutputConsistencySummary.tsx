import { SourceTargetOutputConsistencyBadge } from "./SourceTargetOutputConsistencyBadge";

type Level = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

function isNonEmpty(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return value.trim().length > 0;
}

/**
 * Gate Sources Closure sonrasi: yalnizca 'rss' tipi gecerlidir. Legacy
 * 'manual_url' ve 'api' tipleri backend tarafinda 422 ile reddedilir;
 * burada bu eski tipler gecerse konservatif olarak config yok kabul edilir.
 */
function getConfigField(
  sourceType: string | null | undefined,
  feedUrl: string | null | undefined,
  baseUrl: string | null | undefined,
  apiEndpoint: string | null | undefined,
): boolean {
  if (sourceType === "rss") return isNonEmpty(feedUrl);
  // Legacy shells — gerekirse base_url/api_endpoint'i hala tanimis olabilir
  // ama source_type bozuk kabul edilir.
  if (sourceType === "manual_url") return isNonEmpty(baseUrl);
  if (sourceType === "api") return isNonEmpty(apiEndpoint);
  return false;
}

/**
 * @deprecated ``reviewedNewsCount`` parametresi Gate Sources Closure ile
 * anlamini yitirdi — news_items.status artik 'reviewed' degerini almiyor.
 * Sifir gecirmek guvenlidir. Gelistirme dongusunden geriye uyumluluk icin
 * imza tutuldu; bir sonraki minor surumde kaldirilabilir.
 */
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
  /** @deprecated news_items.status 'reviewed' kaldirildi. */
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
