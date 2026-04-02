export type NewsItemInputQualityLevel = "Zayıf giriş" | "Kısmi giriş" | "Güçlü giriş";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeNewsItemInputQuality(
  title: string | null | undefined,
  url: string | null | undefined,
  summary: string | null | undefined,
  sourceId: string | null | undefined,
  sourceScanId: string | null | undefined,
  language: string | null | undefined,
  category: string | null | undefined,
  publishedAt: string | null | undefined
): NewsItemInputQualityLevel {
  if (!isNonEmpty(title) || !isNonEmpty(url)) return "Zayıf giriş";
  if (!isNonEmpty(summary)) return "Kısmi giriş";

  const hasExtra =
    isNonEmpty(sourceId) ||
    isNonEmpty(sourceScanId) ||
    isNonEmpty(language) ||
    isNonEmpty(category) ||
    isNonEmpty(publishedAt);

  if (hasExtra) return "Güçlü giriş";
  return "Kısmi giriş";
}

interface Props {
  title: string | null | undefined;
  url: string | null | undefined;
  summary: string | null | undefined;
  sourceId: string | null | undefined;
  sourceScanId: string | null | undefined;
  language: string | null | undefined;
  category: string | null | undefined;
  publishedAt: string | null | undefined;
}

export function NewsItemInputQualitySummary({
  title,
  url,
  summary,
  sourceId,
  sourceScanId,
  language,
  category,
  publishedAt,
}: Props) {
  const level = computeNewsItemInputQuality(
    title, url, summary, sourceId, sourceScanId, language, category, publishedAt
  );
  return <NewsItemInputQualityBadge level={level} />;
}

import { NewsItemInputQualityBadge } from "./NewsItemInputQualityBadge";
