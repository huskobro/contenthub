import { UsedNewsTargetResolutionBadge } from "./UsedNewsTargetResolutionBadge";

type Level = "Hedef bağlı" | "Hedef eksik" | "Hedef bulunamadı" | "Belirsiz";

function isNonEmpty(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function computeUsedNewsTargetResolution(
  targetModule: string | null | undefined,
  targetEntityId: string | null | undefined,
  hasTargetResolved: boolean | null | undefined,
): Level {
  if (!isNonEmpty(targetModule)) return "Belirsiz";
  if (!isNonEmpty(targetEntityId)) return "Hedef eksik";
  if (hasTargetResolved === true) return "Hedef bağlı";
  if (hasTargetResolved === false) return "Hedef bulunamadı";
  return "Belirsiz";
}

interface Props {
  targetModule: string | null | undefined;
  targetEntityId: string | null | undefined;
  hasTargetResolved: boolean | null | undefined;
}

export function UsedNewsTargetResolutionSummary({ targetModule, targetEntityId, hasTargetResolved }: Props) {
  const level = computeUsedNewsTargetResolution(targetModule, targetEntityId, hasTargetResolved);
  return <UsedNewsTargetResolutionBadge level={level} />;
}
