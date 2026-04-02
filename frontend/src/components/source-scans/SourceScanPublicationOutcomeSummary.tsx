import { SourceScanPublicationOutcomeBadge } from "./SourceScanPublicationOutcomeBadge";

type OutcomeLevel =
  | "Sorunlu"
  | "Hazırlanıyor"
  | "Ham çıktı"
  | "Aday çıktı"
  | "Yayına yakın çıktı"
  | "Belirsiz";

const ACTIVE_STATUSES = new Set(["queued", "running", "processing", "in_progress"]);

function isNonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function toNum(value: number | null | undefined): number {
  return typeof value === "number" ? value : 0;
}

export function computeSourceScanPublicationOutcome(
  status: string | null | undefined,
  resultCount: number | null | undefined,
  linkedNewsCountFromScan: number | null | undefined,
  reviewedNewsCountFromScan: number | null | undefined,
  usedNewsCountFromScan: number | null | undefined,
  errorSummary: string | null | undefined
): OutcomeLevel {
  const statusNorm = (status ?? "").toLowerCase().trim();
  const linked = toNum(linkedNewsCountFromScan);
  const reviewed = toNum(reviewedNewsCountFromScan);
  const used = toNum(usedNewsCountFromScan);
  const results = toNum(resultCount);

  // 1. Error wins
  if (statusNorm === "failed" || isNonEmpty(errorSummary)) {
    return "Sorunlu";
  }

  // 2. Used news → Yayına yakın çıktı
  if (used > 0) return "Yayına yakın çıktı";

  // 3. Reviewed but not used → Aday çıktı
  if (reviewed > 0) return "Aday çıktı";

  // 4. Linked (or result_count) but no reviewed/used → Ham çıktı
  if (linked > 0 || results > 0) return "Ham çıktı";

  // 5. Active status with no output → Hazırlanıyor
  if (ACTIVE_STATUSES.has(statusNorm)) return "Hazırlanıyor";

  // 6. Fallback
  return "Belirsiz";
}

interface Props {
  status: string | null | undefined;
  resultCount: number | null | undefined;
  linkedNewsCountFromScan: number | null | undefined;
  reviewedNewsCountFromScan: number | null | undefined;
  usedNewsCountFromScan: number | null | undefined;
  errorSummary: string | null | undefined;
}

export function SourceScanPublicationOutcomeSummary({
  status,
  resultCount,
  linkedNewsCountFromScan,
  reviewedNewsCountFromScan,
  usedNewsCountFromScan,
  errorSummary,
}: Props) {
  const level = computeSourceScanPublicationOutcome(
    status,
    resultCount,
    linkedNewsCountFromScan,
    reviewedNewsCountFromScan,
    usedNewsCountFromScan,
    errorSummary
  );
  return <SourceScanPublicationOutcomeBadge level={level} />;
}
