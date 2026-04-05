import { colors } from "../design-system/tokens";
import {
  SourceScanExecutionBadge,
  SourceScanExecutionLevel,
} from "./SourceScanExecutionBadge";

interface Props {
  status?: string | null;
  resultCount?: number | null;
  errorSummary?: string | null;
}

export function computeSourceScanExecution(
  status: string | null | undefined,
  resultCount: number | null | undefined,
): SourceScanExecutionLevel {
  if (!status) return "Belirsiz";
  if (status === "queued") return "Bekliyor";
  if (status === "failed") return "Hata aldı";
  if (status === "completed") {
    if (resultCount != null && resultCount > 0) return "Sonuç üretti";
    return "Tamamlandı";
  }
  return "Belirsiz";
}

export function SourceScanExecutionSummary({ status, resultCount, errorSummary }: Props) {
  const level = computeSourceScanExecution(status, resultCount);

  const parts: string[] = [];
  if (resultCount != null && !isNaN(resultCount) && isFinite(resultCount)) parts.push(`${resultCount} sonuç`);
  if (errorSummary) parts.push(errorSummary.slice(0, 30) + (errorSummary.length > 30 ? "…" : ""));
  const detail = parts.length > 0 ? parts.join(" • ") : "detay yok";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <SourceScanExecutionBadge level={level} />
      <span style={{ fontSize: "0.68rem", color: colors.neutral[500] }}>{detail}</span>
    </div>
  );
}
