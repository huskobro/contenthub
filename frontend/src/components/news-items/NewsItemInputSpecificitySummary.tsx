import { NewsItemInputSpecificityBadge } from "./NewsItemInputSpecificityBadge";

type Level = "Genel giriş" | "Kısmi özgüllük" | "Belirgin giriş";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeNewsItemInputSpecificity(
  title: string | null | undefined,
  url: string | null | undefined,
  summary: string | null | undefined,
  sourceId: string | null | undefined,
  sourceScanId: string | null | undefined,
  language: string | null | undefined,
  category: string | null | undefined,
  publishedAt: string | null | undefined,
): Level {
  const hasTitle = isNonEmpty(title);
  const hasUrl = isNonEmpty(url);

  // Neither title nor url → Genel giriş
  if (!hasTitle && !hasUrl) return "Genel giriş";

  const hasSummary = isNonEmpty(summary);
  const hasSourceRef = isNonEmpty(sourceId) || isNonEmpty(sourceScanId);

  // title/url + summary + source/scan refs → Belirgin giriş
  if (hasSummary && hasSourceRef) return "Belirgin giriş";

  // otherwise → Kısmi özgüllük
  return "Kısmi özgüllük";
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

export function NewsItemInputSpecificitySummary({
  title,
  url,
  summary,
  sourceId,
  sourceScanId,
  language,
  category,
  publishedAt,
}: Props) {
  const level = computeNewsItemInputSpecificity(
    title,
    url,
    summary,
    sourceId,
    sourceScanId,
    language,
    category,
    publishedAt,
  );
  return <NewsItemInputSpecificityBadge level={level} />;
}
