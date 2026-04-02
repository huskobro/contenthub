import { NewsItemUsedNewsLinkageBadge } from "./NewsItemUsedNewsLinkageBadge";

type Level = "Bağ yok" | "Bağlı" | "Yayın bağı var" | "Bilinmiyor";

export function computeNewsItemUsedNewsLinkage(
  usageCount: number | null | undefined,
  hasPublishedUsedNewsLink: boolean | null | undefined,
): Level {
  if (usageCount == null) return "Bilinmiyor";
  if (usageCount <= 0) return "Bağ yok";
  if (hasPublishedUsedNewsLink === true) return "Yayın bağı var";
  return "Bağlı";
}

interface Props {
  usageCount: number | null | undefined;
  hasPublishedUsedNewsLink: boolean | null | undefined;
}

export function NewsItemUsedNewsLinkageSummary({ usageCount, hasPublishedUsedNewsLink }: Props) {
  const level = computeNewsItemUsedNewsLinkage(usageCount, hasPublishedUsedNewsLink);
  return <NewsItemUsedNewsLinkageBadge level={level} />;
}
