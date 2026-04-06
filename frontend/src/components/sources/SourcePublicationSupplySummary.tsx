import { SourcePublicationSupplyBadge } from "./SourcePublicationSupplyBadge";
import type { SourcePublicationSupplyLevel } from "./SourcePublicationSupplyBadge";
export function computeSourcePublicationSupply(
  linkedNewsCount: number | null | undefined,
  reviewedNewsCount: number | null | undefined,
  usedNewsCountFromSource: number | null | undefined
): SourcePublicationSupplyLevel {
  if (linkedNewsCount == null) return "Bilinmiyor";
  if (linkedNewsCount <= 0) return "İçerik yok";
  const reviewed = reviewedNewsCount ?? 0;
  const used = usedNewsCountFromSource ?? 0;
  if (used > 0) return "Kullanılmış içerik var";
  if (reviewed > 0) return "Aday içerik var";
  return "Ham içerik";
}

interface Props {
  linkedNewsCount: number | null | undefined;
  reviewedNewsCount: number | null | undefined;
  usedNewsCountFromSource: number | null | undefined;
}

export function SourcePublicationSupplySummary({
  linkedNewsCount,
  reviewedNewsCount,
  usedNewsCountFromSource,
}: Props) {
  const level = computeSourcePublicationSupply(linkedNewsCount, reviewedNewsCount, usedNewsCountFromSource);
  const reviewed = reviewedNewsCount ?? 0;
  const used = usedNewsCountFromSource ?? 0;
  return (
    <div className="flex flex-col gap-[0.2rem]">
      <SourcePublicationSupplyBadge level={level} />
      {(reviewed > 0 || used > 0) && (
        <span className="text-xs text-neutral-500">
          {reviewed > 0 ? `${reviewed} reviewed` : ""}
          {reviewed > 0 && used > 0 ? " • " : ""}
          {used > 0 ? `${used} used` : ""}
        </span>
      )}
    </div>
  );
}
