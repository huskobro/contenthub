import { UsedNewsSourceContextBadge } from "./UsedNewsSourceContextBadge";

type Level = "Scan kökenli" | "Kaynaklı" | "Kaynak yok" | "News item bulunamadı" | "Belirsiz";

export function computeUsedNewsSourceContext(
  newsItemId: string | null | undefined,
  hasNewsItemSource: boolean | null | undefined,
  hasNewsItemScanReference: boolean | null | undefined,
): Level {
  if (!newsItemId) return "News item bulunamadı";
  if (hasNewsItemScanReference) return "Scan kökenli";
  if (hasNewsItemSource) return "Kaynaklı";
  if (hasNewsItemSource === false && hasNewsItemScanReference === false) return "Kaynak yok";
  return "Belirsiz";
}

interface Props {
  newsItemId: string | null | undefined;
  hasNewsItemSource: boolean | null | undefined;
  hasNewsItemScanReference: boolean | null | undefined;
}

export function UsedNewsSourceContextSummary({ newsItemId, hasNewsItemSource, hasNewsItemScanReference }: Props) {
  const level = computeUsedNewsSourceContext(newsItemId, hasNewsItemSource, hasNewsItemScanReference);
  return <UsedNewsSourceContextBadge level={level} />;
}
