import { SourceScanResultRichnessBadge } from "./SourceScanResultRichnessBadge";
import type { SourceScanResultRichnessLevel } from "./SourceScanResultRichnessBadge";
import { colors, typography } from "../design-system/tokens";

function isNonEmpty(val: string | null | undefined): boolean {
  return typeof val === "string" && val.trim().length > 0;
}

export function computeSourceScanResultRichness(
  status: string | null | undefined,
  resultCount: number | null | undefined,
  errorSummary: string | null | undefined,
  rawResultPreviewJson: string | null | undefined
): SourceScanResultRichnessLevel {
  if (status === "failed" || isNonEmpty(errorSummary)) return "Sorunlu";

  const hasPreview = isNonEmpty(rawResultPreviewJson);
  const count = resultCount ?? null;

  if (count === null && !hasPreview) return "Belirsiz";
  if (count !== null && count <= 0 && !hasPreview) return "Boş çıktı";
  if ((count === null || count > 0) && hasPreview) return "Zengin çıktı";
  if (count !== null && count > 0 && !hasPreview) return "Çıktı var";

  return "Belirsiz";
}

interface Props {
  status: string | null | undefined;
  resultCount: number | null | undefined;
  errorSummary: string | null | undefined;
  rawResultPreviewJson: string | null | undefined;
}

export function SourceScanResultRichnessSummary({
  status,
  resultCount,
  errorSummary,
  rawResultPreviewJson,
}: Props) {
  const level = computeSourceScanResultRichness(status, resultCount, errorSummary, rawResultPreviewJson);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
      <SourceScanResultRichnessBadge level={level} />
      <span style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>
        {resultCount != null && !isNaN(resultCount) && isFinite(resultCount) ? `${resultCount} sonuç` : "sonuç bilinmiyor"}
      </span>
    </div>
  );
}
