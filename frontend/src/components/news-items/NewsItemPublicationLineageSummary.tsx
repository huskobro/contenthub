import { NewsItemPublicationLineageBadge } from "./NewsItemPublicationLineageBadge";

type Level = "Zincir yok" | "İçerik zincirinde" | "Yayın zincirinde" | "Kısmi zincir" | "Belirsiz";

export function computeNewsItemPublicationLineage(
  usageCount: number | null | undefined,
  hasPublishedUsedNewsLink: boolean | null | undefined,
): Level {
  if (usageCount == null) return "Belirsiz";
  if (usageCount <= 0) return "Zincir yok";
  if (hasPublishedUsedNewsLink === true) return "Yayın zincirinde";
  if (hasPublishedUsedNewsLink === false) return "İçerik zincirinde";
  // usageCount > 0 but hasPublishedUsedNewsLink is null/undefined → uncertain
  return "Kısmi zincir";
}

interface Props {
  usageCount: number | null | undefined;
  hasPublishedUsedNewsLink: boolean | null | undefined;
}

export function NewsItemPublicationLineageSummary({ usageCount, hasPublishedUsedNewsLink }: Props) {
  const level = computeNewsItemPublicationLineage(usageCount, hasPublishedUsedNewsLink);
  return <NewsItemPublicationLineageBadge level={level} />;
}
