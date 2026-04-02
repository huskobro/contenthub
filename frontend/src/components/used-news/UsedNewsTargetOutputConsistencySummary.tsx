import { UsedNewsTargetOutputConsistencyBadge } from "./UsedNewsTargetOutputConsistencyBadge";

type Level = "Artifacts yok" | "Tek taraflı" | "Tutarsız" | "Dengeli";

function isNonEmpty(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return value.trim().length > 0;
}

export function computeUsedNewsTargetOutputConsistency(
  newsItemId: string | null | undefined,
  usageType: string | null | undefined,
  usageContext: string | null | undefined,
  notes: string | null | undefined,
  hasTargetResolved: boolean | null | undefined,
  targetModule: string | null | undefined,
  targetEntityId: string | null | undefined,
): Level {
  const hasInput =
    isNonEmpty(newsItemId) ||
    isNonEmpty(usageType) ||
    isNonEmpty(usageContext) ||
    isNonEmpty(notes);

  const hasOutput =
    hasTargetResolved === true ||
    (isNonEmpty(targetModule) && isNonEmpty(targetEntityId));

  if (!hasInput && !hasOutput) return "Artifacts yok";
  if (hasInput && !hasOutput) return "Tek taraflı";
  if (!hasInput && hasOutput) return "Tutarsız";
  return "Dengeli";
}

interface Props {
  newsItemId: string | null | undefined;
  usageType: string | null | undefined;
  usageContext: string | null | undefined;
  notes: string | null | undefined;
  hasTargetResolved: boolean | null | undefined;
  targetModule: string | null | undefined;
  targetEntityId: string | null | undefined;
}

export function UsedNewsTargetOutputConsistencySummary({
  newsItemId,
  usageType,
  usageContext,
  notes,
  hasTargetResolved,
  targetModule,
  targetEntityId,
}: Props) {
  const level = computeUsedNewsTargetOutputConsistency(
    newsItemId,
    usageType,
    usageContext,
    notes,
    hasTargetResolved,
    targetModule,
    targetEntityId,
  );
  return <UsedNewsTargetOutputConsistencyBadge level={level} />;
}
