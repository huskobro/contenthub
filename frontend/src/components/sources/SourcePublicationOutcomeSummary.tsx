import { SourcePublicationOutcomeBadge } from "./SourcePublicationOutcomeBadge";

type Level = "Hazırlanıyor" | "Ham çıktı" | "Aday çıktı" | "Yayına yakın çıktı";

export function computeSourcePublicationOutcome(
  linkedNewsCount: number | null | undefined,
  reviewedNewsCount: number | null | undefined,
  usedNewsCountFromSource: number | null | undefined,
): Level {
  const linked = linkedNewsCount ?? 0;
  const reviewed = reviewedNewsCount ?? 0;
  const used = usedNewsCountFromSource ?? 0;

  if (used > 0) return "Yayına yakın çıktı";
  if (reviewed > 0) return "Aday çıktı";
  if (linked > 0) return "Ham çıktı";
  return "Hazırlanıyor";
}

interface Props {
  linkedNewsCount: number | null | undefined;
  reviewedNewsCount: number | null | undefined;
  usedNewsCountFromSource: number | null | undefined;
}

export function SourcePublicationOutcomeSummary({
  linkedNewsCount,
  reviewedNewsCount,
  usedNewsCountFromSource,
}: Props) {
  const level = computeSourcePublicationOutcome(
    linkedNewsCount,
    reviewedNewsCount,
    usedNewsCountFromSource,
  );
  return <SourcePublicationOutcomeBadge level={level} />;
}
