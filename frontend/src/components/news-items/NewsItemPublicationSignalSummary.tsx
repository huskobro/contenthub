import { NewsItemPublicationSignalBadge } from "./NewsItemPublicationSignalBadge";
import type { NewsItemPublicationSignalLevel } from "./NewsItemPublicationSignalBadge";

function isNonEmpty(val: string | null | undefined): boolean {
  return typeof val === "string" && val.trim().length > 0;
}

export function computeNewsItemPublicationSignal(
  status: string | null | undefined,
  usedNewsCount: number | null | undefined,
  title: string | null | undefined,
  summary: string | null | undefined,
  url: string | null | undefined
): NewsItemPublicationSignalLevel {
  if (status === "ignored") return "Hariç";
  if (status === "used" || (usedNewsCount != null && usedNewsCount > 0)) return "Kullanıldı";

  const hasBase = isNonEmpty(title) && isNonEmpty(url);
  const hasFull = hasBase && isNonEmpty(summary);

  if (status === "reviewed" && hasFull) return "Yayına yakın";
  if (hasBase) return "Aday";
  return "Zayıf";
}

interface Props {
  status: string | null | undefined;
  usedNewsCount: number | null | undefined;
  title: string | null | undefined;
  summary: string | null | undefined;
  url: string | null | undefined;
}

export function NewsItemPublicationSignalSummary({
  status,
  usedNewsCount,
  title,
  summary,
  url,
}: Props) {
  const level = computeNewsItemPublicationSignal(status, usedNewsCount, title, summary, url);
  return (
    <NewsItemPublicationSignalBadge level={level} />
  );
}
