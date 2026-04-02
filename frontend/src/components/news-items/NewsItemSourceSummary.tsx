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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <NewsItemSourceStatusBadge status={status} />
      <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{detail}</span>
    </div>
  );
}
