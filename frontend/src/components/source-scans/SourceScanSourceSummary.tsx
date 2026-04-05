import { colors } from "../design-system/tokens";
import { SourceScanSourceStatusBadge, SourceScanSourceStatus } from "./SourceScanSourceStatusBadge";

interface Props {
  sourceId?: string | null;
  sourceName?: string | null;
  sourceStatus?: string | null;
}

export function computeSourceScanSourceStatus(
  sourceId: string | null | undefined,
  sourceName: string | null | undefined,
): SourceScanSourceStatus {
  if (!sourceId) return "Kaynak yok";
  if (sourceName) return "Bağlı";
  return "Kaynak bulunamadı";
}

export function SourceScanSourceSummary({ sourceId, sourceName, sourceStatus }: Props) {
  const status = computeSourceScanSourceStatus(sourceId, sourceName);

  const detail = sourceName
    ? sourceName + (sourceStatus ? ` • ${sourceStatus}` : "")
    : sourceId
    ? sourceId.slice(0, 10) + "…"
    : "kaynak yok";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <SourceScanSourceStatusBadge status={status} />
      <span style={{ fontSize: "0.68rem", color: colors.neutral[500] }}>{detail}</span>
    </div>
  );
}
