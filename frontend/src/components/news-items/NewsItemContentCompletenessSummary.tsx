import { NewsItemContentCompletenessBadge, NewsItemCompletenessLevel } from "./NewsItemContentCompletenessBadge";

interface Props {
  title?: string | null;
  url?: string | null;
  summary?: string | null;
  language?: string | null;
  category?: string | null;
  publishedAt?: string | null;
}

function isNonEmpty(val: string | null | undefined): boolean {
  return typeof val === "string" && val.trim().length > 0;
}

export function computeNewsItemCompleteness(
  title: string | null | undefined,
  url: string | null | undefined,
  summary: string | null | undefined,
  language: string | null | undefined,
  category: string | null | undefined,
  publishedAt: string | null | undefined,
): NewsItemCompletenessLevel {
  if (!isNonEmpty(title) || !isNonEmpty(url)) return "Eksik";
  if (!isNonEmpty(summary)) return "Kısmi";
  const hasExtra = isNonEmpty(language) || isNonEmpty(category) || isNonEmpty(publishedAt);
  if (hasExtra) return "Dolu";
  return "Kısmi";
}

export function NewsItemContentCompletenessSummary({
  title,
  url,
  summary,
  language,
  category,
  publishedAt,
}: Props) {
  const level = computeNewsItemCompleteness(title, url, summary, language, category, publishedAt);

  const filled = [title, url, summary, language, category, publishedAt].filter(isNonEmpty).length;
  const detail = `${filled}/6 alan dolu`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <NewsItemContentCompletenessBadge level={level} />
      <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{detail}</span>
    </div>
  );
}
