import { NewsItemScanLineageBadge, NewsItemScanLineageLevel } from "./NewsItemScanLineageBadge";

interface Props {
  sourceScanId?: string | null;
  sourceScanStatus?: string | null;
}

export function computeNewsItemScanLineage(
  sourceScanId: string | null | undefined,
  sourceScanStatus: string | null | undefined,
): NewsItemScanLineageLevel {
  if (!sourceScanId) return "Manuel";
  if (sourceScanStatus === "not_found") return "Scan bulunamadı";
  if (sourceScanStatus) return "Scan bağlı";
  return "Scan referansı";
}

export function NewsItemScanLineageSummary({ sourceScanId, sourceScanStatus }: Props) {
  const level = computeNewsItemScanLineage(sourceScanId, sourceScanStatus);

  const detail = sourceScanId
    ? `scan: ${sourceScanId.slice(0, 8)}…`
    : "doğrudan kayıt";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <NewsItemScanLineageBadge level={level} />
      <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{detail}</span>
    </div>
  );
}
