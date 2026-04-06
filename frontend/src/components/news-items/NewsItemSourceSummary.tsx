import { NewsItemSourceStatusBadge, NewsItemSourceStatus } from "./NewsItemSourceStatusBadge";

interface Props {
  sourceId?: string | null;
  sourceName?: string | null;
  sourceStatus?: string | null;
}

export function computeNewsItemSourceStatus(
  sourceId: string | null | undefined,
  sourceName: string | null | undefined,
): NewsItemSourceStatus {
  if (!sourceId) return "Kaynak yok";
  if (sourceName) return "Bağlı";
  return "Bulunamadı";
}

export function NewsItemSourceSummary({ sourceId, sourceName, sourceStatus }: Props) {
  const status = computeNewsItemSourceStatus(sourceId, sourceName);

  const detail = sourceName
    ? sourceName + (sourceStatus ? ` • ${sourceStatus}` : "")
    : sourceId
    ? sourceId.slice(0, 10) + "…"
    : "kaynak yok";

  return (
    <div className="flex flex-col gap-[0.15rem]">
      <NewsItemSourceStatusBadge status={status} />
      <span className="text-[0.68rem] text-neutral-500">{detail}</span>
    </div>
  );
}
